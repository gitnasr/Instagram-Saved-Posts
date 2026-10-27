"use client";

import { useSyncExternalStore } from "react";

export function createLocalStorageStore<T extends string>(
  key: string,
  parse: (raw: string | null) => T,
  serverValue: T
) {
  function readValue(): T {
    if (typeof window === "undefined") {
      return serverValue;
    }
    try {
      return parse(window.localStorage.getItem(key));
    } catch {
      return serverValue;
    }
  }

  const listeners = new Set<() => void>();

  const handleStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      listeners.forEach((listener) => listener());
    }
  };

  function subscribe(listener: () => void): () => void {
    if (typeof window === "undefined") {
      return () => {};
    }
    if (listeners.size === 0) {
      window.addEventListener("storage", handleStorage);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        window.removeEventListener("storage", handleStorage);
      }
    };
  }

  function setValue(next: T) {
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // storage unavailable (e.g. private mode)
    }
    listeners.forEach((listener) => listener());
  }

  function useStore(): [T, (next: T) => void] {
    const value = useSyncExternalStore(
      subscribe,
      readValue,
      () => serverValue
    );
    return [value, setValue];
  }

  return {
    get: readValue,
    set: setValue,
    subscribe,
    useStore,
  };
}
