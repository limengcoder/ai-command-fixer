import { parseCommands } from "./command-parser.js?v=result-edit-20260618";
import { copyText } from "./clipboard.js?v=result-edit-20260618";
import { EXAMPLE_INPUT } from "./examples.js?v=result-edit-20260618";
import {
  addLocalStash,
  clearLocalStash,
  DEFAULT_STASH_TTL,
  deleteLocalStashItem,
  loadLocalStash,
  STASH_TTL_OPTIONS
} from "./local-stash.js?v=result-edit-20260618";
import {
  beginResultEditing,
  canEditResult,
  canStashResult,
  createResultStates,
  getCopyAllText,
  getResultActions,
  getResultCopyText,
  getResultStashText,
  restoreResultAutoFixedText,
  updateResultCurrentText
} from "./result-state.js?v=result-edit-20260618";
import { clearPreferences, loadPreferences, savePreferences } from "./storage.js?v=result-edit-20260618";

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
  latestCommands = createResultStates(result.commands);
  renderResults(latestCommands, result.summary);
}

function renderResults(commands, summary, options = {}) {
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
  if (!options.preserveStatus) {
    renderStatus("修复完成。复制前请核对命令语义，风险提示不会阻止复制。", "success");
  }

  const fragment = document.createDocumentFragment();
  commands.forEach((command, index) => {
    fragment.appendChild(renderCommandCard(command, index));
  });
  elements.resultsList.appendChild(fragment);
}

