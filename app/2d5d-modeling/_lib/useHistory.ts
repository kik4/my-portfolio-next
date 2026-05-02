import { useCallback, useRef, useState } from "react";

// Generic linear-history hook: every commit pushes the new value onto a stack
// and discards any redoable forward states. Replace allows non-history-tracked
// updates (e.g. hydration from localStorage on mount).
//
// The hook intentionally treats every commit as a single undo step. There is
// no implicit debouncing — callers that fire many setModel calls during a
// drag should batch externally.
export interface History<T> {
  state: T;
  // Push a new state and discard any redo history.
  commit: (next: T | ((prev: T) => T)) => void;
  // Replace state without affecting history. Use for hydration / external loads.
  replace: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const HISTORY_LIMIT = 200;

export const useHistory = <T>(initial: T): History<T> => {
  // past[past.length - 1] is the current state; past[0] is the oldest reachable
  // state via undo. future is empty unless we are mid-redo chain.
  const [past, setPast] = useState<T[]>(() => [initial]);
  const [future, setFuture] = useState<T[]>([]);
  // Mirror current state in a ref so commit/redo callbacks see the latest
  // value synchronously without depending on stale closures.
  const pastRef = useRef(past);
  pastRef.current = past;
  const futureRef = useRef(future);
  futureRef.current = future;

  const state = past[past.length - 1];

  const commit = useCallback((next: T | ((prev: T) => T)) => {
    const current = pastRef.current[pastRef.current.length - 1];
    const resolved =
      typeof next === "function" ? (next as (prev: T) => T)(current) : next;
    if (resolved === current) return;
    const trimmed =
      pastRef.current.length >= HISTORY_LIMIT
        ? pastRef.current.slice(-HISTORY_LIMIT + 1)
        : pastRef.current;
    setPast([...trimmed, resolved]);
    setFuture([]);
  }, []);

  const replace = useCallback((next: T) => {
    setPast([next]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    if (pastRef.current.length <= 1) return;
    const next = pastRef.current.slice(0, -1);
    const popped = pastRef.current[pastRef.current.length - 1];
    setPast(next);
    setFuture([popped, ...futureRef.current]);
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const [head, ...rest] = futureRef.current;
    setPast([...pastRef.current, head]);
    setFuture(rest);
  }, []);

  return {
    state,
    commit,
    replace,
    undo,
    redo,
    canUndo: past.length > 1,
    canRedo: future.length > 0,
  };
};
