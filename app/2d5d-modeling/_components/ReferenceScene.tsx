"use client";

import { OrthographicCamera, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";

function HeadModel({
  url,
  onCenterComputed,
}: {
  url: string;
  onCenterComputed: (center: THREE.Vector3) => void;
}) {
  const { scene } = useGLTF(url);

  const { cloned, center } = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const oldMat = child.material as THREE.MeshStandardMaterial;
        child.material = new THREE.MeshBasicMaterial({
          map: oldMat.map,
          color: oldMat.color,
          side: THREE.FrontSide,
          alphaTest: oldMat.alphaTest,
        });
      }
    });

    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    let center = new THREE.Vector3();
    if (!box.isEmpty()) {
      center = box.getCenter(new THREE.Vector3());
      // 頭のバウンディングボックス中心は顎を含むため、目線が来るように上方補正
      center.y += (box.max.y - box.min.y) * 0.2;
    }
    return { cloned, center };
  }, [scene]);

  useEffect(() => {
    onCenterComputed(center);
  }, [center, onCenterComputed]);

  return <primitive object={cloned} />;
}

function CameraRig({
  yaw,
  pitch,
  distance,
  center,
}: {
  yaw: number;
  pitch: number;
  distance: number;
  center: THREE.Vector3;
}) {
  const { camera } = useThree();
  useEffect(() => {
    const hRad = (yaw * Math.PI) / 180;
    const vRad = (pitch * Math.PI) / 180;
    camera.position.set(
      center.x + Math.sin(hRad) * Math.cos(vRad) * distance,
      center.y + Math.sin(vRad) * distance,
      center.z + Math.cos(hRad) * Math.cos(vRad) * distance,
    );
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }, [yaw, pitch, distance, camera, center]);
  return null;
}

const REFERENCE_SCALE = 3.5;

interface ReferenceSceneProps {
  yaw: number;
  pitch: number;
  zoom: number;
  opacity: number;
  visible: boolean;
  modelUrl?: string;
}

export function ReferenceScene({
  yaw,
  pitch,
  zoom,
  opacity,
  visible,
  modelUrl = "/models/base2.glb",
}: ReferenceSceneProps) {
  const [center, setCenter] = useState<THREE.Vector3>(
    () => new THREE.Vector3(),
  );

  if (!visible) return null;
  const distance = 1;
  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent", opacity }}
    >
      <OrthographicCamera
        makeDefault
        position={[center.x, center.y, center.z + distance]}
        zoom={zoom * REFERENCE_SCALE}
        near={0.01}
        far={10}
      />
      <ambientLight intensity={2.5} />
      <Suspense fallback={null}>
        <HeadModel url={modelUrl} onCenterComputed={setCenter} />
      </Suspense>
      <CameraRig yaw={yaw} pitch={pitch} distance={distance} center={center} />
    </Canvas>
  );
}

useGLTF.preload("/models/base2.glb");
