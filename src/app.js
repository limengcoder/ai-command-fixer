import { parseCommands } from "./command-parser.js?v=local-stash-20260613";
import { copyText } from "./clipboard.js?v=local-stash-20260613";
import { EXAMPLE_INPUT } from "./examples.js?v=local-stash-20260613";
import {
  addLocalStash,
  clearLocalStash,
  DEFAULT_STASH_TTL,
  deleteLocalStashItem,
  loadLocalStash,
  STASH_TTL_OPTIONS
} from "./local-stash.js?v=local-stash-20260613";
import { clearPreferences, loadPreferences, savePreferences } from "./storage.js?v=local-stash-20260613";

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
  copyAllButton: document.querySelector("#copyAllButton"),
  stashPanel: document.querySelector("#localStashPanel"),
  stashSummary: document.querySelector("#localStashSummary"),
  stashTtl: document.querySelector("#stashTtl"),
  stashMessage: document.querySelector("#stashMessage"),
  stashList: document.querySelector("#stashList"),
  clearStashButton: document.querySelector("#clearStashButton")
};

let preferences = loadPreferences();
let latestCommands = [];
let localStashItems = [];
let buttonFeedbackTimer = null;

init();

function init() {
  syncPreferencesToForm();
  bindEvents();
  initializeStashTtlOptions();
  refreshLocalStash("load");
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
  elements.stashPanel.addEventListener("toggle", () => {
    if (elements.stashPanel.open) refreshLocalStash("open");
  });
  elements.clearStashButton.addEventListener("click", clearAllStash);
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
    customPrefixes: preferences.customPrefixes,
    splitMode: "single"
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
    `${summary.total} 条结果`,
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

  const cardActions = document.createElement("div");
  cardActions.className = "card-actions";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "复制";
  copyButton.addEventListener("click", async () => {
    await copyWithFeedback(copyButton, "复制", command.fixed || command.original);
  });

  const stashButton = document.createElement("button");
  stashButton.type = "button";
  stashButton.textContent = "暂存";
  stashButton.disabled = command.unsupported;
  if (command.unsupported) {
    stashButton.title = "不支持的多行结构不会作为修复后命令暂存。";
  } else {
    stashButton.addEventListener("click", () => {
      stashFixedCommand(stashButton, command.fixed);
    });
  }

  cardActions.append(copyButton, stashButton);
  head.append(title, cardActions);

  const body = document.createElement("div");
  body.className = "card-body";

  if (preferences.showOriginal) {
    const original = createCodeBlock(command.original, "original-block");
    original.setAttribute("aria-label", `命令 ${index + 1} 原始片段`);
    body.appendChild(original);
  }

  const fixed = createCodeBlock(command.fixed || command.original);
  fixed.setAttribute("aria-label", command.unsupported ? `命令 ${index + 1} 未修复原文` : `命令 ${index + 1} 修复结果`);
  fixed.classList.add("copyable-block");
  fixed.tabIndex = 0;
  fixed.setAttribute("role", "button");
  fixed.setAttribute(
    "aria-label",
    command.unsupported ? `命令 ${index + 1} 原文，点击或按回车复制` : `命令 ${index + 1} 修复结果，点击或按回车复制`
  );
  fixed.addEventListener("click", () => {
    copyResultBlock(index, command.fixed || command.original);
  });
  fixed.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      copyResultBlock(index, command.fixed || command.original);
    }
  });
  body.appendChild(fixed);

  if (command.risks.length) {
    const risk = document.createElement("div");
    risk.className = "risk-note";
    risk.textContent = `风险提示：${command.risks.join("；")}。工具只提示风险，不保证命令安全。`;
    body.appendChild(risk);
  }

  if (command.repairs?.length) {
    const repairs = document.createElement("div");
    repairs.className = "repair-list";
    const label = document.createElement("div");
    label.className = "repair-label";
    label.textContent = "自动修复点";
    repairs.appendChild(label);

    command.repairs.forEach((repair) => {
      const item = document.createElement("div");
      item.className = "repair-item";
      const before = document.createElement("mark");
      before.textContent = repair.before;
      const arrow = document.createElement("span");
      arrow.textContent = "->";
      const after = document.createElement("mark");
      after.textContent = repair.after;
      if (repair.type === "inferred-token") {
        const type = document.createElement("span");
        type.className = "repair-type";
        type.textContent = "推测";
        item.append(type);
      }
      item.append(before, arrow, after);
      repairs.appendChild(item);
    });

    body.appendChild(repairs);
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

function initializeStashTtlOptions() {
  elements.stashTtl.replaceChildren();
  STASH_TTL_OPTIONS.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    item.selected = option.value === DEFAULT_STASH_TTL;
    elements.stashTtl.appendChild(item);
  });
}

