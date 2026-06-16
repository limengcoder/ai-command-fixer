export const LOCAL_STASH_KEY = "ai-command-fixer.localStash.v1";
export const LOCAL_STASH_LIMIT = 20;
export const DEFAULT_STASH_TTL = "24h";

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
    command,
    createdAt,
    expiresAt
  };
}

function readState(storage) {
  if (!storage) return { available: false, items: [] };

  try {
    const raw = storage.getItem(LOCAL_STASH_KEY);
    if (!raw) return { available: true, items: [] };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items)
      ? parsed.items.map(normalizeItem).filter(Boolean).slice(0, LOCAL_STASH_LIMIT)
      : [];
    return { available: true, items };
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
  if (removedExpired > 0) writeState(storage, activeItems);

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
