import test from "node:test";
import assert from "node:assert/strict";
import {
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
  const result = createResultState({
    original: "python -c 'print(1)'",
    fixed: "python -c 'print(1)'",
    unsupported: false
  });

  const edited = updateResultCurrentText(result, "python -c 'print(2)'");

  assert.equal(edited.currentText, "python -c 'print(2)'");
  assert.equal(edited.autoFixedText, "python -c 'print(1)'");
  assert.equal(edited.isManuallyEdited, true);
  assert.equal(getResultCopyText(edited), "python -c 'print(2)'");
  assert.equal(getResultStashText(edited), "python -c 'print(2)'");
});

test("result editing: restore returns to auto-fixed result and remains editable", () => {
  const edited = updateResultCurrentText(
    createResultState({
      original: "python -c 'print(1)'",
      fixed: "python -c 'print(1)'",
      unsupported: false
    }),
    "python -c 'print(2)'"
  );

  const restored = restoreResultAutoFixedText(edited);

  assert.equal(restored.currentText, "python -c 'print(1)'");
  assert.equal(restored.autoFixedText, "python -c 'print(1)'");
  assert.equal(restored.isManuallyEdited, false);
  assert.equal(canEditResult(restored), true);
  assert.deepEqual(getResultActions(restored), ["copy", "stash", "restore-auto"]);
  assert.equal(getResultCopyText(restored), "python -c 'print(1)'");
  assert.equal(getResultStashText(restored), "python -c 'print(1)'");
});

test("result editing: unsupported results do not expose stash or edit actions", () => {
  const unsupported = createResultState({
    original: "cat <<EOF\nhello\nEOF",
    fixed: "cat <<EOF\nhello\nEOF",
    unsupported: true
  });

  const attemptedUpdate = updateResultCurrentText(unsupported, "echo changed");
  const attemptedRestore = restoreResultAutoFixedText(attemptedUpdate);

  assert.deepEqual(getResultActions(unsupported), ["copy"]);
  assert.equal(canEditResult(unsupported), false);
  assert.equal(canStashResult(unsupported), false);
  assert.equal(getResultStashText(unsupported), "");
  assert.equal(attemptedUpdate.currentText, "cat <<EOF\nhello\nEOF");
  assert.equal(attemptedRestore, attemptedUpdate);
});

test("result editing: createResultStates initializes supported results as editable", () => {
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
  assert.equal(supported.isManuallyEdited, false);
  assert.equal(canEditResult(supported), true);
  assert.equal(canStashResult(supported), true);
  assert.deepEqual(getResultActions(supported), ["copy", "stash", "restore-auto"]);
  assert.deepEqual(getResultActions(unsupported), ["copy"]);
});

test("result editing: copy all uses each supported result currentText", () => {
  const first = updateResultCurrentText(
    createResultState({
      original: "echo one",
      fixed: "echo one",
      unsupported: false
    }),
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
