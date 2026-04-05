"use client";

import { OrthographicCamera, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

interface HeadModelProps {
  url: string;
}

function HeadModel({ url }: HeadModelProps) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  const offset = useMemo(() => {
    const box = new THREE.Box3();
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const oldMat = child.material as THREE.MeshStandardMaterial;
        child.material = new THREE.MeshBasicMaterial({
          map: oldMat.map,
          color: oldMat.color,
          transparent: true,
          opacity: 0.8,
          side: oldMat.side,
          alphaTest: oldMat.alphaTest,
        });
        child.geometry.computeBoundingBox();
        if (child.geometry.boundingBox) {
          const worldBox = child.geometry.boundingBox.clone();
          worldBox.applyMatrix4(child.matrixWorld);
          box.union(worldBox);
        }
      }
    });
    if (box.isEmpty()) return new THREE.Vector3();
    // 頭の中心を原点より少し下にずらす（モデルを画面上方に表示）
    const max = box.max;
    const center = box.getCenter(new THREE.Vector3());
    return new THREE.Vector3(
      center.x,
      max.y - (max.y - center.y) * 0.3 - 0.22,
      center.z,
    );
  }, [scene]);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(-offset.x, -offset.y, -offset.z);
    }
  }, [offset]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

function CameraRig({
  angle,
  angleV,
  distance,
}: {
  angle: number;
  angleV: number;
  distance: number;
}) {
  const { camera } = useThree();
  useEffect(() => {
    const hRad = (angle * Math.PI) / 180;
    const vRad = (angleV * Math.PI) / 180;
    camera.position.set(
      Math.sin(hRad) * Math.cos(vRad) * distance,
      Math.sin(vRad) * distance,
      Math.cos(hRad) * Math.cos(vRad) * distance,
    );
    camera.lookAt(0, 0, 0);
  }, [angle, angleV, distance, camera]);
  return null;
}

interface HeadModel3DProps {
  /** 水平角度（度）。0=正面、90=真横 */
  angle: number;
  /** 垂直角度（度）。0=水平、+=下から、-=上から */
  angleV: number;
  modelUrl?: string;
}

/** 指定角度から見た頭モデルを平行投影でレンダリングして参考形状を提供する */
export function HeadModel3D({
  angle,
  angleV,
  modelUrl = "/models/base2.glb",
}: HeadModel3DProps) {
  const distance = 1;
  // 頭がビューポートに収まるサイズ
  const viewSize = 0.22;
  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <OrthographicCamera
        makeDefault
        position={[0, 0, distance]}
        zoom={1}
        left={-viewSize}
        right={viewSize}
        top={viewSize}
        bottom={-viewSize}
        near={0.01}
        far={10}
      />
      <ambientLight intensity={2.5} />
      <Suspense fallback={null}>
        <HeadModel url={modelUrl} />
      </Suspense>
      <CameraRig angle={angle} angleV={angleV} distance={distance} />
    </Canvas>
  );
}
