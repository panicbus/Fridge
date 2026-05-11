import { useEffect, useState } from 'react';
import type { Store } from '../services/storage';

export function useStore<T extends { id: string }>(store: Store<T>): T[] {
  const [items, setItems] = useState<T[]>(() => store.getAll());

  useEffect(() => {
    setItems(store.getAll());
    return store.subscribe(() => {
      setItems(store.getAll());
    });
  }, [store]);

  return items;
}
