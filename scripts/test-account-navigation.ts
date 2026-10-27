import assert from "node:assert/strict";
import { rememberVisitedAccount } from "../src/hooks/use-last-visited-account";
import {
  setAccountTabBehavior,
} from "../src/hooks/use-account-tab-behavior";
import {
  openAccountDrawer,
  setAccountDrawerIndex,
  closeAccountDrawer,
  useAccountDrawerState,
} from "../src/hooks/use-account-drawer";

// Setup minimal window.localStorage mock
const storage = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

// 1. Test tab behavior persistence
setAccountTabBehavior("stay-on-page");
assert.equal(storage.get("account-tab-behavior"), "stay-on-page");

setAccountTabBehavior("switch-tab");
assert.equal(storage.get("account-tab-behavior"), "switch-tab");

// 2. Test single account drawer open and visited account tracking
openAccountDrawer("creator_one");
assert.equal(storage.get("last-visited-account"), "creator_one");

// 3. Test bulk account drawer open and cycling
openAccountDrawer(["alpha", "beta", "gamma"], 0);
assert.equal(storage.get("last-visited-account"), "alpha");

setAccountDrawerIndex(1);
assert.equal(storage.get("last-visited-account"), "beta");

setAccountDrawerIndex(2);
assert.equal(storage.get("last-visited-account"), "gamma");

// Out-of-bounds clamping
setAccountDrawerIndex(99);
assert.equal(storage.get("last-visited-account"), "gamma");

closeAccountDrawer();
rememberVisitedAccount("manual_visit");
assert.equal(storage.get("last-visited-account"), "manual_visit");
assert.equal(typeof useAccountDrawerState, "function");

console.log("account-navigation: all checks passed");
