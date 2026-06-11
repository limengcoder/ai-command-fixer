const DEFAULT_PREFIXES = [
  "cd",
  "pwd",
  "ls",
  "export",
  "source",
  "python",
  "python3",
  "pip",
  "pip3",
  "uv",
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "node",
  "git",
  "docker",
  "docker-compose",
  "kubectl",
  "helm",
  "curl",
  "wget",
  "ssh",
  "scp",
  "rsync",
  "bash",
  "sh",
  "zsh",
  "chmod",
  "chown",
  "rm",
  "cat",
  "grep",
  "sed",
  "awk",
  "make",
  "go",
  "cargo",
  "terraform"
];

const WRAPPER_PREFIXES = new Set(["sudo", "time", "env", "nohup", "command"]);
const JOIN_MARK = "\uE000";

const RISK_RULES = [
  { label: "包含 rm -rf 删除命令", pattern: /\brm\s+(?:-[^\s]*r[^\s]*f|-?[^\s]*f[^\s]*r)[\s/]/i },
  { label: "包含 DROP DATABASE", pattern: /\bDROP\s+DATABASE\b/i },
  { label: "包含 DROP TABLE", pattern: /\bDROP\s+TABLE\b/i },
  { label: "包含磁盘格式化命令", pattern: /\bmkfs(?:\.[\w-]+)?\b/i },
  { label: "包含强制清理 Docker 资源", pattern: /\bdocker\s+system\s+prune\b.*\b-f\b/i }
];

export function parseCommands(input, options = {}) {
  const text = typeof input === "string" ? input : "";
  const prefixes = buildPrefixList(options.customPrefixes);
  const lines = preprocessLines(text);
  const commands = [];
  let current = null;
  let pendingHereDoc = null;

  for (const line of lines) {
    const trimmed = line.cleaned.trim();
    if (!trimmed) {
      finalizeCurrent(commands, current);
      current = null;
      continue;
    }

    if (pendingHereDoc) {
      pendingHereDoc.lines.push(line);
      if (trimmed === pendingHereDoc.marker) {
        commands.push(buildUnsupported(pendingHereDoc.lines, "检测到 here-doc，多行脚本暂不支持自动压缩。"));
        pendingHereDoc = null;
      }
      continue;
    }

    const hereDocMarker = getHereDocMarker(trimmed);
    if (hereDocMarker && (current || isCommandStart(trimmed, prefixes))) {
      finalizeCurrent(commands, current);
      current = null;
      pendingHereDoc = { marker: hereDocMarker, lines: [line] };
      continue;
    }

    const startsCommand = isCommandStart(trimmed, prefixes);
    if (!current) {
      if (startsCommand) current = createCandidate(line);
      continue;
    }

    if (shouldStartNewCommand(current, trimmed, startsCommand, prefixes)) {
      finalizeCurrent(commands, current);
      current = startsCommand ? createCandidate(line) : null;
      continue;
    }

    if (shouldMergeLine(current, line, startsCommand)) {
      current.lines.push(line);
      continue;
    }

    finalizeCurrent(commands, current);
    current = startsCommand ? createCandidate(line) : null;
  }

  if (pendingHereDoc) {
    commands.push(buildUnsupported(pendingHereDoc.lines, "检测到 here-doc 起点，但未找到结束标记；未自动压缩。"));
  }
  finalizeCurrent(commands, current);

  return {
    commands,
    summary: {
      total: commands.length,
      supported: commands.filter((item) => !item.unsupported).length,
      unsupported: commands.filter((item) => item.unsupported).length,
      risky: commands.filter((item) => item.risks.length > 0).length
    }
  };
}

export function normalizeCommand(raw) {
  return buildSupported([{ original: raw, cleaned: raw, promptRemoved: false }]).fixed;
}

