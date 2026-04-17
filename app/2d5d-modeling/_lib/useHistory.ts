import { useCallback, useEffect, useRef, useState } from "react";

// Deep-compare two snapshots by JSON serialization. Fast enough at this scale
// and avoids structural-equality edge cases across heterogeneous shapes.
function snapshotEquals<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface History<T> {
  commit: (snapshot: T) => void;
  undo: () => T | null;
  redo: () => T | null;
  reset: (snapshot: T) => void;
  canUndo: boolean;
  canRedo: boolean;
}

// Bounded stack of past/future snapshots. The current snapshot lives outside
// (in caller state); this hook only tracks history for undo/redo navigation.
const MAX_HISTORY = 100;

export function useHistory<T>(initial: T): History<T> {
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const currentRef = useRef<T>(initial);
  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);

  const commit = useCallback(
    (snapshot: T) => {
      if (snapshotEquals(currentRef.current, snapshot)) return;
      pastRef.current.push(currentRef.current);
      if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      futureRef.current = [];
      currentRef.current = snapshot;
      rerender();
    },
    [rerender],
  );

  const undo = useCallback((): T | null => {
    const past = pastRef.current;
    if (past.length === 0) return null;
    const prev = past.pop();
    if (prev === undefined) return null;
    futureRef.current.push(currentRef.current);
    currentRef.current = prev;
    rerender();
    return prev;
  }, [rerender]);

  const redo = useCallback((): T | null => {
    const future = futureRef.current;
    if (future.length === 0) return null;
    const next = future.pop();
    if (next === undefined) return null;
    pastRef.current.push(currentRef.current);
    currentRef.current = next;
    rerender();
    return next;
  }, [rerender]);

  const reset = useCallback(
    (snapshot: T) => {
      pastRef.current = [];
      futureRef.current = [];
      currentRef.current = snapshot;
      rerender();
    },
    [rerender],
  );

  return {
    commit,
    undo,
    redo,
    reset,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}

// Watches a snapshot value and commits it to history when it stops changing
// for `delay` ms. Suppresses commits while `suppressRef.current` is true,
// which the caller toggles during undo/redo to avoid re-capturing restored state.
export function useDebouncedCommit<T>(
  snapshot: T,
  commit: (s: T) => void,
  delay: number,
  suppressRef: React.MutableRefObject<boolean>,
) {
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      commit(snapshot);
      timerRef.current = null;
    }, delay);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [snapshot, commit, delay, suppressRef]);
}
