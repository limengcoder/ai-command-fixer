import test from "node:test";
import assert from "node:assert/strict";
import { parseCommands } from "../src/command-parser.js";
import {
  addLocalStash,
  clearLocalStash,
  deleteLocalStashItem,
  generateLocalStashTitle,
  loadLocalStash,
  LOCAL_STASH_KEY,
  LOCAL_STASH_LIMIT,
  updateLocalStashTitle
} from "../src/local-stash.js";

function createMemoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    }
  };
}

function seedStash(storage, items) {
  storage.setItem(LOCAL_STASH_KEY, JSON.stringify({ version: 1, items }));
}

function readRawItems(storage) {
  const raw = storage.getItem(LOCAL_STASH_KEY);
  return raw ? JSON.parse(raw).items : [];
}

test("local stash: default parsing does not automatically save commands", () => {
  const storage = createMemoryStorage();
  const result = parseCommands("python -c \"print('ok')\"");

  assert.equal(result.commands[0].fixed, "python -c \"print('ok')\"");
  assert.equal(storage.getItem(LOCAL_STASH_KEY), null);

  const stash = loadLocalStash({ storage, now: 1000 });
  assert.deepEqual(stash.items, []);
  assert.equal(storage.getItem(LOCAL_STASH_KEY), null);
});

test("local stash: explicit save stores only the fixed command", () => {
  const storage = createMemoryStorage();
  const input = `python -c "print('hello')
print('world')"`;
  const parsed = parseCommands(input);
  const fixed = parsed.commands[0].fixed;

  const result = addLocalStash(fixed, "24h", { storage, now: 1_000 });
  const rawItems = readRawItems(storage);

  assert.equal(result.status, "saved");
  assert.equal(rawItems.length, 1);
  assert.equal(rawItems[0].command, fixed);
  assert.equal(rawItems[0].createdAt, 1_000);
  assert.equal(rawItems[0].expiresAt, 86_401_000);
  assert.equal(rawItems[0].title, "Python 片段");
  assert.deepEqual(Object.keys(rawItems[0]).sort(), ["command", "createdAt", "expiresAt", "id", "title"]);
  assert.doesNotMatch(rawItems[0].command, /\n/);
});

test("local stash: load v1 items without title and fills a default title", () => {
  const storage = createMemoryStorage();
  seedStash(storage, [
    { id: "legacy", command: "python scripts/import_sales.py --file /home/报告/华东-六月.csv", createdAt: 1_000, expiresAt: 9_000 }
  ]);

  const result = loadLocalStash({ storage, now: 2_000 });

  assert.equal(result.items[0].title, "python import_sales.py");
  assert.equal(readRawItems(storage)[0].title, "python import_sales.py");
});

test("local stash: generated titles stay short and editable titles persist", () => {
  const storage = createMemoryStorage();
  const saved = addLocalStash("git restore --source=FETCH_HEAD --worktree -- /home/报告/华东-六月.csv", "24h", { storage, now: 1_000 });
  const updated = updateLocalStashTitle(saved.item.id, "华东六月报表恢复", { storage, now: 2_000 });

  assert.equal(Array.from(generateLocalStashTitle("curl https://api.example.test/jobs --data '{}'")).length <= 32, true);
  assert.equal(updated.status, "saved");
  assert.equal(readRawItems(storage)[0].title, "华东六月报表恢复");
  assert.equal(loadLocalStash({ storage, now: 2_000 }).items[0].title, "华东六月报表恢复");
});

test("local stash: load removes expired items and keeps active items", () => {
  const storage = createMemoryStorage();
  seedStash(storage, [
    { id: "expired", title: "旧命令", command: "npm old", createdAt: 1_000, expiresAt: 1_999 },
    { id: "active", title: "测试命令", command: "npm test", createdAt: 1_000, expiresAt: 3_000 }
  ]);

  const result = loadLocalStash({ storage, now: 2_000 });

  assert.equal(result.removedExpired, 1);
  assert.deepEqual(result.items.map((item) => item.id), ["active"]);
  assert.deepEqual(readRawItems(storage).map((item) => item.id), ["active"]);
});

test("local stash: limit 20 blocks new items without overwriting existing stash", () => {
  const storage = createMemoryStorage();
  const items = Array.from({ length: LOCAL_STASH_LIMIT }, (_, index) => ({
    id: `item-${index}`,
    command: `echo ${index}`,
    createdAt: index,
    expiresAt: 99_999
  }));
  seedStash(storage, items);

  const result = addLocalStash("echo blocked", "1h", { storage, now: 5_000 });

  assert.equal(result.status, "limit_reached");
  assert.equal(result.items.length, LOCAL_STASH_LIMIT);
  assert.equal(readRawItems(storage).length, LOCAL_STASH_LIMIT);
  assert.equal(readRawItems(storage)[0].command, "echo 0");
  assert.ok(readRawItems(storage).every((item) => item.command !== "echo blocked"));
});

test("local stash: delete removes one item", () => {
  const storage = createMemoryStorage();
  seedStash(storage, [
    { id: "keep", command: "npm test", createdAt: 1_000, expiresAt: 9_000 },
    { id: "remove", command: "npm run build", createdAt: 1_000, expiresAt: 9_000 }
  ]);

  const result = deleteLocalStashItem("remove", { storage, now: 2_000 });

  assert.equal(result.removed, true);
  assert.deepEqual(result.items.map((item) => item.id), ["keep"]);
  assert.deepEqual(readRawItems(storage).map((item) => item.id), ["keep"]);
});

test("local stash: clear removes all stashed commands", () => {
  const storage = createMemoryStorage();
  seedStash(storage, [
    { id: "one", command: "git status", createdAt: 1_000, expiresAt: 9_000 }
  ]);

  const result = clearLocalStash({ storage });

  assert.equal(result, true);
  assert.equal(storage.getItem(LOCAL_STASH_KEY), null);
});
