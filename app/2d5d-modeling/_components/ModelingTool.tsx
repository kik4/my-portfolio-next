"use client";

import { useCallback, useEffect, useState } from "react";
import { CrossSectionEditor } from "./CrossSectionEditor";
import type { CrossSection } from "./types";
import { createDefaultCrossSection, mirrorCrossSection } from "./types";
import { Viewport } from "./Viewport";

const STORAGE_KEY = "2d5d-cross-sections";

function loadSections(): CrossSection[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    return parsed.map((s) => ({
      angle: (s.angle as number) ?? 0,
      points: (s.points as CrossSection["points"]) ?? [],
      symmetric: (s.symmetric as boolean) ?? true,
    }));
  } catch {
    return null;
  }
}

function saveSections(sections: CrossSection[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  } catch {
    // ignore
  }
}

const DEFAULT_SECTIONS: CrossSection[] = [
  createDefaultCrossSection(0),
  createDefaultCrossSection(90),
];

export function ModelingTool() {
  const [sections, setSections] = useState<CrossSection[]>(DEFAULT_SECTIONS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadSections();
    if (saved && saved.length >= 2) {
      setSections(saved);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveSections(sections);
  }, [sections, loaded]);

  const selectedSection = sections[selectedIndex];

  const handleSectionChange = useCallback(
    (updated: CrossSection) => {
      const next = [...sections];
      next[selectedIndex] = updated.symmetric
        ? mirrorCrossSection(updated)
        : updated;
      setSections(next);
    },
    [sections, selectedIndex],
  );

  const handleAddSection = useCallback(() => {
    const angle = Math.round(
      sections.reduce((sum, s) => sum + s.angle, 0) / sections.length,
    );
    const newSection = createDefaultCrossSection(angle);
    const next = [...sections, newSection].sort((a, b) => a.angle - b.angle);
    setSections(next);
    setSelectedIndex(next.indexOf(newSection));
  }, [sections]);

  const handleRemoveSection = useCallback(() => {
    if (sections.length <= 2) return;
    const next = sections.filter((_, i) => i !== selectedIndex);
    setSections(next);
    setSelectedIndex(Math.min(selectedIndex, next.length - 1));
  }, [sections, selectedIndex]);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(sections, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cross-sections.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [sections]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (Array.isArray(data) && data.length >= 2) {
            setSections(data);
            setSelectedIndex(0);
          }
        } catch {
          // ignore
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      <Viewport sections={sections} />
      <div className="flex w-[440px] shrink-0 flex-col gap-3 overflow-y-auto border-l bg-white p-4">
        {/* 角度選択 */}
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold text-gray-700 text-xs">断面</div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleImport}
                className="rounded bg-gray-500 px-2 py-0.5 text-white text-xs hover:bg-gray-600"
              >
                読込
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="rounded bg-gray-500 px-2 py-0.5 text-white text-xs hover:bg-gray-600"
              >
                DL
              </button>
              <button
                type="button"
                onClick={handleAddSection}
                className="rounded bg-blue-500 px-2 py-0.5 text-white text-xs hover:bg-blue-600"
              >
                + 追加
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {sections.map((s, i) => (
              <button
                key={s.angle}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={`rounded px-2 py-0.5 text-xs ${
                  selectedIndex === i
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                {s.angle}°
              </button>
            ))}
          </div>
        </div>

        {/* 断面エディタ */}
        {selectedSection && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold text-gray-700 text-xs">
                {selectedSection.angle}° 断面
              </div>
              <div className="flex gap-1">
                <label className="flex cursor-pointer items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedSection.symmetric}
                    onChange={(e) => {
                      const updated = {
                        ...selectedSection,
                        symmetric: e.target.checked,
                      };
                      if (e.target.checked) {
                        handleSectionChange(mirrorCrossSection(updated));
                      } else {
                        handleSectionChange(updated);
                      }
                    }}
                    className="accent-blue-500"
                  />
                  <span className="text-gray-500 text-xs">左右対称</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleSectionChange(
                      createDefaultCrossSection(selectedSection.angle),
                    )
                  }
                  className="rounded px-2 py-0.5 text-gray-500 text-xs hover:bg-gray-100"
                >
                  円にリセット
                </button>
                {sections.length > 2 && (
                  <button
                    type="button"
                    onClick={handleRemoveSection}
                    className="rounded px-2 py-0.5 text-red-500 text-xs hover:bg-red-50"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
            <CrossSectionEditor
              section={selectedSection}
              onChange={handleSectionChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
