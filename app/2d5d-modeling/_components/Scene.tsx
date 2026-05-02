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
}: Props) => {
  const headMeshRef = useRef<THREE.Mesh | null>(null);
  const [headMesh, setHeadMesh] = useState<THREE.Mesh | null>(null);
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

  return (
    <Canvas
      camera={{
        position: initialCameraPos,
        fov: cameraFov,
        near: 0.01,
        far: 100,
      }}
      shadows={false}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 4]} intensity={0.8} />

      <HeadMesh
        head={model.head}
        ref={(mesh) => {
          headMeshRef.current = mesh;
          if (mesh !== headMesh) setHeadMesh(mesh);
        }}
      />
      <Parts
        parts={model.parts}
        groups={model.groups}
        headMesh={headMesh}
        yaw={yaw}
        pitch={pitch}
        animParams={model.currentAnimParams}
      />

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
