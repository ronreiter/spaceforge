import '@testing-library/jest-dom/vitest';

// Vitest's happy-dom environment exposes `localStorage` as a plain `{}` in
// this version combo — no getItem/setItem/clear. Tests and the app code both
// assume a real Storage interface, so we install a minimal working shim on
// both `localStorage` and `sessionStorage` before any test runs.
function makeStorage(): Storage {
  const data = new Map<string, string>();
  const api: Storage = {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? (data.get(key) as string) : null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
  };
  return api;
}

function installStorage(name: 'localStorage' | 'sessionStorage'): void {
  const g = globalThis as unknown as Record<string, unknown>;
  const current = g[name] as Partial<Storage> | undefined;
  if (current && typeof current.clear === 'function' && typeof current.getItem === 'function') {
    return;
  }
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: makeStorage(),
  });
}

installStorage('localStorage');
installStorage('sessionStorage');
