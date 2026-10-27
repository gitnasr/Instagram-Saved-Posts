"use client";

import { useSyncExternalStore } from "react";
import { rememberVisitedAccount } from "@/hooks/use-last-visited-account";

export interface AccountDrawerState {
  isOpen: boolean;
  usernames: string[];
  activeIndex: number;
}

const CLOSED_STATE: AccountDrawerState = {
  isOpen: false,
  usernames: [],
  activeIndex: 0,
};

let currentState: AccountDrawerState = CLOSED_STATE;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AccountDrawerState {
  return currentState;
}

function getServerSnapshot(): AccountDrawerState {
  return CLOSED_STATE;
}

export function openAccountDrawer(usernames: string | string[], startIndex = 0) {
  const list = Array.isArray(usernames) ? usernames : [usernames];
  if (list.length === 0) return;
  const clampedIndex = Math.max(0, Math.min(startIndex, list.length - 1));
  rememberVisitedAccount(list[clampedIndex]);
  currentState = {
    isOpen: true,
    usernames: list,
    activeIndex: clampedIndex,
  };
  notify();
}

export function setAccountDrawerIndex(index: number) {
  if (!currentState.isOpen) return;
  const clamped = Math.max(
    0,
    Math.min(index, currentState.usernames.length - 1)
  );
  if (clamped === currentState.activeIndex) return;
  rememberVisitedAccount(currentState.usernames[clamped]);
  currentState = {
    ...currentState,
    activeIndex: clamped,
  };
  notify();
}

export function closeAccountDrawer() {
  if (!currentState.isOpen) return;
  currentState = CLOSED_STATE;
  notify();
}

export function useAccountDrawerState(): AccountDrawerState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
