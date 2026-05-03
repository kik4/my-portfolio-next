"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { FaceModel } from "../_lib/types";
import { HeadMesh } from "./HeadMesh";
import { Parts } from "./Parts";

interface Props {
  model: FaceModel;
  showAxes: boolean;
  showGrid: boolean;
  // Called every frame with the current camera (yaw, pitch) in degrees in
  // interactive mode. Ignored in fixed mode.
  onCameraChange?: (yaw: number, pitch: number) => void;
  // Fixed view: when set, the scene renders without OrbitControls and parks
  // the camera at the given (yaw, pitch). Used by mini multi-views.
  fixedView?: { yaw: number; pitch: number };
  // Camera distance (radius from origin). Defaults to 3.
  cameraDistance?: number;
  // Field of view in degrees. Defaults to 35.
  cameraFov?: number;
  // Render-prop hook that lets the parent insert extra scene-graph nodes
  // (e.g. an anchor gizmo on the main view). Receives current yaw/pitch so
  // the inserted node can react to the camera.
  renderOverlay?: (ctx: { yaw: number; pitch: number }) => React.ReactNode;
  // When this object's identity changes, the interactive camera teleports to
  // the given (yaw, pitch). Use a fresh object literal each request so the
  // hook fires even if the angles repeat. Ignored in fixed mode.
  snapRequest?: { yaw: number; pitch: number };
}

const DEFAULT_DISTANCE = 3;
const DEFAULT_FOV = 35;

export const Scene = ({
  model,
  showAxes,
  showGrid,
  onCameraChange,
  fixedView,
  cameraDistance = DEFAULT_DISTANCE,
  cameraFov = DEFAULT_FOV,
  renderOverlay,
  snapRequest,
}: Props) => {
  // In interactive mode the camera tracker drives these. In fixed mode they
  // come straight from props (no per-frame update needed).
  const [yaw, setYaw] = useState(fixedView?.yaw ?? 0);
  const [pitch, setPitch] = useState(fixedView?.pitch ?? 0);

  // When fixedView is supplied, keep yaw/pitch in sync with it.
  useEffect(() => {
    if (fixedView) {
      setYaw(fixedView.yaw);
      setPitch(fixedView.pitch);
    }
  }, [fixedView]);

  const initialCameraPos = computeCameraPosition(
    fixedView?.yaw ?? 0,
    fixedView?.pitch ?? 0,
    cameraDistance,
  );

  // Match the orthographic frustum to what the previous perspective camera
  // showed at the origin: half-height = distance * tan(fov/2) world units.
  const halfHeight = cameraDistance * Math.tan((cameraFov * Math.PI) / 360);

  return (
    <Canvas
      orthographic
      camera={{
        position: initialCameraPos,
        near: 0.01,
        far: 100,
      }}
      shadows={false}
    >
      <OrthoZoom halfHeight={halfHeight} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 4]} intensity={0.8} />

      <HeadMesh head={model.head} />
      <Parts
        parts={model.parts}
        groups={model.groups}
        yaw={yaw}
        pitch={pitch}
        animParams={model.currentAnimParams}
      />
      {renderOverlay?.({ yaw, pitch })}

      {showAxes && <axesHelper args={[1.5]} />}
      {showGrid && <gridHelper args={[4, 8]} />}

      {fixedView ? (
        <FixedCamera
          yaw={fixedView.yaw}
          pitch={fixedView.pitch}
          distance={cameraDistance}
        />
      ) : (
        <>
          <OrbitControls makeDefault enableDamping />
          <CameraTracker
            onChange={(y, p) => {
              setYaw(y);
              setPitch(p);
              onCameraChange?.(y, p);
            }}
          />
          {snapRequest && (
            <CameraSnap request={snapRequest} distance={cameraDistance} />
          )}
        </>
      )}
    </Canvas>
  );
};

// Convert (yaw, pitch) in degrees + radius to a Cartesian camera position.
// yaw rotates around +Y from +Z toward +X; pitch is elevation above the equator.
const computeCameraPosition = (
  yawDeg: number,
  pitchDeg: number,
  distance: number,
): [number, number, number] => {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const cp = Math.cos(pitch);
  return [
    distance * cp * Math.sin(yaw),
    distance * Math.sin(pitch),
    distance * cp * Math.cos(yaw),
  ];
};

// Teleports the OrbitControls camera to the requested (yaw, pitch) on every
// new request object. Uses object identity, not value equality, so the same
// (yaw, pitch) can be requested twice in a row by passing a fresh literal.
const CameraSnap = ({
  request,
  distance,
}: {
  request: { yaw: number; pitch: number };
  distance: number;
}) => {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void } | null;
  };
  useEffect(() => {
    const [x, y, z] = computeCameraPosition(
      request.yaw,
      request.pitch,
      distance,
    );
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    // OrbitControls keeps its own internal spherical state; nudging
    // controls.update() resyncs that to the new camera position.
    controls?.update();
  }, [camera, controls, request, distance]);
  return null;
};

// Drives the orthographic camera's `zoom` so that `halfHeight` world units
// fill half the canvas height. r3f's default ortho camera uses pixel-unit
// frustum bounds (left=-w/2, right=w/2, top=h/2, bottom=-h/2), so the world
// span shown vertically is `canvasHeightPx / zoom`. Solving for zoom that
// maps `2 * halfHeight` world units onto the canvas height gives the formula
// below, and we re-run it on every resize.
const OrthoZoom = ({ halfHeight }: { halfHeight: number }) => {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
    camera.zoom = size.height / (2 * halfHeight);
    camera.updateProjectionMatrix();
  }, [camera, size.height, halfHeight]);
  return null;
};

// Parks the camera at the given (yaw, pitch, distance) and points it at the
// origin. Reapplies on every prop change so HMR-style edits update live.
const FixedCamera = ({
  yaw,
  pitch,
  distance,
}: {
  yaw: number;
  pitch: number;
  distance: number;
}) => {
  const { camera } = useThree();
  useEffect(() => {
    const [x, y, z] = computeCameraPosition(yaw, pitch, distance);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, yaw, pitch, distance]);
  return null;
};

// Reads the camera's spherical position relative to the origin every frame and
// reports it as (yaw, pitch) in degrees. yaw rotates around +Y; pitch is the
// elevation above the horizon.
const CameraTracker = ({
  onChange,
}: {
  onChange: (yaw: number, pitch: number) => void;
}) => {
  const lastYaw = useRef<number>(Number.NaN);
  const lastPitch = useRef<number>(Number.NaN);
  useFrame(({ camera }) => {
    const dir = camera.position.clone().normalize();
    const yawRad = Math.atan2(dir.x, dir.z);
    const pitchRad = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    const yawDeg = (yawRad * 180) / Math.PI;
    const pitchDeg = (pitchRad * 180) / Math.PI;
    if (
      Math.abs(yawDeg - lastYaw.current) < 0.05 &&
      Math.abs(pitchDeg - lastPitch.current) < 0.05
    ) {
      return;
    }
    lastYaw.current = yawDeg;
    lastPitch.current = pitchDeg;
    onChange(yawDeg, pitchDeg);
  });
  return null;
};
