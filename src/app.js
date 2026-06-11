import { parseCommands } from "./command-parser.js";
import { copyText } from "./clipboard.js";
import { EXAMPLE_INPUT } from "./examples.js";
import { clearPreferences, loadPreferences, savePreferences } from "./storage.js";

const elements = {
  input: document.querySelector("#inputText"),
  fixButton: document.querySelector("#fixButton"),
  clearButton: document.querySelector("#clearButton"),
  sampleButton: document.querySelector("#sampleButton"),
  showOriginal: document.querySelector("#showOriginal"),
  showDiff: document.querySelector("#showDiff"),
  customPrefixes: document.querySelector("#customPrefixes"),
  resetPrefsButton: document.querySelector("#resetPrefsButton"),
  resultSummary: document.querySelector("#resultSummary"),
  statusMessage: document.querySelector("#statusMessage"),
  resultsList: document.querySelector("#resultsList"),
  copyAllButton: document.querySelector("#copyAllButton")
};

let preferences = loadPreferences();
let latestCommands = [];
let feedbackTimer = null;

init();

function init() {
  syncPreferencesToForm();
  bindEvents();
  elements.resultSummary.textContent = "等待输入。";
  setCopyAllVisibility(false);
  renderStatus("粘贴内容后点击“修复命令”，结果会显示在这里。");
}

function bindEvents() {
  elements.fixButton.addEventListener("click", runParse);
  elements.input.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      runParse();
    }
  });
  elements.clearButton.addEventListener("click", clearInput);
  elements.sampleButton.addEventListener("click", loadExample);
  elements.copyAllButton.addEventListener("click", copyAllCommands);
  elements.showOriginal.addEventListener("change", updatePreferencesFromForm);
  elements.showDiff.addEventListener("change", updatePreferencesFromForm);
  elements.customPrefixes.addEventListener("input", updatePreferencesFromForm);
  elements.resetPrefsButton.addEventListener("click", resetPreferences);
}

function runParse() {
  const value = elements.input.value;
  if (!value.trim()) {
    latestCommands = [];
    renderStatus("粘贴内容后再修复。", "warning");
    renderResults([], { total: 0, supported: 0, unsupported: 0, risky: 0 });
    return;
  }

  const result = parseCommands(value, {
    customPrefixes: preferences.customPrefixes
  });
  latestCommands = result.commands;
  renderResults(result.commands, result.summary);
}

function renderResults(commands, summary) {
  elements.resultsList.replaceChildren();
  setCopyAllVisibility(summary.supported > 0);

  if (summary.total === 0) {
    elements.resultSummary.textContent = "未识别到命令。";
    renderStatus("未识别到可处理命令。可以只粘贴单条命令，或在设置里添加自定义命令前缀。", "warning");
    return;
  }

  const detail = [
    `${summary.total} 条候选`,
    `${summary.supported} 条可复制`
  ];
  if (summary.unsupported) detail.push(`${summary.unsupported} 条不支持`);
  if (summary.risky) detail.push(`${summary.risky} 条有风险提示`);
  elements.resultSummary.textContent = detail.join(" · ");
  renderStatus("修复完成。复制前请核对命令语义，风险提示不会阻止复制。", "success");

  const fragment = document.createDocumentFragment();
  commands.forEach((command, index) => {
    fragment.appendChild(renderCommandCard(command, index));
  });
  elements.resultsList.appendChild(fragment);
}

