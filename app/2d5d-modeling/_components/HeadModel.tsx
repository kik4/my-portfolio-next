"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

interface HeadModelProps {
  url: string;
  children?: React.ReactNode;
}

export function HeadModel({ url, children }: HeadModelProps) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  const offset = useMemo(() => {
    const box = new THREE.Box3();
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // マテリアルをUnlitに変換（影なしでテクスチャ色がそのまま出る）
        const oldMat = child.material as THREE.MeshStandardMaterial;
        child.material = new THREE.MeshBasicMaterial({
          map: oldMat.map,
          color: oldMat.color,
          transparent: oldMat.transparent,
          opacity: oldMat.opacity,
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
    return box.getCenter(new THREE.Vector3());
  }, [scene]);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(-offset.x, -offset.y, -offset.z);
    }
  }, [offset]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
      {children}
    </group>
  );
}
