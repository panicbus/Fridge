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

export interface CappedStoreOptions<T extends { id: string }> {
  maxSize: number;
  /** Larger values = newer; used for FIFO eviction (lowest evicted first). */
  sortField: keyof T;
}

export function createCappedStore<T extends { id: string }>(
  key: string,
  options: CappedStoreOptions<T>,
): Store<T> {
  const listeners = new Set<() => void>();
  const { maxSize, sortField } = options;

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

  function evictOldest(items: T[]): T[] {
    if (items.length <= maxSize) return items;
    const need = items.length - maxSize;
    const ranked = [...items].sort((a, b) => {
      const av = Number(a[sortField]);
      const bv = Number(b[sortField]);
      return av - bv;
    });
    const evictIds = new Set(ranked.slice(0, need).map((x) => x.id));
    return items.filter((x) => !evictIds.has(x.id));
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
      let items = readRaw();
      const idx = items.findIndex((x) => x.id === copy.id);
      if (idx >= 0) items[idx] = copy;
      else items.push(copy);
      items = evictOldest(items);
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
