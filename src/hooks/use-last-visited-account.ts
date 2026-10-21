"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "last-visited-account";

function readValue(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage unavailable — highlight just won't persist
  }
}

const listeners = new Set<() => void>();

// Fires in OTHER tabs when localStorage changes, so highlights stay in sync.
const handleStorage = (event: StorageEvent) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    listeners.forEach((listener) => listener());
  }
};

function subscribe(listener: () => void): () => void {
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

function getSnapshot(): string | null {
  return readValue();
}

// Server render: unknown yet, no highlight — applied after hydration.
function getServerSnapshot(): string | null {
  return null;
}

export function rememberVisitedAccount(username: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, username);
  } catch {
    // private mode etc. — keep navigating, the highlight just won't persist
  }
  listeners.forEach((listener) => listener());
}

/** Username of the last profile the user opened, or null. */
export function useLastVisitedAccount(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
