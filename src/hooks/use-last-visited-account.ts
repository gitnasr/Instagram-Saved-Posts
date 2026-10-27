"use client";

import { createLocalStorageStore } from "@/lib/local-storage-store";

const store = createLocalStorageStore<string>(
  "last-visited-account",
  (raw) => raw ?? "",
  ""
);

export function rememberVisitedAccount(username: string) {
  store.set(username);
}

/** Username of the last account the user opened, or null. */
export function useLastVisitedAccount(): string | null {
  const [value] = store.useStore();
  return value || null;
}
