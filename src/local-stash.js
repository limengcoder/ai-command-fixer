export const LOCAL_STASH_KEY = "ai-command-fixer.localStash.v1";
export const LOCAL_STASH_LIMIT = 20;
export const DEFAULT_STASH_TTL = "24h";
export const MAX_STASH_TITLE_LENGTH = 32;

export const STASH_TTL_OPTIONS = Object.freeze([
  { value: "1h", label: "1 小时", durationMs: 60 * 60 * 1000 },
  { value: "24h", label: "24 小时", durationMs: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "7 天", durationMs: 7 * 24 * 60 * 60 * 1000 }
]);

function getLocalStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const testKey = "__acf_local_stash_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

function getStorage(options = {}) {
  return options.storage ?? getLocalStorage();
}

function getNow(options = {}) {
  return typeof options.now === "number" ? options.now : Date.now();
}

function getTtlOption(ttl = DEFAULT_STASH_TTL) {
  return STASH_TTL_OPTIONS.find((option) => option.value === ttl) ?? STASH_TTL_OPTIONS[1];
}

function normalizeItem(item) {
  if (!item || typeof item !== "object") return null;
  const command = typeof item.command === "string" ? item.command : "";
  const id = typeof item.id === "string" ? item.id : "";
  const createdAt = Number(item.createdAt);
  const expiresAt = Number(item.expiresAt);

  if (!id || !command.trim() || !Number.isFinite(createdAt) || !Number.isFinite(expiresAt)) {
    return null;
  }

  return {
    id,
    title: normalizeTitle(item.title, command),
    command,
    createdAt,
    expiresAt
  };
}

function normalizeTitle(title, command) {
  const value = typeof title === "string" ? title.trim() : "";
  return truncateTitle(value || generateLocalStashTitle(command));
}

function readState(storage) {
  if (!storage) return { available: false, items: [] };

  try {
    const raw = storage.getItem(LOCAL_STASH_KEY);
    if (!raw) return { available: true, items: [] };
    const parsed = JSON.parse(raw);
    let needsTitleMigration = false;
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
    const items = rawItems
      .map((item) => {
        const normalized = normalizeItem(item);
        if (!normalized) return null;
        if (typeof item.title !== "string" || item.title.trim() !== normalized.title) {
          needsTitleMigration = true;
        }
        return normalized;
      })
      .filter(Boolean)
      .slice(0, LOCAL_STASH_LIMIT);
    return { available: true, items, needsTitleMigration };
  } catch {
    return { available: true, items: [] };
  }
}

function writeState(storage, items) {
  if (!storage) return false;

  try {
    storage.setItem(LOCAL_STASH_KEY, JSON.stringify({ version: 1, items }));
    return true;
  } catch {
    return false;
  }
}

