import test from "node:test";
import assert from "node:assert/strict";
import { parseCommands } from "../src/command-parser.js";
import * as stash from "../src/local-stash.js";

const EXPECTED_STASH_KEY = "ai-command-fixer.localStash.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

class MemoryStorage {
  #data = new Map();

  getItem(key) {
    return this.#data.has(key) ? this.#data.get(key) : null;
  }

  setItem(key, value) {
    this.#data.set(String(key), String(value));
  }

  removeItem(key) {
    this.#data.delete(String(key));
  }

  clear() {
    this.#data.clear();
  }

  key(index) {
    return Array.from(this.#data.keys())[index] ?? null;
  }

  get length() {
    return this.#data.size;
  }
}

function installWindowStorage() {
  const localStorage = new MemoryStorage();
  globalThis.window = { localStorage };
  return localStorage;
}

function cleanupWindowStorage() {
  delete globalThis.window;
}

function hasLocalStashApi() {
  return [
    "LOCAL_STASH_KEY",
    "loadLocalStash",
    "addLocalStash",
    "updateLocalStashTitle",
    "deleteLocalStashItem",
    "clearLocalStash"
  ].every((name) => name in stash);
}

function skipUntilImplemented(t) {
  if (!hasLocalStashApi()) {
    t.skip("local stash storage API is not implemented yet");
    return true;
  }
  return false;
}

test("local stash storage API exposes the agreed key and operations", () => {
  assert.equal(stash.LOCAL_STASH_KEY, EXPECTED_STASH_KEY);
  assert.equal(typeof stash.loadLocalStash, "function");
  assert.equal(typeof stash.addLocalStash, "function");
  assert.equal(typeof stash.updateLocalStashTitle, "function");
  assert.equal(typeof stash.deleteLocalStashItem, "function");
  assert.equal(typeof stash.clearLocalStash, "function");
});

test("default parsing does not create local stash data", () => {
  const localStorage = installWindowStorage();

  try {
    const result = parseCommands(`python -c 'print("citation_l
ist")'`);

    assert.equal(result.commands.length, 1);
    assert.equal(localStorage.getItem(EXPECTED_STASH_KEY), null);
  } finally {
    cleanupWindowStorage();
  }
});

test("active stash saves only the repaired full command and safe metadata", (t) => {
  if (skipUntilImplemented(t)) return;
  const localStorage = installWindowStorage();
  const now = 1_780_000_000_000;

  try {
    const rawInput = `python -c 'fields=["citation_l
ist"]; print(fields)'`;
    const fixed = parseCommands(rawInput).commands[0].fixed;

    const result = stash.addLocalStash(fixed, "24h", { storage: localStorage, now });
    const stored = JSON.parse(localStorage.getItem(EXPECTED_STASH_KEY));
    const [item] = stored.items;

    assert.equal(result.status, "saved");
    assert.equal(stored.version, 1);
    assert.equal(stored.items.length, 1);
    assert.deepEqual(Object.keys(item).sort(), ["command", "createdAt", "expiresAt", "id", "title"]);
    assert.equal(item.command, fixed);
    assert.equal(item.title, "Python 片段");
    assert.equal(item.createdAt, now);
    assert.equal(item.expiresAt, now + DAY_MS);
    assert.doesNotMatch(JSON.stringify(stored), /citation_l\s+ist/);
    assert.doesNotMatch(JSON.stringify(stored), /original|raw|before|repair|risk|note|stat|hash|source|url|path/i);
  } finally {
    cleanupWindowStorage();
  }
});

test("active stash preserves editable local titles", (t) => {
  if (skipUntilImplemented(t)) return;
  const localStorage = installWindowStorage();
  const now = 1_780_000_000_000;

  try {
    const saved = stash.addLocalStash("python scripts/import_sales.py --file /home/报告/华东-六月.csv", "24h", { storage: localStorage, now });
    const updated = stash.updateLocalStashTitle(saved.item.id, "华东六月导入", { storage: localStorage, now });
    const stored = JSON.parse(localStorage.getItem(EXPECTED_STASH_KEY));

    assert.equal(updated.status, "saved");
    assert.equal(stored.items[0].title, "华东六月导入");
    assert.equal(stash.loadLocalStash({ storage: localStorage, now }).items[0].title, "华东六月导入");
  } finally {
    cleanupWindowStorage();
  }
});

test("expired local stash items are pruned from storage", (t) => {
  if (skipUntilImplemented(t)) return;
  const localStorage = installWindowStorage();
  const now = 1_780_000_000_000;

  try {
    localStorage.setItem(EXPECTED_STASH_KEY, JSON.stringify({
      version: 1,
      items: [
        { id: "expired", command: "python expired.py", createdAt: now - DAY_MS * 2, expiresAt: now - 1 },
        { id: "fresh", command: "python fresh.py", createdAt: now, expiresAt: now + DAY_MS }
      ]
    }));

    const result = stash.loadLocalStash({ storage: localStorage, now });
    const stored = stash.loadLocalStash({ storage: localStorage, now });

    assert.equal(result.removedExpired, 1);
    assert.deepEqual(stored.items.map((item) => item.id), ["fresh"]);
    assert.doesNotMatch(localStorage.getItem(EXPECTED_STASH_KEY), /expired/);
  } finally {
    cleanupWindowStorage();
  }
});

test("local stash blocks the 21st item instead of overwriting", (t) => {
  if (skipUntilImplemented(t)) return;
  const localStorage = installWindowStorage();
  const now = 1_780_000_000_000;

  try {
    const items = Array.from({ length: 20 }, (_, index) => ({
      id: `item-${index}`,
      command: `python script_${index}.py`,
      createdAt: now,
      expiresAt: now + DAY_MS
    }));
    localStorage.setItem(EXPECTED_STASH_KEY, JSON.stringify({ version: 1, items }));

    const result = stash.addLocalStash("python overflow.py", "24h", { storage: localStorage, now });
    const stored = JSON.parse(localStorage.getItem(EXPECTED_STASH_KEY));

    assert.equal(result.status, "limit_reached");
    assert.equal(stored.items.length, 20);
    assert.equal(stored.items.some((item) => item.command === "python overflow.py"), false);
  } finally {
    cleanupWindowStorage();
  }
});

test("local stash supports deleting one item and clearing all items", (t) => {
  if (skipUntilImplemented(t)) return;
  const localStorage = installWindowStorage();
  const now = 1_780_000_000_000;

  try {
    localStorage.setItem(EXPECTED_STASH_KEY, JSON.stringify({
      version: 1,
      items: [
        { id: "keep", command: "python keep.py", createdAt: now, expiresAt: now + DAY_MS },
        { id: "delete", command: "python delete.py", createdAt: now, expiresAt: now + DAY_MS }
      ]
    }));

    const deleteResult = stash.deleteLocalStashItem("delete", { storage: localStorage, now });
    assert.equal(deleteResult.removed, true);
    assert.deepEqual(stash.loadLocalStash({ storage: localStorage, now }).items.map((item) => item.id), ["keep"]);

    assert.equal(stash.clearLocalStash({ storage: localStorage }), true);
    assert.deepEqual(stash.loadLocalStash({ storage: localStorage, now }).items, []);
  } finally {
    cleanupWindowStorage();
  }
});
