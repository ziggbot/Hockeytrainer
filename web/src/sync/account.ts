import { useSyncExternalStore } from "react";
import { SPORT } from "../sport";
import { readItem, removeItem, writeItem } from "../store/storage";

// The signed-in coach. Kept apart from the app state so a backup file never
// carries the login token.

export interface Account {
  token: string;
  user: { id: string; name: string; email: string };
}

const KEY = `${SPORT.storagePrefix}.account`;
const listeners = new Set<() => void>();

function load(): Account | null {
  try {
    const raw = readItem(KEY);
    const a = raw ? (JSON.parse(raw) as Account) : null;
    return a && typeof a.token === "string" && a.user?.id ? a : null;
  } catch {
    return null;
  }
}

let account: Account | null = load();

export function getAccount(): Account | null {
  return account;
}

export function setAccount(next: Account | null) {
  account = next;
  if (next) writeItem(KEY, JSON.stringify(next));
  else removeItem(KEY);
  listeners.forEach((l) => l());
}

export function useAccount(): Account | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getAccount,
    getAccount
  );
}
