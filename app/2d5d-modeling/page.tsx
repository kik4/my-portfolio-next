"use client";

import { MyLink } from "../_components/MyLink";
import { getPathToHome } from "../(home)/getPath";
import { EyePlacementTool } from "./_components/EyePlacementTool";

export default function ModelingPage() {
  return (
    <div className="flex h-screen flex-col bg-gray-50 text-gray-700">
      <header className="shrink-0 border-b bg-white">
        <nav className="flex items-center justify-between px-6 py-2">
          <MyLink
            href={getPathToHome()}
            className="text-gray-600 text-sm hover:text-blue-600"
          >
            ← ホーム
          </MyLink>
          <h1 className="font-bold text-gray-800 text-lg">目配置検証ツール</h1>
          <div className="w-16" />
        </nav>
      </header>
      <EyePlacementTool modelUrl="/models/base2.glb" />
    </div>
  );
}
