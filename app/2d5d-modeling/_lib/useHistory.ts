import { useCallback, useRef, useState } from "react";

export interface History<T> {
  state: T;
  // Push a new state and discard any redo history. No-op if the next value
  // is referentially equal to the current state.
  commit: (next: T | ((prev: T) => T)) => void;
  // Replace state without affecting history. Use for hydration / external loads.
  replace: (next: T) => void;
  // Mutate the current head without pushing a new entry. Used for live drag
  // previews so a single drag doesn't spam the history; the caller should
  // commit on pointer up to make the change undoable.
  preview: (next: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const HISTORY_LIMIT = 200;

export const useHistory = <T>(initial: T): History<T> => {
  // past[past.length - 1] is the current state. future is empty unless mid-redo.
  const [past, setPast] = useState<T[]>(() => [initial]);
  const [future, setFuture] = useState<T[]>([]);
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

  // Replace just the head without changing history depth. Future is cleared
  // because a preview implies the user is editing forward from the head.
  const preview = useCallback((next: T | ((prev: T) => T)) => {
    const current = pastRef.current[pastRef.current.length - 1];
    const resolved =
      typeof next === "function" ? (next as (prev: T) => T)(current) : next;
    if (resolved === current) return;
    setPast([...pastRef.current.slice(0, -1), resolved]);
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
    preview,
    undo,
    redo,
    canUndo: past.length > 1,
    canRedo: future.length > 0,
  };
};
