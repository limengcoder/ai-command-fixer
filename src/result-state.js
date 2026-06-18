export function createResultState(command) {
  const autoFixedText = command.fixed || command.original || "";
  return {
    ...command,
    autoFixedText,
    currentText: autoFixedText,
    isEditing: false,
    isManuallyEdited: false
  };
}

export function createResultStates(commands) {
  return commands.map(createResultState);
}

export function canEditResult(result) {
  return !result.unsupported;
}

export function canStashResult(result) {
  return !result.unsupported;
}

export function beginResultEditing(result) {
  if (!canEditResult(result)) return result;
  return {
    ...result,
    isEditing: true
  };
}

export function updateResultCurrentText(result, currentText) {
  if (!canEditResult(result)) return result;
  return {
    ...result,
    currentText,
    isManuallyEdited: currentText !== result.autoFixedText
  };
}

export function restoreResultAutoFixedText(result) {
  return {
    ...result,
    currentText: result.autoFixedText,
    isEditing: false,
    isManuallyEdited: false
  };
}

export function getResultCopyText(result) {
  return result.currentText;
}

export function getResultStashText(result) {
  return canStashResult(result) ? result.currentText : "";
}

export function getCopyAllText(results) {
  return results
    .filter((result) => !result.unsupported)
    .map((result) => result.currentText)
    .join("\n");
}

export function getResultActions(result) {
  if (result.unsupported) return ["copy"];
  if (result.isEditing) return ["copy-edit", "stash-edit", "restore-auto"];
  return ["copy", "stash", "edit"];
}
