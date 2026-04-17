"use client";

import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { FaceModel, YawPitch } from "../_lib/types";
import { FaceMesh } from "./FaceMesh";

interface SceneProps {
  model: FaceModel;
  angle: YawPitch;
  angleSource: "slider" | "controls";
  faceOpacity: number;
  zoom: number;
  selectedPolygonId?: string;
  showAxes?: boolean;
  onAngleChange: (yaw: number, pitch: number) => void;
  onZoomChange: (zoom: number) => void;
}

const CAMERA_DISTANCE = 1;

function CameraSync({
  angle,
  controlsRef,
  enabled,
}: {
  angle: YawPitch;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  enabled: boolean;
}) {
  const { camera } = useThree();
  const prevAngle = useRef(angle);

  useEffect(() => {
    if (!enabled) {
      prevAngle.current = angle;
      return;
    }
    if (prevAngle.current === angle) return;
    prevAngle.current = angle;

    const hRad = (angle.yaw * Math.PI) / 180;
    const vRad = (angle.pitch * Math.PI) / 180;
    camera.position.set(
      Math.sin(hRad) * Math.cos(vRad) * CAMERA_DISTANCE,
      Math.sin(vRad) * CAMERA_DISTANCE,
      Math.cos(hRad) * Math.cos(vRad) * CAMERA_DISTANCE,
    );
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controlsRef.current?.update();
  }, [angle, camera, controlsRef, enabled]);

  return null;
}

export function Scene({
  model,
  angle,
  angleSource,
  faceOpacity,
  zoom,
  selectedPolygonId,
  showAxes = false,
  onAngleChange,
  onZoomChange,
}: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      linear
      style={{ background: "transparent", opacity: faceOpacity }}
    >
      <OrthographicCamera
        makeDefault
        position={[0, 0, CAMERA_DISTANCE]}
        zoom={zoom}
        near={0.01}
        far={10}
      />
      <CameraSync
        angle={angle}
        controlsRef={controlsRef}
        enabled={angleSource === "slider"}
      />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        target={[0, 0, 0]}
        onChange={(e) => {
          if (!e) return;
          const cam = e.target.object as THREE.OrthographicCamera;
          const dir = new THREE.Vector3();
          cam.getWorldDirection(dir).negate();
          const yaw = (Math.atan2(dir.x, dir.z) * 180) / Math.PI;
          const pitch = (Math.asin(dir.y) * 180) / Math.PI;
          onAngleChange(yaw, pitch);
          if (cam.zoom !== zoom) {
            onZoomChange(cam.zoom);
          }
        }}
      />
      <ambientLight intensity={2.5} />
      {showAxes && <axesHelper args={[0.5]} />}
      <FaceMesh
        model={model}
        angle={angle}
        selectedPolygonId={selectedPolygonId}
      />
    </Canvas>
  );
}
