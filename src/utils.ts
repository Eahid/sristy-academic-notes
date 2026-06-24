const inMemoryStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn("Storage access blocked by browser environment safety restrictions, falling back to in-memory store for key:", key, e);
    }
    return inMemoryStorage[key] || null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn("Storage write blocked by browser environment safety restrictions, falling back to in-memory store for key:", key, e);
    }
    inMemoryStorage[key] = value;
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn("Storage remove blocked by browser environment safety restrictions, falling back to in-memory store for key:", key, e);
    }
    delete inMemoryStorage[key];
  }
};
