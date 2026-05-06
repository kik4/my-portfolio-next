"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";

export type ViewKind = "front" | "side" | "top" | "perspective";

interface Props {
  view: ViewKind;
  showAxes?: boolean;
  showGrid?: boolean;
  children: ReactNode;
}

const ORTHO_SIZE = 1.2;

const orthoCameraProps = (view: ViewKind) => {
  switch (view) {
    case "front":
      return {
        position: [0, 0, 3] as [number, number, number],
        up: [0, 1, 0] as [number, number, number],
      };
    case "side":
      return {
        position: [3, 0, 0] as [number, number, number],
        up: [0, 1, 0] as [number, number, number],
      };
    case "top":
      return {
        position: [0, 3, 0] as [number, number, number],
        up: [0, 0, -1] as [number, number, number],
      };
    case "perspective":
      return {
        position: [2, 1.5, 2] as [number, number, number],
        up: [0, 1, 0] as [number, number, number],
      };
  }
};

export const Scene = ({
  view,
  showAxes = true,
  showGrid = true,
  children,
}: Props) => {
  const isOrtho = view !== "perspective";
  const camProps = orthoCameraProps(view);

  return (
    <Canvas
      orthographic={isOrtho}
      camera={
        isOrtho
          ? {
              position: camProps.position,
              up: camProps.up,
              zoom: 200,
              near: -10,
              far: 10,
            }
          : {
              position: camProps.position,
              up: camProps.up,
              fov: 45,
              near: 0.1,
              far: 100,
            }
      }
      style={{ background: "#fafafa" }}
    >
      {showAxes && <axesHelper args={[ORTHO_SIZE]} />}
      {showGrid && <gridHelper args={[2, 10, "#cccccc", "#eeeeee"]} />}
      {children}
      {view === "perspective" && <OrbitControls makeDefault />}
    </Canvas>
  );
};
