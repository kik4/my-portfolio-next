"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { CrossSection } from "./types";
import { crossSectionTo3D, interpolateCrossSections } from "./types";

interface LoftMeshProps {
  sections: CrossSection[];
  /** 全周を何ステップで分割するか */
  steps?: number;
}

/**
 * ユーザー定義の断面（0°〜180°）を左右ミラーで全周に拡張する
 *
 * 0°〜180°: ユーザー定義をそのまま補間
 * 180°〜360°: 0°〜180°の左右ミラー（Xを反転）
 */
function buildFullSections(
  sections: CrossSection[],
  steps: number,
): CrossSection[] {
  const sorted = [...sections].sort((a, b) => a.angle - b.angle);

  // 0°断面のX反転を180°として追加（0°と180°は同じ正中断面）
  const zeroSection = sorted.find((s) => s.angle === 0);
  const has180 = sorted.some((s) => s.angle === 180);
  if (zeroSection && !has180) {
    sorted.push({
      angle: 180,
      points: zeroSection.points.map((p) => ({ x: -p.x, y: p.y })),
      symmetric: zeroSection.symmetric,
    });
    sorted.sort((a, b) => a.angle - b.angle);
  }

  const result: CrossSection[] = [];
  for (let i = 0; i <= steps; i++) {
    const fullAngle = (360 * i) / steps;

    let lookupAngle = fullAngle;
    let mirrorX = false;
    if (lookupAngle > 180) {
      lookupAngle = 360 - lookupAngle;
      mirrorX = true;
    }

    const section = interpolateCrossSections(sorted, lookupAngle);
    if (!section) continue;

    result.push({
      angle: fullAngle,
      points: mirrorX
        ? section.points.map((p) => ({ x: -p.x, y: p.y }))
        : section.points,
      symmetric: section.symmetric,
    });
  }

  return result;
}

/**
 * 断面群からロフトメッシュを生成する
 */
export function LoftMesh({ sections, steps = 64 }: LoftMeshProps) {
  const geometry = useMemo(() => {
    if (sections.length < 2) return null;

    const fullSections = buildFullSections(sections, steps);
    if (fullSections.length < 2) return null;

    // 各断面を3D空間に配置
    const rings = fullSections.map((s) => crossSectionTo3D(s));
    const pointCount = rings[0].length;

    // 頭頂部と底部の平均位置を計算して共通頂点にする
    let topY = 0;
    let bottomY = 0;
    const half = Math.floor(pointCount / 2);
    for (const ring of rings) {
      topY += ring[0].y;
      bottomY += ring[half].y;
    }
    topY /= rings.length;
    bottomY /= rings.length;

    const geo = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];

    // リング頂点を配置
    for (const ring of rings) {
      for (const p of ring) {
        vertices.push(p.x, p.y, p.z);
      }
    }

    // 頭頂部の共通頂点を追加
    const topIdx = rings.length * pointCount;
    vertices.push(0, topY, 0);

    // 底部の共通頂点を追加
    const bottomIdx = topIdx + 1;
    vertices.push(0, bottomY, 0);

    // 隣接リング間をTriangleで結ぶ
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < pointCount; j++) {
        const j2 = (j + 1) % pointCount;
        const a = i * pointCount + j;
        const b = i * pointCount + j2;
        const c = (i + 1) * pointCount + j;
        const d = (i + 1) * pointCount + j2;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    // 頭頂部キャップ: 各リングの頂点0と隣のリングの頂点0をtopIdxで結ぶ
    for (let i = 0; i < rings.length - 1; i++) {
      const a = i * pointCount;
      const b = (i + 1) * pointCount;
      indices.push(topIdx, b, a);
    }

    // 底部キャップ: 各リングの頂点N/2と隣のリングの頂点N/2をbottomIdxで結ぶ
    for (let i = 0; i < rings.length - 1; i++) {
      const a = i * pointCount + half;
      const b = (i + 1) * pointCount + half;
      indices.push(bottomIdx, a, b);
    }

    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [sections, steps]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#88aacc"
        side={THREE.DoubleSide}
        flatShading
      />
    </mesh>
  );
}

/** 断面のワイヤーフレームを表示 */
export function CrossSectionWires({ sections }: { sections: CrossSection[] }) {
  const geometries = useMemo(() => {
    return sections.map((section) => {
      const pts3d = crossSectionTo3D(section);
      const verts = new Float32Array(
        [...pts3d, pts3d[0]].flatMap((p) => [p.x, p.y, p.z]),
      );
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      return { angle: section.angle, geo };
    });
  }, [sections]);

  const lineObjects = useMemo(() => {
    return geometries.map(({ angle, geo }) => {
      const mat = new THREE.LineBasicMaterial({ color: "#ff6644" });
      const line = new THREE.LineLoop(geo, mat);
      return { angle, line };
    });
  }, [geometries]);

  return (
    <group>
      {lineObjects.map(({ angle, line }) => (
        <primitive key={angle} object={line} />
      ))}
    </group>
  );
}
