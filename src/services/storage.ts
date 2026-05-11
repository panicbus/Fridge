function cloneJson<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

export interface Store<T extends { id: string }> {
  getAll(): T[];
  get(id: string): T | null;
  put(record: T): T;
  remove(id: string): boolean;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<T extends { id: string }>(key: string): Store<T> {
  const listeners = new Set<() => void>();

  function notify(): void {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore listener errors */
      }
    });
  }

  function readRaw(): T[] {
    try {
      const s = localStorage.getItem(key);
      if (!s) return [];
      const parsed = JSON.parse(s) as unknown;
      if (!Array.isArray(parsed)) return [];
      const out: T[] = [];
      for (const row of parsed) {
        if (
          row &&
          typeof row === 'object' &&
          typeof (row as T).id === 'string' &&
          (row as T).id.trim()
        ) {
          out.push(row as T);
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  function writeAll(items: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      /* quota / private mode */
    }
    notify();
  }

  return {
    getAll(): T[] {
      return readRaw().map((row) => cloneJson(row));
    },

    get(id: string): T | null {
      const row = readRaw().find((x) => x.id === id);
      return row ? cloneJson(row) : null;
    },

    put(record: T): T {
      const copy = cloneJson(record);
      const items = readRaw();
      const idx = items.findIndex((x) => x.id === copy.id);
      if (idx >= 0) items[idx] = copy;
      else items.push(copy);
      writeAll(items);
      return cloneJson(copy);
    },

    remove(id: string): boolean {
      const items = readRaw();
      const next = items.filter((x) => x.id !== id);
      if (next.length === items.length) return false;
      writeAll(next);
      return true;
    },

    clear(): void {
      try {
        localStorage.removeItem(key);
      } catch {
        /* */
      }
      notify();
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
