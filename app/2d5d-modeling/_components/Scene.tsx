"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { FaceModel, Vec3, YawPitch } from "../_lib/types";
import { ControlMeshOverlay } from "./ControlMeshOverlay";
import { FaceMesh } from "./FaceMesh";

interface SceneProps {
  model: FaceModel;
  angle: YawPitch;
  angleSource: "slider" | "controls";
  faceOpacity: number;
  showAxes?: boolean;
  showGrid?: boolean;
  // Head-mesh editing
  selectedVertexId: string | null;
  showWireframe: boolean;
  showControlVertices: boolean;
  symmetric: boolean;
  onSelectVertex: (id: string | null) => void;
  onMoveVertex: (id: string, newPos: Vec3) => void;
  onAngleChange: (yaw: number, pitch: number) => void;
}

const CAMERA_DISTANCE = 1.6;

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
  showAxes = false,
  showGrid = false,
  selectedVertexId,
  showWireframe,
  showControlVertices,
  symmetric,
  onSelectVertex,
  onMoveVertex,
  onAngleChange,
}: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent", opacity: faceOpacity }}
      onPointerMissed={() => onSelectVertex(null)}
    >
      <PerspectiveCamera
        makeDefault
        position={[0, 0, CAMERA_DISTANCE]}
        fov={35}
        near={0.01}
        far={20}
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
        makeDefault
        onChange={(e) => {
          if (!e) return;
          const cam = e.target.object as THREE.Camera;
          const dir = new THREE.Vector3();
          cam.getWorldDirection(dir).negate();
          const yaw = (Math.atan2(dir.x, dir.z) * 180) / Math.PI;
          const pitch = (Math.asin(dir.y) * 180) / Math.PI;
          onAngleChange(yaw, pitch);
        }}
      />
      <ambientLight intensity={2.5} />
      {showAxes && <axesHelper args={[0.5]} />}
      {showGrid && (
        <gridHelper
          args={[1, 20, "#6b7280", "#d1d5db"]}
          position={[0, -0.5, 0]}
        />
      )}
      <FaceMesh model={model} angle={angle} />
      <ControlMeshOverlay
        mesh={model.head.controlMesh}
        selectedVertexId={selectedVertexId}
        showWireframe={showWireframe}
        showVertices={showControlVertices}
        symmetric={symmetric}
        onSelectVertex={onSelectVertex}
        onMoveVertex={onMoveVertex}
      />
    </Canvas>
  );
}