function createId(now) {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // Fall back to a local-only id below.
  }
  return `stash-${now}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadLocalStash(options = {}) {
  const storage = getStorage(options);
  const now = getNow(options);
  const state = readState(storage);
  if (!state.available) {
    return { available: false, items: [], removedExpired: 0 };
  }

  const activeItems = state.items.filter((item) => item.expiresAt > now);
  const removedExpired = state.items.length - activeItems.length;
  if (removedExpired > 0 || state.needsTitleMigration) writeState(storage, activeItems);

  return {
    available: true,
    items: activeItems,
    removedExpired
  };
}

export function addLocalStash(command, ttl = DEFAULT_STASH_TTL, options = {}) {
  const storage = getStorage(options);
  const now = getNow(options);
  const normalizedCommand = typeof command === "string" ? command.trim() : "";
  const cleaned = loadLocalStash({ ...options, storage, now });

  if (!cleaned.available) {
    return { status: "unavailable", items: [], removedExpired: 0 };
  }

  if (!normalizedCommand) {
    return { status: "empty", items: cleaned.items, removedExpired: cleaned.removedExpired };
  }

  if (cleaned.items.length >= LOCAL_STASH_LIMIT) {
    return { status: "limit_reached", items: cleaned.items, removedExpired: cleaned.removedExpired };
  }

  const ttlOption = getTtlOption(ttl);
  const item = {
    id: createId(now),
    title: normalizeTitle(options.title, normalizedCommand),
    command: normalizedCommand,
    createdAt: now,
    expiresAt: now + ttlOption.durationMs
  };
  const items = [item, ...cleaned.items];
  if (!writeState(storage, items)) {
    return { status: "unavailable", items: cleaned.items, removedExpired: cleaned.removedExpired };
  }

  return {
    status: "saved",
    item,
    items,
    ttl: ttlOption,
    removedExpired: cleaned.removedExpired
  };
}

export function updateLocalStashTitle(id, title, options = {}) {
  const storage = getStorage(options);
  const cleaned = loadLocalStash({ ...options, storage });

  if (!cleaned.available) {
    return { status: "unavailable", items: [], removedExpired: 0 };
  }

  const items = cleaned.items.map((item) => {
    if (item.id !== id) return item;
    return { ...item, title: normalizeTitle(title, item.command) };
  });
  const updated = items.some((item, index) => item.title !== cleaned.items[index]?.title);
  if (!updated) {
    return { status: "unchanged", items, removedExpired: cleaned.removedExpired };
  }

  if (!writeState(storage, items)) {
    return { status: "unavailable", items: cleaned.items, removedExpired: cleaned.removedExpired };
  }

  return {
    status: "saved",
    items,
    removedExpired: cleaned.removedExpired
  };
}

export function deleteLocalStashItem(id, options = {}) {
  const storage = getStorage(options);
  const cleaned = loadLocalStash({ ...options, storage });

  if (!cleaned.available) {
    return { available: false, items: [], removedExpired: 0, removed: false };
  }

  const items = cleaned.items.filter((item) => item.id !== id);
  const removed = items.length !== cleaned.items.length;
  if (removed) writeState(storage, items);

  return {
    available: true,
    items,
    removed,
    removedExpired: cleaned.removedExpired
  };
}

export function clearLocalStash(options = {}) {
  const storage = getStorage(options);
  if (!storage) return false;

  try {
    storage.removeItem(LOCAL_STASH_KEY);
    return true;
  } catch {
    return false;
  }
}

export function generateLocalStashTitle(command) {
  const tokens = tokenizeCommand(command);
  if (!tokens.length) return "暂存命令";

  const first = basename(tokens[0]);
  if (/^python(?:\d+(?:\.\d+)*)?$/.test(first)) return titleFromPython(tokens);
  if (first === "node") return titleFromRuntime("Node", tokens);
  if (first === "bash" || first === "sh" || first === "zsh") return titleFromRuntime(first, tokens);
  if (first === "npm" || first === "pnpm" || first === "yarn") return truncateTitle(`${first} ${tokens.slice(1, 3).join(" ")}`.trim());
  if (first === "git") return truncateTitle(`git ${tokens.slice(1, 3).join(" ")}`.trim());
  if (first === "docker" || first === "kubectl" || first === "helm") return truncateTitle(`${first} ${tokens.slice(1, 3).join(" ")}`.trim());
  if (first === "curl" || first === "wget") return titleFromUrl(first, tokens);
  if (first === "cd") return truncateTitle(`进入 ${basename(tokens[1]) || "目录"}`);

  const pathToken = tokens.find((token) => /[/\\]/.test(token) && basename(token));
  if (pathToken) return truncateTitle(`${first} ${basename(pathToken)}`.trim());
  return truncateTitle(tokens.slice(0, 3).join(" "));
}

function titleFromPython(tokens) {
  const script = tokens.find((token, index) => index > 0 && !token.startsWith("-") && /\.(?:py|pyw)$/i.test(token));
  if (script) return truncateTitle(`python ${basename(script)}`);
  if (tokens.includes("-c")) return "Python 片段";
  return titleFromRuntime("python", tokens);
}

function titleFromRuntime(label, tokens) {
  const script = tokens.find((token, index) => index > 0 && !token.startsWith("-") && token !== "-c");
  return truncateTitle(script ? `${label} ${basename(script)}` : `${label} 命令`);
}

function titleFromUrl(label, tokens) {
  const url = tokens.find((token) => /^https?:\/\//i.test(token));
  if (!url) return truncateTitle(`${label} 请求`);
  try {
    return truncateTitle(`${label} ${new URL(url).hostname}`);
  } catch {
    return truncateTitle(`${label} 请求`);
  }
}

function tokenizeCommand(command) {
  const tokens = [];
  let token = "";
  let quote = null;
  let escaped = false;

  for (const char of String(command || "")) {
    if (escaped) {
      token += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        token += char;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (token) {
        tokens.push(token);
        token = "";
      }
      continue;
    }
    token += char;
  }

  if (token) tokens.push(token);
  return tokens;
}

function basename(value = "") {
  const clean = String(value).replace(/[\\/]+$/, "");
  return clean.split(/[\\/]/).filter(Boolean).pop() ?? "";
}

function truncateTitle(title) {
  const compact = String(title || "暂存命令").replace(/\s+/g, " ").trim() || "暂存命令";
  return Array.from(compact).slice(0, MAX_STASH_TITLE_LENGTH).join("");
}
