import { buildDefaultFaceModel } from "./defaultModel";
import type { FaceModel } from "./types";

export const LOCAL_STORAGE_KEY = "2d5d-modeling-data-v4";

export const serializeFaceModel = (model: FaceModel): string =>
  JSON.stringify(model, null, 2);

// Tolerant parse. Anything malformed (or v3 and older) falls back to the
// default model so the UI never crashes from corrupted localStorage.
export const parseFaceModel = (raw: string): FaceModel => {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.version === 4 &&
      parsed.head &&
      Array.isArray(parsed.parts) &&
      Array.isArray(parsed.groups)
    ) {
      return parsed as FaceModel;
    }
  } catch {
    // fall through to default
  }
  return buildDefaultFaceModel();
};

export const loadFaceModelFromLocalStorage = (): FaceModel | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return null;
  return parseFaceModel(raw);
};

export const saveFaceModelToLocalStorage = (model: FaceModel): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, serializeFaceModel(model));
};
