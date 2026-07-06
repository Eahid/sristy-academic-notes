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

export function forceClearSystemCache(): void {
  try {
    // 1. Clear LocalStorage
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  } catch (e) {
    console.error("Failed to clear localStorage:", e);
  }

  try {
    // 2. Clear SessionStorage
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.clear();
    }
  } catch (e) {
    console.error("Failed to clear sessionStorage:", e);
  }

  try {
    // 3. Clear Cookies
    if (typeof document !== "undefined") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
      }
    }
  } catch (e) {
    console.error("Failed to clear cookies:", e);
  }

  try {
    // 4. Clear service worker registrations to prevent offline-first stale load caches
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
  } catch (e) {
    console.error("Failed to unregister service workers:", e);
  }

  // 5. Force clean reload bypassing caches with a dynamic salt parameter
  setTimeout(() => {
    window.location.href = window.location.origin + window.location.pathname + "?update=" + Date.now();
  }, 300);
}