function refreshLocalStash(trigger = "manual") {
  const result = loadLocalStash();
  localStashItems = result.items;
  renderLocalStash();

  if (!result.available) {
    renderStashMessage("当前浏览器无法访问 localStorage，暂存不可用。", "warning");
    return result;
  }

  if (result.removedExpired > 0) {
    renderStashMessage(`已自动清理 ${result.removedExpired} 条过期暂存。`, "success");
  } else if (trigger === "load") {
    renderStashMessage("暂存内容仅保存在当前浏览器本地，过期自动清理。");
  }

  return result;
}

function renderLocalStash() {
  elements.stashSummary.textContent = `本地暂存（${localStashItems.length}/20）`;
  elements.clearStashButton.disabled = localStashItems.length === 0;
  elements.stashList.replaceChildren();

  if (localStashItems.length === 0) {
    const empty = document.createElement("p");
    empty.className = "stash-empty";
    empty.textContent = "暂无暂存命令。修复结果默认不会保存，只有点击“暂存”后才会出现在这里。";
    elements.stashList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  localStashItems.forEach((item) => {
    fragment.appendChild(renderStashItem(item));
  });
  elements.stashList.appendChild(fragment);
}

function renderStashItem(item) {
  const row = document.createElement("article");
  row.className = "stash-item";

  const meta = document.createElement("div");
  meta.className = "stash-meta";
  meta.textContent = `创建 ${formatDateTime(item.createdAt)} · 过期 ${formatDateTime(item.expiresAt)}`;

  const code = createCodeBlock(item.command, "stash-command");
  code.setAttribute("aria-label", "暂存命令预览");

  const actions = document.createElement("div");
  actions.className = "stash-actions";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "复制";
  copyButton.addEventListener("click", async () => {
    const copied = await copyWithFeedback(copyButton, "复制", item.command);
    renderStatus(copied ? "已复制暂存命令。" : "复制失败，请手动选中暂存命令复制。", copied ? "success" : "warning");
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "删除";
  deleteButton.addEventListener("click", () => {
    const result = deleteLocalStashItem(item.id);
    localStashItems = result.items;
    renderLocalStash();
    renderStashMessage(result.removed ? "已删除 1 条暂存。" : "这条暂存已经不存在。", "success");
  });

  actions.append(copyButton, deleteButton);
  row.append(meta, code, actions);
  return row;
}

function stashFixedCommand(button, command) {
  const selectedTtl = elements.stashTtl.value || DEFAULT_STASH_TTL;
  const result = addLocalStash(command, selectedTtl);
  localStashItems = result.items;
  renderLocalStash();

  if (result.status === "saved") {
    button.textContent = "已暂存";
    window.clearTimeout(buttonFeedbackTimer);
    buttonFeedbackTimer = window.setTimeout(() => {
      button.textContent = "暂存";
    }, 1400);
    renderStatus(`已暂存，${result.ttl.label}后自动清理。`, "success");
    renderStashMessage("暂存内容仅保存在当前浏览器本地，过期自动清理。", "success");
    return;
  }

  if (result.status === "limit_reached") {
    renderStatus("暂存已达 20 条，请删除旧项或清空全部后再暂存。", "warning");
    renderStashMessage("暂存已达 20 条，请删除旧项或清空全部后再暂存。", "warning");
    return;
  }

  if (result.status === "unavailable") {
    renderStatus("当前浏览器无法访问 localStorage，暂存失败。", "warning");
    renderStashMessage("当前浏览器无法访问 localStorage，暂存不可用。", "warning");
    return;
  }

  renderStatus("没有可暂存的修复后命令。", "warning");
}

function clearAllStash() {
  clearLocalStash();
  localStashItems = [];
  renderLocalStash();
  renderStashMessage("已清空全部本地暂存。", "success");
}

function renderStashMessage(message, tone = "") {
  elements.stashMessage.textContent = message;
  elements.stashMessage.className = ["stash-message", tone].filter(Boolean).join(" ");
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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

async function copyResultBlock(index, text) {
  try {
    await copyText(text);
    renderStatus(`已复制命令 ${index + 1}。`, "success");
  } catch {
    renderStatus("复制失败，请手动选中结果复制。", "warning");
  }
}

async function copyWithFeedback(button, textOrDefaultLabel, maybeText) {
  const originalLabel = button.textContent;
  const text = maybeText ?? textOrDefaultLabel;
  let copied = false;
  try {
    await copyText(text);
    button.textContent = "已复制";
    copied = true;
  } catch {
    button.textContent = "复制失败";
  }

  window.clearTimeout(buttonFeedbackTimer);
  buttonFeedbackTimer = window.setTimeout(() => {
    button.textContent = originalLabel;
  }, 1400);
  return copied;
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
