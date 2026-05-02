import type {
  FaceModel,
  HeadMesh,
  Part,
  PartGroup,
  ViewKeyframe,
} from "./types";

export const buildDefaultHeadMesh = (): HeadMesh => {
  // 7 latitude samples from apex (Y=1) down to chin (Y=-1.1).
  // halfX gives the front silhouette (right half-width).
  // zFront / zBack give the side silhouette (front face / back of skull).
  // Apex and chin collapse to a point: halfX = zFront = zBack = 0.
  const ySamples = [1.0, 0.7, 0.4, 0.0, -0.4, -0.8, -1.1];
  const frontHalfXs = [0.0, 0.55, 0.7, 0.72, 0.65, 0.45, 0.0];
  const sideZFronts = [0.0, 0.55, 0.72, 0.78, 0.7, 0.5, 0.0];
  const sideZBacks = [0.0, -0.7, -0.85, -0.85, -0.7, -0.45, 0.0];

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

const buildDefaultViewKeyframe = (): ViewKeyframe => ({
  id: "vk-default",
  yaw: 0,
  pitch: 0,
  shape: {
    basePoints: [
      [-0.08, -0.04],
      [0.08, -0.04],
      [0.08, 0.04],
      [-0.08, 0.04],
    ],
    closed: true,
  },
  placement: {
    anchor: [0, 0, 1], // facing forward
    offsetNormal: 0.005,
    offsetTangent: [0, 0],
    rotationOffset: [0, 0, 0],
    scale: [1, 1],
  },
  visible: true,
  alpha: 1,
});

export const buildDefaultGroup = (
  id: string,
  name: string,
  parentId?: string,
): PartGroup => ({
  id,
  name,
  visible: true,
  parentId,
  transformDelta: {
    anchorDelta: [0, 0, 0],
    rotationOffsetDelta: [0, 0, 0],
    scaleDelta: [0, 0],
  },
});

export const buildDefaultPart = (id: string, name: string): Part => ({
  id,
  name,
  layerIndex: 0,
  fillColor: "#202020",
  strokeColor: "#202020",
  strokeWidth: 0,
  viewKeyframes: [buildDefaultViewKeyframe()],
  animKeyframes: [],
  rbfSigmaView: 30,
  rbfSigmaAnim: 0.5,
});

export const buildDefaultFaceModel = (): FaceModel => {
  // A small starter face: two eye placeholders + a mouth.
  const leftEye = buildDefaultPart("part-eye-left", "left eye");
  leftEye.layerIndex = 10;
  leftEye.viewKeyframes[0] = {
    ...leftEye.viewKeyframes[0],
    placement: {
      ...leftEye.viewKeyframes[0].placement,
      anchor: normalize([-0.35, 0.15, 0.93]),
    },
  };

  const rightEye = buildDefaultPart("part-eye-right", "right eye");
  rightEye.layerIndex = 10;
  rightEye.viewKeyframes[0] = {
    ...rightEye.viewKeyframes[0],
    placement: {
      ...rightEye.viewKeyframes[0].placement,
      anchor: normalize([0.35, 0.15, 0.93]),
    },
  };

  const mouth = buildDefaultPart("part-mouth", "mouth");
  mouth.layerIndex = 5;
  mouth.fillColor = "#a04030";
  mouth.viewKeyframes[0] = {
    ...mouth.viewKeyframes[0],
    shape: {
      basePoints: [
        [-0.12, -0.02],
        [0.12, -0.02],
        [0.12, 0.02],
        [-0.12, 0.02],
      ],
      closed: true,
    },
    placement: {
      ...mouth.viewKeyframes[0].placement,
      anchor: normalize([0, -0.45, 0.9]),
    },
  };

  return {
    version: 3,
    head: buildDefaultHeadMesh(),
    parts: [leftEye, rightEye, mouth],
    groups: [],
    animParams: [],
    currentAnimParams: {},
  };
};

const normalize = (v: [number, number, number]): [number, number, number] => {
  const [x, y, z] = v;
  const len = Math.hypot(x, y, z);
  if (len === 0) return [0, 0, 1];
  return [x / len, y / len, z / len];
};
