// Lightweight localStorage-backed wishlist with reactive subscriptions.
import { useEffect, useReducer } from "react";

const KEY = "heis-wishlist";
const listeners = new Set<() => void>();

function read(): Set<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return new Set();
  }
}

let ids = typeof window !== "undefined" ? read() : new Set<number>();

function persist() {
  localStorage.setItem(KEY, JSON.stringify(Array.from(ids)));
  listeners.forEach(l => l());
}

export function toggleWishlist(id: number) {
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  persist();
}

export function wishlistCount() {
  return ids.size;
}

/** Reactive hook: re-renders when this id's wishlist state changes. */
export function useWishlist(id: number) {
  const [, force] = useReducer(x => x + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  return { wished: ids.has(id), toggle: () => toggleWishlist(id) };
}

/** Reactive hook: the full list of wishlisted product ids. */
export function useWishlistIds(): number[] {
  const [, force] = useReducer(x => x + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  return Array.from(ids);
}
