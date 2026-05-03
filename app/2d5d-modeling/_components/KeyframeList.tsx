"use client";

interface KeyframeRow {
  id: string;
  yaw: number;
  pitch: number;
}

interface Props {
  title: string;
  keyframes: KeyframeRow[];
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  onAddAtCamera: () => void;
  onRemove: (index: number) => void;
  cameraYaw: number;
  cameraPitch: number;
  // Disable removal when only one keyframe remains (the part / group must
  // always have at least one).
  minCount?: number;
}

export const KeyframeList = ({
  title,
  keyframes,
  selectedIndex,
  setSelectedIndex,
  onAddAtCamera,
  onRemove,
  cameraYaw,
  cameraPitch,
  minCount = 1,
}: Props) => {
  return (
    <fieldset className="rounded border bg-white p-2 text-xs">
      <legend className="font-bold text-gray-700">
        {title} ({keyframes.length})
      </legend>
      <button
        type="button"
        onClick={onAddAtCamera}
        className="mb-1 rounded bg-emerald-500 px-2 py-0.5 text-white text-xs hover:bg-emerald-600"
      >
        + 現在の視点 ({cameraYaw.toFixed(1)}°, {cameraPitch.toFixed(1)}°)
      </button>
      <ul className="space-y-0.5">
        {keyframes.map((k, i) => (
          <li key={k.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`flex-1 rounded px-1 py-0.5 text-left ${
                i === selectedIndex
                  ? "bg-blue-100 text-blue-800"
                  : "hover:bg-gray-100"
              }`}
            >
              yaw {k.yaw.toFixed(1)}° pitch {k.pitch.toFixed(1)}°
            </button>
            <button
              type="button"
              onClick={() => onRemove(i)}
              disabled={keyframes.length <= minCount}
              className="px-1 text-red-500 hover:text-red-700 disabled:opacity-30"
              aria-label={`keyframe ${i} を削除`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
};