function renderCommandCard(command, index) {
  const actions = getResultActions(command);

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
  if (command.isEditing || command.isManuallyEdited) title.appendChild(createBadge("已手动编辑", "edited"));

  const cardActions = document.createElement("div");
  cardActions.className = "card-actions";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = command.isEditing ? "复制编辑结果" : "复制";
  copyButton.addEventListener("click", async () => {
    const fallbackLabel = command.isEditing ? "复制编辑结果" : "复制";
    const copied = await copyWithFeedback(copyButton, fallbackLabel, getResultCopyText(latestCommands[index]));
    if (copied) renderStatus(`已复制命令 ${index + 1}。`, "success");
  });

  cardActions.append(copyButton);

  if (canStashResult(command) && (actions.includes("stash") || actions.includes("stash-edit"))) {
    const stashButton = document.createElement("button");
    stashButton.type = "button";
    stashButton.textContent = command.isEditing ? "暂存编辑结果" : "暂存";
    stashButton.addEventListener("click", () => {
      stashFixedCommand(stashButton, getResultStashText(latestCommands[index]));
    });
    cardActions.appendChild(stashButton);
  }

  if (actions.includes("restore-auto")) {
    const restoreButton = document.createElement("button");
    restoreButton.type = "button";
    restoreButton.className = "link-button restore-button";
    restoreButton.textContent = "恢复自动修复结果";
    restoreButton.addEventListener("click", () => {
      latestCommands[index] = restoreResultAutoFixedText(command);
      renderResults(latestCommands, getLatestSummary(), { preserveStatus: true });
      renderStatus(`命令 ${index + 1} 已恢复为自动修复结果。`, "success");
    });
    cardActions.appendChild(restoreButton);
  } else if (canEditResult(command) && actions.includes("edit")) {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "link-button edit-result-button";
    editButton.textContent = "编辑";
    editButton.addEventListener("click", () => {
      latestCommands[index] = beginResultEditing(command);
      renderResults(latestCommands, getLatestSummary(), { preserveStatus: true });
      const editor = elements.resultsList.querySelector(`[data-command-editor="${index}"]`);
      if (editor) {
        editor.focus();
        editor.setSelectionRange(editor.value.length, editor.value.length);
      }
    });
    cardActions.appendChild(editButton);
  }
  head.append(title, cardActions);

  const body = document.createElement("div");
  body.className = "card-body";

  if (preferences.showOriginal) {
    const original = createCodeBlock(command.original, "original-block");
    original.setAttribute("aria-label", `命令 ${index + 1} 原始片段`);
    body.appendChild(original);
  }

  if (command.isEditing) {
    const editor = document.createElement("textarea");
    editor.className = "result-editor";
    editor.spellcheck = false;
    editor.value = getResultCopyText(command);
    editor.rows = Math.min(16, Math.max(6, editor.value.split("\n").length + 1));
    editor.dataset.commandEditor = String(index);
    editor.setAttribute("aria-label", `命令 ${index + 1} 编辑结果`);
    editor.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    editor.addEventListener("input", () => {
      latestCommands[index] = updateResultCurrentText(latestCommands[index], editor.value);
    });
    body.appendChild(editor);
  } else {
    const fixed = createCodeBlock(getResultCopyText(command));
    fixed.setAttribute("aria-label", command.unsupported ? `命令 ${index + 1} 未修复原文` : `命令 ${index + 1} 修复结果`);
    fixed.classList.add("copyable-block");
    fixed.tabIndex = 0;
    fixed.setAttribute("role", "button");
    fixed.setAttribute(
      "aria-label",
      command.unsupported ? `命令 ${index + 1} 原文，点击或按回车复制` : `命令 ${index + 1} 修复结果，点击或按回车复制`
    );
    fixed.addEventListener("click", () => {
      copyResultBlock(index, getResultCopyText(latestCommands[index]));
    });
    fixed.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        copyResultBlock(index, getResultCopyText(latestCommands[index]));
      }
    });
    body.appendChild(fixed);
  }

  if (command.risks.length) {
    const risk = document.createElement("div");
    risk.className = "risk-note";
    risk.textContent = `风险提示：${command.risks.join("；")}。工具只提示风险，不保证命令安全。`;
    body.appendChild(risk);
  }

  if (command.repairs?.length) {
    body.appendChild(renderRepairList(command.repairs));
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

function getLatestSummary() {
  return {
    total: latestCommands.length,
    supported: latestCommands.filter((item) => !item.unsupported).length,
    unsupported: latestCommands.filter((item) => item.unsupported).length,
    risky: latestCommands.filter((item) => item.risks.length).length
  };
}

function renderRepairList(repairs) {
  const wrapper = document.createElement("div");
  wrapper.className = "repair-list";

  const groups = [
    {
      title: "自动修复",
      items: repairs.filter((repair) => getRepairMeta(repair).group === "auto")
    },
    {
      title: "建议核对",
      items: repairs.filter((repair) => getRepairMeta(repair).group === "review")
    }
  ].filter((group) => group.items.length);

  groups.forEach((group) => {
    const section = document.createElement("div");
    section.className = "repair-group";
    const label = document.createElement("div");
    label.className = "repair-label";
    label.textContent = group.title;
    section.appendChild(label);

    group.items.forEach((repair) => {
      const meta = getRepairMeta(repair);
      const item = document.createElement("div");
      item.className = ["repair-item", meta.group === "review" ? "needs-review" : ""].filter(Boolean).join(" ");

      const type = document.createElement("span");
      type.className = "repair-type";
      type.textContent = meta.label;

      const before = document.createElement("mark");
      before.textContent = repair.before;
      const arrow = document.createElement("span");
      arrow.textContent = "->";
      const after = document.createElement("mark");
      after.textContent = repair.after;
      const help = document.createElement("span");
      help.className = "repair-help";
      help.textContent = meta.help;

      item.append(type, before, arrow, after, help);
      section.appendChild(item);
    });

    wrapper.appendChild(section);
  });

  return wrapper;
}

function getRepairMeta(repair) {
  const metaByType = {
    date: {
      group: "auto",
      label: "日期断点",
      help: "识别为日期被换行打断，已合并为连续日期。"
    },
    path: {
      group: "auto",
      label: "路径断点",
      help: "识别为路径片段被换行打断，已合并路径。"
    },
    option: {
      group: "auto",
      label: "命令参数名断点",
      help: "识别为 CLI 长选项名被换行打断，已合并连字符两侧内容。"
    },
    token: {
      group: "auto",
      label: "字段名断点",
      help: "识别为代码 token 被换行打断，已合并相邻片段。"
    },
    sql: {
      group: "review",
      label: "SQL 片段",
      help: "已修复 SQL 字符串内的疑似断点，建议核对字段名和表名。"
    },
    "inferred-token": {
      group: "review",
      label: "推测修复",
      help: "根据字段名、文件名或标识符形态推测合并，建议核对业务含义。"
    }
  };

  return metaByType[repair.type] ?? {
    group: "review",
    label: "建议核对",
    help: "已处理疑似断点，建议复制前核对。"
  };
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
  const originalLabel = button.textContent;
  const selectedTtl = elements.stashTtl.value || DEFAULT_STASH_TTL;
  const result = addLocalStash(command, selectedTtl);
  localStashItems = result.items;
  renderLocalStash();

  if (result.status === "saved") {
    button.textContent = "已暂存";
    window.clearTimeout(buttonFeedbackTimer);
    buttonFeedbackTimer = window.setTimeout(() => {
      button.textContent = originalLabel;
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
  const text = getCopyAllText(latestCommands);
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
    renderResults(latestCommands, getLatestSummary());
  }
}

function resetPreferences() {
  clearPreferences();
  preferences = loadPreferences();
  syncPreferencesToForm();
  if (latestCommands.length) runParse();
  renderStatus("本地偏好已清除；命令内容没有被保存。", "success");
}
