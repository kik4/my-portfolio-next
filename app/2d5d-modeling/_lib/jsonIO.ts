import { buildDefaultModel } from "./defaultModel";
import type { Model } from "./types";

export const LOCAL_STORAGE_KEY = "2d5d-modeling-data-v5";

export const serializeModel = (model: Model): string =>
  JSON.stringify(model, null, 2);

// Tolerant parse. Anything malformed (or older versions) falls back to the
// default model so the UI never crashes from corrupted localStorage.
export const parseModel = (raw: string): Model => {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.version === 5 &&
      Array.isArray(parsed.groups) &&
      Array.isArray(parsed.parts)
    ) {
      return parsed as Model;
    }
  } catch {
    // fall through to default
  }
  return buildDefaultModel();
};

export const loadModelFromLocalStorage = (): Model | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return null;
  return parseModel(raw);
};

export const saveModelToLocalStorage = (model: Model): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, serializeModel(model));
};