function renderCommandCard(command, index) {
  const card = document.createElement("article");
  card.className = [
    "result-card",
    command.unsupported ? "unsupported" : "",
    command.risks.length ? "risky" : ""
  ].filter(Boolean).join(" ");

  const head = document.createElement("div");
  head.className = "card-head";

  const title = document.createElement("div");
  title.className = "card-title";
  title.append(`命令 ${index + 1}`);
  title.appendChild(createBadge(command.unsupported ? "不支持" : "可复制", command.unsupported ? "unsupported" : ""));
  if (command.risks.length) title.appendChild(createBadge("高风险", "risk"));

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = command.unsupported ? "复制原文" : "复制";
  copyButton.addEventListener("click", async () => {
    await copyWithFeedback(copyButton, command.fixed || command.original);
  });

  head.append(title, copyButton);

  const body = document.createElement("div");
  body.className = "card-body";

  if (preferences.showOriginal) {
    const original = createCodeBlock(command.original, "original-block");
    original.setAttribute("aria-label", `命令 ${index + 1} 原始片段`);
    body.appendChild(original);
  }

  const fixed = createCodeBlock(command.fixed || command.original);
  fixed.setAttribute("aria-label", command.unsupported ? `命令 ${index + 1} 未修复原文` : `命令 ${index + 1} 修复结果`);
  body.appendChild(fixed);

  if (command.risks.length) {
    const risk = document.createElement("div");
    risk.className = "risk-note";
    risk.textContent = `风险提示：${command.risks.join("；")}。工具只提示风险，不保证命令安全。`;
    body.appendChild(risk);
  }

  if (preferences.showDiff && command.notes.length) {
    const notes = document.createElement("div");
    notes.className = "notes";
    command.notes.forEach((note) => {
      const item = document.createElement("div");
      item.textContent = note;
      notes.appendChild(item);
    });
    body.appendChild(notes);
  }

  card.append(head, body);
  return card;
}

function createBadge(text, variant) {
  const badge = document.createElement("span");
  badge.className = ["badge", variant].filter(Boolean).join(" ");
  badge.textContent = text;
  return badge;
}

function createCodeBlock(text, className = "") {
  const pre = document.createElement("pre");
  pre.className = ["code-block", className].filter(Boolean).join(" ");
  const code = document.createElement("code");
  code.textContent = text;
  pre.appendChild(code);
  return pre;
}

async function copyAllCommands() {
  const supported = latestCommands.filter((command) => !command.unsupported);
  const text = supported.map((command) => command.fixed).join("\n");
  if (!text) return;

  await copyWithFeedback(elements.copyAllButton, "复制全部", text);
  const skipped = latestCommands.length - supported.length;
  if (skipped > 0) {
    renderStatus(`已复制 ${supported.length} 条命令，跳过 ${skipped} 条不支持的多行结构。`, "warning");
  }
}

async function copyWithFeedback(button, textOrDefaultLabel, maybeText) {
  const originalLabel = button.textContent;
  const text = maybeText ?? textOrDefaultLabel;
  try {
    await copyText(text);
    button.textContent = "已复制";
  } catch {
    button.textContent = "复制失败";
  }

  window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => {
    button.textContent = originalLabel;
  }, 1400);
}

function setCopyAllVisibility(isVisible) {
  elements.copyAllButton.hidden = !isVisible;
  elements.copyAllButton.disabled = !isVisible;
}

function renderStatus(message, tone = "") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = ["status", tone].filter(Boolean).join(" ");
}

function clearInput() {
  elements.input.value = "";
  latestCommands = [];
  elements.resultsList.replaceChildren();
  elements.resultSummary.textContent = "等待输入。";
  setCopyAllVisibility(false);
  renderStatus("已清空输入。浏览器不会保存刚才的命令内容。");
  elements.input.focus();
}

function loadExample() {
  elements.input.value = EXAMPLE_INPUT;
  runParse();
  elements.input.focus();
}

function syncPreferencesToForm() {
  elements.showOriginal.checked = preferences.showOriginal;
  elements.showDiff.checked = preferences.showDiff;
  elements.customPrefixes.value = preferences.customPrefixes.join("\n");
}

function updatePreferencesFromForm() {
  preferences = {
    showOriginal: elements.showOriginal.checked,
    showDiff: elements.showDiff.checked,
    customPrefixes: elements.customPrefixes.value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
  };
  savePreferences(preferences);
  if (latestCommands.length) {
    renderResults(latestCommands, {
      total: latestCommands.length,
      supported: latestCommands.filter((item) => !item.unsupported).length,
      unsupported: latestCommands.filter((item) => item.unsupported).length,
      risky: latestCommands.filter((item) => item.risks.length).length
    });
  }
}

function resetPreferences() {
  clearPreferences();
  preferences = loadPreferences();
  syncPreferencesToForm();
  if (latestCommands.length) runParse();
  renderStatus("本地偏好已清除；命令内容没有被保存。", "success");
}
