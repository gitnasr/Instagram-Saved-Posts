"use client";

import { useSyncExternalStore } from "react";

export type AccountTabBehavior = "switch-tab" | "stay-on-page";

const STORAGE_KEY = "account-tab-behavior";
export const DEFAULT_TAB_BEHAVIOR: AccountTabBehavior = "switch-tab";

function readValue(): AccountTabBehavior {
  if (typeof window === "undefined") {
    return DEFAULT_TAB_BEHAVIOR;
  }
  try {
    const val = window.localStorage.getItem(STORAGE_KEY);
    if (val === "stay-on-page" || val === "switch-tab") {
      return val;
    }
    return DEFAULT_TAB_BEHAVIOR;
  } catch {
    return DEFAULT_TAB_BEHAVIOR;
  }
}

const listeners = new Set<() => void>();

const handleStorage = (event: StorageEvent) => {
  if (event.key === STORAGE_KEY || event.key === null) {
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

function getSnapshot(): AccountTabBehavior {
  return readValue();
}

function getServerSnapshot(): AccountTabBehavior {
  return DEFAULT_TAB_BEHAVIOR;
}

export function setAccountTabBehavior(behavior: AccountTabBehavior) {
  try {
    window.localStorage.setItem(STORAGE_KEY, behavior);
  } catch {
    // storage unavailable
  }
  listeners.forEach((listener) => listener());
}

export function useAccountTabBehavior(): [
  AccountTabBehavior,
  (behavior: AccountTabBehavior) => void,
] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [value, setAccountTabBehavior];
}

/**
 * Opens an account in a new tab adhering to the user's tab behavior preference.
 * If behavior is 'stay-on-page', attempts to retain focus on the opener window.
 */
export function openAccountTab(
  username: string,
  behavior: AccountTabBehavior = readValue()
): Window | null {
  const url = `/accounts/${username}`;
  try {
    const win = window.open(url, "_blank");
    if (win && behavior === "stay-on-page") {
      try {
        win.blur();
        window.focus();
      } catch {
        // Ignored if browser restricts focus/blur
      }
    }
    return win;
  } catch {
    return null;
  }
}
