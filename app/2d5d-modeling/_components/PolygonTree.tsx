"use client";

import { useCallback, useState } from "react";
import type { ColorRGBA, FeatureGroup, Polygon } from "../_lib/types";

interface PolygonTreeProps {
  polygons: Polygon[];
  featureGroups: FeatureGroup[];
  outlineFillColor: ColorRGBA;
  selectedPolygonIndex: number | null;
  selectedGroupIndex: number | null;
  onSelectRoot: () => void;
  onSelectPolygon: (index: number) => void;
  onSelectGroup: (index: number | null) => void;
  onDeletePolygon: (index: number) => void;
  onDeleteGroup: (index: number) => void;
  onAssignGroup: (polygonIndex: number, groupId: string | undefined) => void;
  onAddPolygon: (group: "outline" | "feature") => void;
  onAddGroup: () => void;
}

function rgbaToHex(c: [number, number, number, number]): string {
  const r = Math.round(c[0] * 255)
    .toString(16)
    .padStart(2, "0");
  const g = Math.round(c[1] * 255)
    .toString(16)
    .padStart(2, "0");
  const b = Math.round(c[2] * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
}

export function PolygonTree({
  polygons,
  featureGroups,
  outlineFillColor,
  selectedPolygonIndex,
  selectedGroupIndex,
  onSelectRoot,
  onSelectPolygon,
  onSelectGroup,
  onDeletePolygon,
  onDeleteGroup,
  onAssignGroup,
  onAddPolygon,
  onAddGroup,
}: PolygonTreeProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Polygons not in any group
  const ungrouped = polygons
    .map((p, i) => ({ polygon: p, index: i }))
    .filter(
      ({ polygon }) =>
        polygon.group === "outline" ||
        (polygon.group === "feature" && !polygon.groupId),
    );

  // Polygons per group
  const groupedPolygons = (groupId: string) =>
    polygons
      .map((p, i) => ({ polygon: p, index: i }))
      .filter(
        ({ polygon }) =>
          polygon.group === "feature" && polygon.groupId === groupId,
      );

  const handleDragStart = useCallback(
    (e: React.DragEvent, polygonIndex: number) => {
      const polygon = polygons[polygonIndex];
      if (polygon.group !== "feature") {
        e.preventDefault();
        return;
      }
      setDragIndex(polygonIndex);
      e.dataTransfer.effectAllowed = "move";
    },
    [polygons],
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropTarget(null);
  }, []);

  const handleDropOnGroup = useCallback(
    (groupId: string) => {
      if (dragIndex === null) return;
      onAssignGroup(dragIndex, groupId);
      setDragIndex(null);
      setDropTarget(null);
    },
    [dragIndex, onAssignGroup],
  );

  const handleDropOnRoot = useCallback(() => {
    if (dragIndex === null) return;
    onAssignGroup(dragIndex, undefined);
    setDragIndex(null);
    setDropTarget(null);
  }, [dragIndex, onAssignGroup]);

  const renderPolygonItem = (
    polygon: Polygon,
    index: number,
    indent: boolean,
  ) => {
    const isSelected =
      selectedPolygonIndex === index && selectedGroupIndex === null;
    const isDragging = dragIndex === index;
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: drag handle for polygon reordering
      <div
        key={polygon.id}
        className={`flex items-center gap-1 ${indent ? "pl-4" : ""} ${isDragging ? "opacity-40" : ""}`}
        draggable={polygon.group === "feature"}
        onDragStart={(e) => handleDragStart(e, index)}
        onDragEnd={handleDragEnd}
      >
        <button
          type="button"
          onClick={() => {
            onSelectPolygon(index);
            onSelectGroup(null);
          }}
          className={`flex-1 truncate rounded px-2 py-0.5 text-left ${
            isSelected
              ? "bg-blue-100 font-semibold text-blue-800"
              : "hover:bg-gray-100"
          }`}
        >
          <span
            className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border"
            style={{
              backgroundColor: rgbaToHex(
                polygon.group === "feature"
                  ? polygon.fillColor
                  : outlineFillColor,
              ),
            }}
          />
          {polygon.name}
          <span className="ml-1 text-gray-400 text-xs">
            {polygon.group === "outline" ? "輪郭" : "特徴"} L
            {polygon.layerIndex}
          </span>
        </button>
        {polygons.length > 1 && (
          <button
            type="button"
            onClick={() => onDeletePolygon(index)}
            className="rounded px-1 text-red-400 hover:bg-red-50"
          >
            ×
          </button>
        )}
      </div>
    );
  };

  const isRootSelected =
    selectedPolygonIndex === null && selectedGroupIndex === null;

  return (
    <div className="space-y-0.5">
      {/* Root item */}
      <button
        type="button"
        onClick={onSelectRoot}
        className={`w-full truncate rounded px-2 py-0.5 text-left font-medium ${
          isRootSelected
            ? "bg-blue-100 font-semibold text-blue-800"
            : "hover:bg-gray-100"
        }`}
      >
        モデル
      </button>
      {/* Root drop zone */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDropTarget("root");
        }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(e) => {
          e.preventDefault();
          handleDropOnRoot();
        }}
        className={`rounded ${dropTarget === "root" ? "bg-blue-50 ring-1 ring-blue-300" : ""}`}
      >
        {/* Ungrouped polygons */}
        {ungrouped.map(({ polygon, index }) =>
          renderPolygonItem(polygon, index, false),
        )}
      </div>

      {/* Groups */}
      {featureGroups.map((g, gi) => {
        const members = groupedPolygons(g.id);
        const isGroupSelected = selectedGroupIndex === gi;
        const isDropHere = dropTarget === g.id;
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: group drop zone
          <div
            key={g.id}
            className={`rounded border ${isDropHere ? "border-purple-400 bg-purple-50" : "border-transparent"}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(g.id);
            }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(e) => {
              e.preventDefault();
              handleDropOnGroup(g.id);
            }}
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectGroup(isGroupSelected ? null : gi)}
                className={`flex-1 truncate rounded px-2 py-0.5 text-left font-medium ${
                  isGroupSelected
                    ? "bg-purple-100 text-purple-800"
                    : "hover:bg-gray-100"
                }`}
              >
                📁 {g.name}
              </button>
              <button
                type="button"
                onClick={() => onDeleteGroup(gi)}
                className="rounded px-1 text-red-400 hover:bg-red-50"
              >
                ×
              </button>
            </div>
            {members.length > 0 ? (
              members.map(({ polygon, index }) =>
                renderPolygonItem(polygon, index, true),
              )
            ) : (
              <div className="py-0.5 pl-4 text-gray-400 text-xs italic">
                ドラッグして追加
              </div>
            )}
          </div>
        );
      })}

      {/* Add buttons */}
      <div className="flex gap-1 pt-1">
        <button
          type="button"
          onClick={() => onAddPolygon("outline")}
          className="flex-1 rounded border border-gray-400 border-dashed px-1 py-0.5 text-gray-600 hover:bg-gray-50"
        >
          + 輪郭
        </button>
        <button
          type="button"
          onClick={() => onAddPolygon("feature")}
          className="flex-1 rounded border border-gray-400 border-dashed px-1 py-0.5 text-gray-600 hover:bg-gray-50"
        >
          + 特徴
        </button>
        <button
          type="button"
          onClick={onAddGroup}
          className="flex-1 rounded border border-gray-400 border-dashed px-1 py-0.5 text-gray-600 hover:bg-gray-50"
        >
          + グループ
        </button>
      </div>
    </div>
  );
}