function buildPrefixList(customPrefixes = []) {
  return Array.from(
    new Set(
      [...DEFAULT_PREFIXES, ...customPrefixes]
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => b.length - a.length);
}

function preprocessLines(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((original) => {
      const trimmed = original.trim();
      if (/^```[\w-]*\s*$/.test(trimmed) || /^~~~[\w-]*\s*$/.test(trimmed)) {
        return null;
      }
      const promptStripped = stripShellPrompt(original);
      return {
        original,
        cleaned: promptStripped.value,
        promptRemoved: promptStripped.changed
      };
    })
    .filter(Boolean);
}

function stripShellPrompt(line) {
  const patterns = [
    /^\s*(?:\[[^\]]+\]\s*)?[\w.-]+@[\w.-]+(?::[^\n#$%>]*)?[#$%>]\s+/,
    /^\s*[\w.-]+@[\w.-]+\s+[^#$%>\n]+[#$%>]\s+/,
    /^\s*(?:\$|#|%)\s+/
  ];

  for (const pattern of patterns) {
    if (pattern.test(line)) {
      return { value: line.replace(pattern, ""), changed: true };
    }
  }

  return { value: line, changed: false };
}

function createCandidate(line) {
  return { lines: [line] };
}

function finalizeCurrent(commands, current) {
  if (!current) return;
  commands.push(buildSupported(current.lines));
}

function buildSupported(lines) {
  const original = lines.map((line) => line.original).join("\n");
  const cleanedLines = lines.map((line) => line.cleaned);
  const stats = {
    mergedNewlines: Math.max(0, lines.length - 1),
    removedContinuations: 0,
    removedPrompts: lines.filter((line) => line.promptRemoved).length,
    normalizedWhitespace: 0,
    repairedBrokenTokens: 0
  };
  const repairs = [];

  const parts = [];
  for (let index = 0; index < cleanedLines.length; index += 1) {
    let value = cleanedLines[index].trim();
    if (hasTrailingContinuation(value)) {
      value = value.replace(/\\\s*$/, "").trimEnd();
      stats.removedContinuations += 1;
    }
    if (value) parts.push(value);
  }

  const joined = parts.join(` ${JOIN_MARK} `);
  const collapsed = collapseWhitespaceOutsideQuotes(joined, stats);
  const fixed = repairBrokenTokenWhitespace(collapsed, stats, repairs);
  const risks = detectRisks(fixed);
  const notes = buildNotes(stats, original, fixed);

  return {
    original,
    fixed,
    unsupported: false,
    risks,
    repairs,
    notes,
    stats
  };
}

function buildUnsupported(lines, reason) {
  const original = lines.map((line) => line.original).join("\n");
  const cleaned = lines.map((line) => line.cleaned).join("\n");
  return {
    original,
    fixed: cleaned,
    unsupported: true,
    risks: detectRisks(cleaned),
    repairs: [],
    notes: [reason],
    stats: {
      mergedNewlines: 0,
      removedContinuations: 0,
      removedPrompts: lines.filter((line) => line.promptRemoved).length,
      normalizedWhitespace: 0,
      repairedBrokenTokens: 0
    }
  };
}

function buildNotes(stats, original, fixed) {
  const notes = [];
  if (stats.mergedNewlines > 0) notes.push(`合并 ${stats.mergedNewlines} 处换行。`);
  if (stats.removedContinuations > 0) notes.push(`移除 ${stats.removedContinuations} 处反斜杠续行。`);
  if (stats.removedPrompts > 0) notes.push(`移除 ${stats.removedPrompts} 处终端提示符。`);
  if (stats.normalizedWhitespace > 0) notes.push(`归一 ${stats.normalizedWhitespace} 处多余空白。`);
  if (stats.repairedBrokenTokens > 0) notes.push(`修复 ${stats.repairedBrokenTokens} 处日期、路径或文件名断点。`);
  if (notes.length === 0 && original === fixed) notes.push("未发现需要修复的折行。");
  return notes;
}

function isCommandStart(line, prefixes) {
  const normalized = stripLeadingCommandDecorators(line.trim());
  if (!normalized || normalized.startsWith("#")) return false;
  if (/^(?:\.{0,2}\/)[^\s]+/.test(normalized)) return true;
  if (/^[\w.-]+\/[\w./-]+\.(?:py|sh|js|mjs|cjs|ts)(?:\s|$)/.test(normalized)) return true;

  const token = firstToken(normalized);
  return prefixes.some((prefix) => token === prefix || token.startsWith(`${prefix}=`));
}

function stripLeadingCommandDecorators(line) {
  let value = line;

  for (let guard = 0; guard < 12; guard += 1) {
    const assignment = value.match(/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s]+)\s+/);
    if (assignment) {
      value = value.slice(assignment[0].length).trimStart();
      continue;
    }

    const token = firstToken(value);
    if (WRAPPER_PREFIXES.has(token)) {
      value = value.slice(token.length).trimStart();
      if (token === "sudo" && value.startsWith("-")) {
        value = value.replace(/^-[^\s]+\s+/, "");
      }
      continue;
    }

    break;
  }

  return value;
}

function firstToken(line) {
  const match = line.match(/^[^\s=]+/);
  return match ? match[0] : "";
}

function shouldStartNewCommand(current, line, startsCommand) {
  if (!startsCommand) return false;
  if (hasTrailingContinuation(lastCleanedLine(current))) return false;
  if (hasOpenSyntax(current.lines.map((item) => item.cleaned).join("\n"))) return false;
  return !isIndented(line);
}

function shouldMergeLine(current, line, startsCommand) {
  const lastLine = lastCleanedLine(current);
  if (hasTrailingContinuation(lastLine)) return true;
  const combined = current.lines.map((item) => item.cleaned).join("\n");
  if (hasOpenSyntax(combined)) return true;
  if (isIndented(line.cleaned) && !startsCommand) return true;
  if (looksLikeContinuationFragment(line.cleaned)) return true;
  return false;
}

function lastCleanedLine(current) {
  return current.lines[current.lines.length - 1]?.cleaned ?? "";
}

function isIndented(line) {
  return /^\s+\S/.test(line);
}

function looksLikeContinuationFragment(line) {
  const trimmed = line.trim();
  return /^(-{1,2}[\w-]+|[|&]{1,2}|[),}\]]|FROM\b|WHERE\b|AND\b|OR\b|ORDER\s+BY\b|GROUP\s+BY\b|LIMIT\b|JOIN\b|VALUES\b|SET\b)/i.test(trimmed);
}

function hasTrailingContinuation(line) {
  return /\\\s*$/.test(line);
}

function hasOpenSyntax(text) {
  const state = scanSyntax(text);
  return Boolean(state.quote || state.paren > 0 || state.bracket > 0 || state.brace > 0);
}

function scanSyntax(text) {
  const state = {
    quote: null,
    paren: 0,
    bracket: 0,
    brace: 0
  };
  let escaped = false;

  for (const char of text) {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (state.quote) {
      if (char === state.quote) state.quote = null;
      continue;
    }

    if (char === "'" || char === '"') {
      state.quote = char;
      continue;
    }

    if (char === "(") state.paren += 1;
    if (char === ")" && state.paren > 0) state.paren -= 1;
    if (char === "[") state.bracket += 1;
    if (char === "]" && state.bracket > 0) state.bracket -= 1;
    if (char === "{") state.brace += 1;
    if (char === "}" && state.brace > 0) state.brace -= 1;
  }

  return state;
}

function collapseWhitespaceOutsideQuotes(text, stats) {
  let output = "";
  let quote = null;
  let escaped = false;
  let pendingSpace = false;

  for (const char of text) {
    if (escaped) {
      if (pendingSpace) {
        output += " ";
        pendingSpace = false;
      }
      output += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      if (pendingSpace) {
        output += " ";
        pendingSpace = false;
      }
      output += char;
      escaped = true;
      continue;
    }

    if (quote) {
      output += char;
      if (char === quote) quote = null;
      continue;
    }

    if (char === "'" || char === '"') {
      if (pendingSpace) {
        output += " ";
        pendingSpace = false;
      }
      output += char;
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (pendingSpace) stats.normalizedWhitespace += 1;
      pendingSpace = true;
      continue;
    }

    if (pendingSpace && output) output += " ";
    pendingSpace = false;
    output += char;
  }

  return output.trim();
}

function repairBrokenTokenWhitespace(text, stats, repairs) {
  let output = text;
  const marker = JOIN_MARK;

  output = replaceAndTrack(output, new RegExp(`\\b(\\d{4})\\s*${marker}\\s*-\\s*(\\d{2})\\s*-\\s*(\\d{2})\\b`, "g"), "$1-$2-$3", "date", stats, repairs);
  output = replaceAndTrack(output, new RegExp(`\\b(\\d{4})-\\s*${marker}\\s*(\\d{2})-\\s*(\\d{2})\\b`, "g"), "$1-$2-$3", "date", stats, repairs);
  output = repairQuotedPathLikeSegments(output, stats, repairs);
  output = replaceAndTrack(output, new RegExp(`([A-Za-z0-9])_\\s*${marker}\\s*([A-Za-z0-9])`, "g"), "$1_$2", "token", stats, repairs);
  output = replaceAndTrack(output, new RegExp(`([A-Za-z0-9])\\s*${marker}\\s*_([A-Za-z0-9])`, "g"), "$1_$2", "token", stats, repairs);
  output = replaceAndTrack(output, new RegExp(`([A-Za-z0-9])\\.\\s*${marker}\\s*([A-Za-z0-9])`, "g"), "$1.$2", "token", stats, repairs);
  output = replaceAndTrack(output, new RegExp(`([A-Za-z0-9])\\s*${marker}\\s*\\.([A-Za-z0-9])`, "g"), "$1.$2", "token", stats, repairs);
  output = output.replace(new RegExp(`\\s*${marker}\\s*`, "g"), " ");

  return output;
}

function replaceAndTrack(text, pattern, replacement, type, stats, repairs) {
  return text.replace(pattern, (...args) => {
    const match = args[0];
    const replaced = replacement.replace(/\$(\d+)/g, (_, index) => args[Number(index)] ?? "");
    stats.repairedBrokenTokens += 1;
    repairs.push({
      type,
      before: visibleJoin(match),
      after: replaced
    });
    return replaced;
  });
}

function repairQuotedPathLikeSegments(text, stats, repairs) {
  return text.replace(/(["'])([^"']+)(\1)/g, (match, open, body, close) => {
    if (!body.includes(JOIN_MARK) || !looksPathLike(body)) return match;
    const repaired = repairPathLikeBody(body);
    if (repaired !== body) {
      stats.repairedBrokenTokens += 1;
      repairs.push({
        type: "path",
        before: visibleJoin(body),
        after: repaired
      });
    }
    return `${open}${repaired}${close}`;
  });
}

function looksPathLike(body) {
  return /[\\/]/.test(body) && /(?:\.[A-Za-z0-9]{1,8}\b|[_/\\][A-Za-z0-9])/.test(body);
}

function repairPathLikeBody(body) {
  return body
    .replace(new RegExp(`([/\\\\])\\s*${JOIN_MARK}\\s*([A-Za-z0-9._-])`, "g"), "$1$2")
    .replace(new RegExp(`([A-Za-z0-9._-])\\s*${JOIN_MARK}\\s*([/\\\\])`, "g"), "$1$2")
    .replace(new RegExp(`([A-Za-z0-9])_\\s*${JOIN_MARK}\\s*([A-Za-z0-9])`, "g"), "$1_$2")
    .replace(new RegExp(`([A-Za-z0-9])\\s*${JOIN_MARK}\\s*_([A-Za-z0-9])`, "g"), "$1_$2")
    .replace(new RegExp(`([A-Za-z0-9])\\.\\s*${JOIN_MARK}\\s*([A-Za-z0-9])`, "g"), "$1.$2")
    .replace(new RegExp(`([A-Za-z0-9])\\s*${JOIN_MARK}\\s*\\.([A-Za-z0-9])`, "g"), "$1.$2");
}

function visibleJoin(text) {
  return text.replace(new RegExp(`\\s*${JOIN_MARK}\\s*`, "g"), " ⏎ ");
}

function getHereDocMarker(line) {
  const match = line.match(/<<-?\s*['"]?([A-Za-z_][\w-]*)['"]?/);
  return match ? match[1] : null;
}

function detectRisks(command) {
  return RISK_RULES.filter((rule) => rule.pattern.test(command)).map((rule) => rule.label);
}
