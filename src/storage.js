const STORAGE_KEY = "ai-command-fixer:prefs:v2";

export const DEFAULT_PREFERENCES = Object.freeze({
  showDiff: false,
  showOriginal: false,
  customPrefixes: []
});

function getLocalStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const testKey = "__acf_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizePreferences(value) {
  const source = value && typeof value === "object" ? value : {};
  const customPrefixes = Array.isArray(source.customPrefixes)
    ? source.customPrefixes.map(String).map((item) => item.trim()).filter(Boolean)
    : [];

  return {
    showDiff: typeof source.showDiff === "boolean" ? source.showDiff : DEFAULT_PREFERENCES.showDiff,
    showOriginal: typeof source.showOriginal === "boolean" ? source.showOriginal : DEFAULT_PREFERENCES.showOriginal,
    customPrefixes
  };
}

export function loadPreferences() {
  const storage = getLocalStorage();
  if (!storage) return { ...DEFAULT_PREFERENCES };

  try {
    const raw = storage.getItem(STORAGE_KEY);
    return normalizePreferences(raw ? JSON.parse(raw) : DEFAULT_PREFERENCES);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences) {
  const storage = getLocalStorage();
  if (!storage) return false;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizePreferences(preferences)));
    return true;
  } catch {
    return false;
  }
}

export function clearPreferences() {
  const storage = getLocalStorage();
  if (!storage) return false;

  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
