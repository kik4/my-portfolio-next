import { AFFINE_IDENTITY, AFFINE_ZERO } from "./affine";
import type {
  ChildGroup,
  FaceModel,
  HeadMesh,
  Part,
  PartViewKeyframe,
  RootGroup,
  Vec2,
  Vec3,
} from "./types";

export const buildDefaultHeadMesh = (): HeadMesh => {
  // The poles aren't pinched anymore: the apex (top) keeps a small ring so
  // the head is rounded rather than pointy, and the chin pulls forward so a
  // jaw juts out a bit.
  const ySamples = [1.0, 0.7, 0.4, 0.0, -0.4, -0.8, -1.1];
  const frontHalfXs = [0.2, 0.55, 0.7, 0.72, 0.65, 0.45, 0.15];
  const sideZFronts = [0.15, 0.55, 0.72, 0.78, 0.7, 0.5, 0.25];
  const sideZBacks = [-0.2, -0.7, -0.85, -0.85, -0.7, -0.45, -0.15];

  return {
    ySamples,
    frontHalfXs,
    sideZFronts,
    sideZBacks,
    catmullRomTension: 0.5,
    ringSegments: 32,
    fillColor: "#f4d4b3",
    outline: {
      enabled: true,
      color: "#1a1a1a",
      thickness: 0.02,
    },
  };
};

const buildDefaultPartViewKeyframe = (
  basePoints: Vec2[],
): PartViewKeyframe => ({
  id: "vk-default",
  yaw: 0,
  pitch: 0,
  shape: { basePoints, closed: true },
  affine: AFFINE_IDENTITY,
  alpha: 1,
  visible: true,
});

export const buildDefaultPart = (
  id: string,
  name: string,
  groupId: string,
): Part => ({
  id,
  name,
  groupId,
  layerIndex: 0,
  fillColor: "#202020",
  strokeColor: "#202020",
  strokeWidth: 0,
  viewKeyframes: [
    buildDefaultPartViewKeyframe([
      [-0.08, -0.04],
      [0.08, -0.04],
      [0.08, 0.04],
      [-0.08, 0.04],
    ]),
  ],
  animKeyframes: [],
  rbfSigmaAnim: 0.5,
});

export const buildDefaultRootGroup = (
  id: string,
  name: string,
  anchor: Vec3,
): RootGroup => ({
  id,
  name,
  parentId: null,
  visible: true,
  viewKeyframes: [
    {
      id: `gvk-${id}-default`,
      yaw: 0,
      pitch: 0,
      anchor,
      affine: AFFINE_IDENTITY,
      alpha: 1,
      visible: true,
    },
  ],
  animKeyframes: [],
  rbfSigmaAnim: 0.5,
});

export const buildDefaultChildGroup = (
  id: string,
  name: string,
  parentId: string,
): ChildGroup => ({
  id,
  name,
  parentId,
  visible: true,
  viewKeyframes: [
    {
      id: `gvk-${id}-default`,
      yaw: 0,
      pitch: 0,
      affine: AFFINE_IDENTITY,
      alpha: 1,
      visible: true,
    },
  ],
  animKeyframes: [],
  rbfSigmaAnim: 0.5,
});

export const buildDefaultFaceModel = (): FaceModel => {
  // One root group at the head's front, two eye parts and one mouth part
  // attached to it. Anchors live in 3D world space; the rest is pure 2D on
  // the billboard plane.
  const root = buildDefaultRootGroup("group-face", "face", [0, 0, 0.9]);

  const leftEye: Part = {
    ...buildDefaultPart("part-eye-left", "left eye", root.id),
    layerIndex: 10,
    viewKeyframes: [
      {
        id: "vk-default",
        yaw: 0,
        pitch: 0,
        shape: {
          basePoints: [
            [-0.04, -0.02],
            [0.04, -0.02],
            [0.04, 0.02],
            [-0.04, 0.02],
          ],
          closed: true,
        },
        // translate the eye to the upper-left of the billboard plane
        affine: [1, 0, 0, 1, -0.2, 0.12],
        alpha: 1,
        visible: true,
      },
    ],
  };

  const rightEye: Part = {
    ...leftEye,
    id: "part-eye-right",
    name: "right eye",
    viewKeyframes: [
      {
        ...leftEye.viewKeyframes[0],
        id: "vk-default",
        affine: [1, 0, 0, 1, 0.2, 0.12],
      },
    ],
  };

  const mouth: Part = {
    ...buildDefaultPart("part-mouth", "mouth", root.id),
    layerIndex: 5,
    fillColor: "#a04030",
    viewKeyframes: [
      {
        id: "vk-default",
        yaw: 0,
        pitch: 0,
        shape: {
          basePoints: [
            [-0.08, -0.015],
            [0.08, -0.015],
            [0.08, 0.015],
            [-0.08, 0.015],
          ],
          closed: true,
        },
        affine: [1, 0, 0, 1, 0, -0.25],
        alpha: 1,
        visible: true,
      },
    ],
  };

  return {
    version: 4,
    head: buildDefaultHeadMesh(),
    groups: [root],
    parts: [leftEye, rightEye, mouth],
    animParams: [],
    currentAnimParams: {},
  };
};

// Surface AFFINE_ZERO for callers building empty anim deltas.
export { AFFINE_ZERO };
