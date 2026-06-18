import test from "node:test";
import assert from "node:assert/strict";
import {
  beginResultEditing,
  canEditResult,
  canStashResult,
  createResultState,
  createResultStates,
  getCopyAllText,
  getResultActions,
  getResultCopyText,
  getResultStashText,
  restoreResultAutoFixedText,
  updateResultCurrentText
} from "../src/result-state.js";

test("result editing: copy and stash use edited currentText", () => {
  const result = beginResultEditing(createResultState({
    original: "python -c 'print(1)'",
    fixed: "python -c 'print(1)'",
    unsupported: false
  }));

  const edited = updateResultCurrentText(result, "python -c 'print(2)'");

  assert.equal(edited.currentText, "python -c 'print(2)'");
  assert.equal(edited.autoFixedText, "python -c 'print(1)'");
  assert.equal(edited.isManuallyEdited, true);
  assert.equal(getResultCopyText(edited), "python -c 'print(2)'");
  assert.equal(getResultStashText(edited), "python -c 'print(2)'");
});

test("result editing: restore returns to auto-fixed result and clears editing state", () => {
  const edited = updateResultCurrentText(
    beginResultEditing(createResultState({
      original: "python -c 'print(1)'",
      fixed: "python -c 'print(1)'",
      unsupported: false
    })),
    "python -c 'print(2)'"
  );

  const restored = restoreResultAutoFixedText(edited);

  assert.equal(restored.currentText, "python -c 'print(1)'");
  assert.equal(restored.autoFixedText, "python -c 'print(1)'");
  assert.equal(restored.isEditing, false);
  assert.equal(restored.isManuallyEdited, false);
  assert.equal(getResultCopyText(restored), "python -c 'print(1)'");
  assert.equal(getResultStashText(restored), "python -c 'print(1)'");
});

test("result editing: unsupported results do not expose stash or edit actions", () => {
  const unsupported = createResultState({
    original: "cat <<EOF\nhello\nEOF",
    fixed: "cat <<EOF\nhello\nEOF",
    unsupported: true
  });

  const attemptedEdit = beginResultEditing(unsupported);
  const attemptedUpdate = updateResultCurrentText(attemptedEdit, "echo changed");

  assert.deepEqual(getResultActions(unsupported), ["copy"]);
  assert.equal(canEditResult(unsupported), false);
  assert.equal(canStashResult(unsupported), false);
  assert.equal(getResultStashText(unsupported), "");
  assert.equal(attemptedEdit.isEditing, false);
  assert.equal(attemptedUpdate.currentText, "cat <<EOF\nhello\nEOF");
});

test("result editing: createResultStates initializes app-facing state", () => {
  const [supported, unsupported] = createResultStates([
    {
      original: "echo one",
      fixed: "echo fixed",
      unsupported: false
    },
    {
      original: "cat <<EOF\nskip\nEOF",
      fixed: "cat <<EOF\nskip\nEOF",
      unsupported: true
    }
  ]);

  assert.equal(supported.autoFixedText, "echo fixed");
  assert.equal(supported.currentText, "echo fixed");
  assert.equal(supported.isEditing, false);
  assert.equal(supported.isManuallyEdited, false);
  assert.equal(canEditResult(supported), true);
  assert.equal(canStashResult(supported), true);
  assert.deepEqual(getResultActions(supported), ["copy", "stash", "edit"]);
  assert.deepEqual(getResultActions(beginResultEditing(supported)), ["copy-edit", "stash-edit", "restore-auto"]);
  assert.deepEqual(getResultActions(unsupported), ["copy"]);
});

test("result editing: copy all uses each supported result currentText", () => {
  const first = updateResultCurrentText(
    beginResultEditing(createResultState({
      original: "echo one",
      fixed: "echo one",
      unsupported: false
    })),
    "echo edited"
  );
  const second = createResultState({
    original: "echo two",
    fixed: "echo two",
    unsupported: false
  });
  const unsupported = createResultState({
    original: "cat <<EOF\nskip\nEOF",
    fixed: "cat <<EOF\nskip\nEOF",
    unsupported: true
  });

  assert.equal(getCopyAllText([first, unsupported, second]), "echo edited\necho two");
});
