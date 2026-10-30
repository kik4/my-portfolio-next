"use client";

import { MyLink } from "../_components/MyLink";
import { getPathToHome } from "../(home)/getPath";
import { ModelingTool } from "./_components/ModelingTool";

export default function MimesisPage() {
  return (
    <div className="flex h-screen flex-col bg-gray-50 text-gray-700">
      <header className="shrink-0 border-b bg-white">
        <nav className="flex items-center justify-between px-6 py-2">
          <MyLink
            href={getPathToHome()}
            className="text-sm text-gray-600 hover:text-blue-600"
          >
            ← ホーム
          </MyLink>
          <h1 className="text-lg font-bold text-gray-800">
            2.5Dモデリング (Mimesis)
          </h1>
          <div className="w-16" />
        </nav>
      </header>
      <ModelingTool />
    </div>
  );
}
