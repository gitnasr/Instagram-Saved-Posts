"use client";

import { createLocalStorageStore } from "@/lib/local-storage-store";

export type AccountTabBehavior = "switch-tab" | "stay-on-page";

export const DEFAULT_TAB_BEHAVIOR: AccountTabBehavior = "switch-tab";

const store = createLocalStorageStore<AccountTabBehavior>(
  "account-tab-behavior",
  (raw) => (raw === "stay-on-page" || raw === "switch-tab" ? raw : DEFAULT_TAB_BEHAVIOR),
  DEFAULT_TAB_BEHAVIOR
);

export function setAccountTabBehavior(behavior: AccountTabBehavior) {
  store.set(behavior);
}

export function useAccountTabBehavior(): [
  AccountTabBehavior,
  (behavior: AccountTabBehavior) => void,
] {
  return store.useStore();
}
