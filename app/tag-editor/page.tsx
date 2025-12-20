/** biome-ignore-all lint/suspicious/noArrayIndexKey: <for utility> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <ok> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <for utility> */
"use client";

import { useEffect, useState } from "react";
import { MyLink } from "../_components/MyLink";
import { getPathToHome } from "../(home)/getPath";

interface TagGroup {
  name: string;
  tags: string[];
}

interface Output {
  filename: string;
  groups: TagGroup[];
}

interface TagData {
  base: {
    groups: TagGroup[];
  };
  outputs: Output[];
}

const STORAGE_KEY = "tag-editor-data";
const INITIAL_DATA: TagData = {
  base: {
    groups: [],
  },
  outputs: [],
};

export default function TagEditor() {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [_dragCounter, setDragCounter] = useState(0);
  const [data, setData] = useState<TagData>(INITIAL_DATA);
  const [fileName, setFileName] = useState<string>("");

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(parsed);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save data to localStorage:", error);
    }
  }, [data]);

  // Reset data to initial state
  const handleReset = () => {
    const confirmed = window.confirm(
      "すべてのデータをリセットしますか？この操作は取り消せません。",
    );
    if (confirmed) {
      setData(INITIAL_DATA);
      setFileName("");
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setData(json);
      } catch (_error) {
        alert("JSONファイルの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);

    // Reset the input value to allow the same file to be uploaded again
    event.target.value = "";
  };

  const handleOutputFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 確認ダイアログを表示
    const confirmed = window.confirm(
      "Outputファイルを読み込むと、既存のBase GroupsとOutputsがすべて削除されます。よろしいですか？",
    );

    if (!confirmed) {
      // キャンセルされた場合、input値をリセットして終了
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        // カンマで区切ってタグを抽出し、トリム
        const tags = content
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

        // base groupsとoutputsを新しいグループで置き換え（既存のものは残さない）
        setData({
          base: {
            groups: [
              {
                name: file.name.replace(/\.[^/.]+$/, ""), // 拡張子を除いたファイル名をグループ名に
                tags: tags,
              },
            ],
          },
          outputs: [],
        });
      } catch (_error) {
        alert("ファイルの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);

    // Reset the input value to allow the same file to be uploaded again
    event.target.value = "";
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "tags.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadOutputs = () => {
    data.outputs.forEach((output) => {
      // base.groupsの全タグを取得（空のタグを除外）
      const baseTags = data.base.groups
        .flatMap((group) => group.tags)
        .filter((tag) => tag.trim());

      // outputのgroupsのタグを取得（空のタグを除外）
      const outputGroupTags = output.groups
        .flatMap((group) => group.tags)
        .filter((tag) => tag.trim());

      // baseタグとoutputタグを結合
      const finalTags = [...baseTags, ...outputGroupTags];

      const content = finalTags.join(", ");

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${output.filename}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Generic group operations
  const addGroup = (groups: TagGroup[]): TagGroup[] => {
    return [...groups, { name: "New Group", tags: [] }];
  };

  const updateGroup = (
    groups: TagGroup[],
    index: number,
    field: keyof TagGroup,
    value: any,
  ): TagGroup[] => {
    const newGroups = [...groups];
    newGroups[index] = { ...newGroups[index], [field]: value };
    return newGroups;
  };

  const deleteGroup = (groups: TagGroup[], index: number): TagGroup[] => {
    return groups.filter((_, i) => i !== index);
  };

  const reorderGroup = (
    groups: TagGroup[],
    fromIndex: number,
    toIndex: number,
  ): TagGroup[] => {
    const newGroups = [...groups];
    const [removed] = newGroups.splice(fromIndex, 1);
    newGroups.splice(toIndex, 0, removed);
    return newGroups;
  };

  // Generic tag operations
  const addTag = (groups: TagGroup[], groupIndex: number): TagGroup[] => {
    const newGroups = [...groups];
    newGroups[groupIndex].tags.push("");
    return newGroups;
  };

  const updateTag = (
    groups: TagGroup[],
    groupIndex: number,
    tagIndex: number,
    value: string,
  ): TagGroup[] => {
    const newGroups = [...groups];
    newGroups[groupIndex].tags[tagIndex] = value;
    return newGroups;
  };

  const deleteTag = (
    groups: TagGroup[],
    groupIndex: number,
    tagIndex: number,
  ): TagGroup[] => {
    const newGroups = [...groups];
    newGroups[groupIndex].tags = newGroups[groupIndex].tags.filter(
      (_, i) => i !== tagIndex,
    );
    return newGroups;
  };

  const moveTag = (
    groups: TagGroup[],
    fromGroupIndex: number,
    fromTagIndex: number,
    toGroupIndex: number,
    toTagIndex: number,
  ): TagGroup[] => {
    const newGroups = [...groups];

    // タグを取得して削除
    const tag = newGroups[fromGroupIndex].tags[fromTagIndex];
    newGroups[fromGroupIndex].tags = newGroups[fromGroupIndex].tags.filter(
      (_, i) => i !== fromTagIndex,
    );

    // 移動先に挿入
    newGroups[toGroupIndex].tags.splice(toTagIndex, 0, tag);

    return newGroups;
  };

  const addTagsFromFile = (
    groups: TagGroup[],
    groupIndex: number,
    tags: string[],
  ): TagGroup[] => {
    const newGroups = [...groups];
    newGroups[groupIndex].tags = [...newGroups[groupIndex].tags, ...tags];
    return newGroups;
  };

  // Helper to update base groups
  const updateBaseGroups = (updater: (groups: TagGroup[]) => TagGroup[]) => {
    setData({ ...data, base: { groups: updater(data.base.groups) } });
  };

  // Base group operations (wrappers around generic functions)
  const addBaseGroup = () => updateBaseGroups((g) => addGroup(g));
  const updateBaseGroup = (index: number, field: keyof TagGroup, value: any) =>
    updateBaseGroups((g) => updateGroup(g, index, field, value));
  const deleteBaseGroup = (index: number) =>
    updateBaseGroups((g) => deleteGroup(g, index));
  const reorderBaseGroup = (fromIndex: number, toIndex: number) =>
    updateBaseGroups((g) => reorderGroup(g, fromIndex, toIndex));
  const addTagToBaseGroup = (groupIndex: number) =>
    updateBaseGroups((g) => addTag(g, groupIndex));
  const updateBaseTag = (groupIndex: number, tagIndex: number, value: string) =>
    updateBaseGroups((g) => updateTag(g, groupIndex, tagIndex, value));
  const deleteBaseTag = (groupIndex: number, tagIndex: number) =>
    updateBaseGroups((g) => deleteTag(g, groupIndex, tagIndex));
  const moveBaseTag = (
    fromGroupIndex: number,
    fromTagIndex: number,
    toGroupIndex: number,
    toTagIndex: number,
  ) =>
    updateBaseGroups((g) =>
      moveTag(g, fromGroupIndex, fromTagIndex, toGroupIndex, toTagIndex),
    );
  const addTagsToBaseGroupFromFile = (groupIndex: number, tags: string[]) =>
    updateBaseGroups((g) => addTagsFromFile(g, groupIndex, tags));

  // Output operations
  const addOutput = () => {
    setData({
      ...data,
      outputs: [...data.outputs, { filename: "", groups: [] }],
    });
  };

  const updateOutput = (index: number, field: keyof Output, value: any) => {
    const newOutputs = [...data.outputs];
    newOutputs[index] = { ...newOutputs[index], [field]: value };
    setData({ ...data, outputs: newOutputs });
  };

  const deleteOutput = (index: number) => {
    setData({
      ...data,
      outputs: data.outputs.filter((_, i) => i !== index),
    });
  };

  // Helper to update output groups
  const updateOutputGroups = (
    outputIndex: number,
    updater: (groups: TagGroup[]) => TagGroup[],
  ) => {
    const newOutputs = [...data.outputs];
    newOutputs[outputIndex].groups = updater(newOutputs[outputIndex].groups);
    setData({ ...data, outputs: newOutputs });
  };

  // Output group operations (wrappers around generic functions)
  const addGroupToOutput = (outputIndex: number) =>
    updateOutputGroups(outputIndex, (g) => addGroup(g));
  const updateOutputGroup = (
    outputIndex: number,
    groupIndex: number,
    field: keyof TagGroup,
    value: any,
  ) =>
    updateOutputGroups(outputIndex, (g) =>
      updateGroup(g, groupIndex, field, value),
    );
  const deleteOutputGroup = (outputIndex: number, groupIndex: number) =>
    updateOutputGroups(outputIndex, (g) => deleteGroup(g, groupIndex));
  const reorderOutputGroup = (
    outputIndex: number,
    fromIndex: number,
    toIndex: number,
  ) =>
    updateOutputGroups(outputIndex, (g) => reorderGroup(g, fromIndex, toIndex));
  const addTagToOutputGroup = (outputIndex: number, groupIndex: number) =>
    updateOutputGroups(outputIndex, (g) => addTag(g, groupIndex));
  const updateOutputTag = (
    outputIndex: number,
    groupIndex: number,
    tagIndex: number,
    value: string,
  ) =>
    updateOutputGroups(outputIndex, (g) =>
      updateTag(g, groupIndex, tagIndex, value),
    );
  const deleteOutputTag = (
    outputIndex: number,
    groupIndex: number,
    tagIndex: number,
  ) =>
    updateOutputGroups(outputIndex, (g) => deleteTag(g, groupIndex, tagIndex));
  const moveOutputTag = (
    outputIndex: number,
    fromGroupIndex: number,
    fromTagIndex: number,
    toGroupIndex: number,
    toTagIndex: number,
  ) =>
    updateOutputGroups(outputIndex, (g) =>
      moveTag(g, fromGroupIndex, fromTagIndex, toGroupIndex, toTagIndex),
    );
  const addTagsToOutputGroupFromFile = (
    outputIndex: number,
    groupIndex: number,
    tags: string[],
  ) =>
    updateOutputGroups(outputIndex, (g) =>
      addTagsFromFile(g, groupIndex, tags),
    );

  // Base Groups から Output Groups へ移動
  const moveTagFromBaseToOutput = (
    fromGroupIndex: number,
    fromTagIndex: number,
    toOutputIndex: number,
    toGroupIndex: number,
    toTagIndex: number,
  ) => {
    const newGroups = [...data.base.groups];
    const newOutputs = [...data.outputs];

    // Base Groupsからタグを取得して削除
    const tag = newGroups[fromGroupIndex].tags[fromTagIndex];
    newGroups[fromGroupIndex].tags = newGroups[fromGroupIndex].tags.filter(
      (_, i) => i !== fromTagIndex,
    );

    // Output Groupsに挿入
    newOutputs[toOutputIndex].groups[toGroupIndex].tags.splice(
      toTagIndex,
      0,
      tag,
    );

    setData({ ...data, base: { groups: newGroups }, outputs: newOutputs });
  };

  // Output Groups から Base Groups へ移動
  const moveTagFromOutputToBase = (
    fromOutputIndex: number,
    fromGroupIndex: number,
    fromTagIndex: number,
    toGroupIndex: number,
    toTagIndex: number,
  ) => {
    const newGroups = [...data.base.groups];
    const newOutputs = [...data.outputs];

    // Output Groupsからタグを取得して削除
    const tag =
      newOutputs[fromOutputIndex].groups[fromGroupIndex].tags[fromTagIndex];
    newOutputs[fromOutputIndex].groups[fromGroupIndex].tags = newOutputs[
      fromOutputIndex
    ].groups[fromGroupIndex].tags.filter((_, i) => i !== fromTagIndex);

    // Base Groupsに挿入
    newGroups[toGroupIndex].tags.splice(toTagIndex, 0, tag);

    setData({ ...data, base: { groups: newGroups }, outputs: newOutputs });
  };

  // Helper function: Check if tag is duplicate in group
  const isDuplicateTag = (tags: string[], currentTag: string): boolean => {
    if (!currentTag) return false;
    return tags.filter((t) => t === currentTag).length > 1;
  };

  // Handle file drop
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    setDragCounter(0);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "json") {
      // Handle JSON file
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          setData(parsed);
          setFileName(file.name);
        } catch (_error) {
          alert("JSONファイルの読み込みに失敗しました");
        }
      };
      reader.readAsText(file);
    } else if (fileExtension === "txt") {
      // Handle TXT file (output file)
      const confirmed = window.confirm(
        "Outputファイルを読み込むと、既存のBase GroupsとOutputsがすべて削除されます。よろしいですか？",
      );

      if (!confirmed) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const tags = content
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);

          setData({
            base: {
              groups: [
                {
                  name: file.name.replace(/\.[^/.]+$/, ""),
                  tags: tags,
                },
              ],
            },
            outputs: [],
          });
          setFileName(file.name);
        } catch (_error) {
          alert("ファイルの読み込みに失敗しました");
        }
      };
      reader.readAsText(file);
    } else {
      alert("JSONファイルまたはTXTファイルをドロップしてください");
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragCounter((prev) => prev + 1);
    setIsDraggingFile(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragCounter((prev) => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDraggingFile(false);
      }
      return newCounter;
    });
  };

  // Helper function: Render preview with duplicate highlighting
  const renderPreviewWithDuplicates = (
    baseGroups: TagGroup[],
    outputGroups?: TagGroup[],
  ): React.ReactNode => {
    const baseTags = baseGroups
      .flatMap((group) => group.tags)
      .filter((t) => t.trim());

    if (!outputGroups) {
      // Base Groups only - check for duplicates
      const tagCounts = new Map<string, number>();
      baseTags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });

      return baseTags.map((tag, index) => (
        <span key={index}>
          {index > 0 && ", "}
          <span
            className={
              (tagCounts.get(tag) || 0) > 1 ? "font-semibold text-red-600" : ""
            }
          >
            {tag}
          </span>
        </span>
      ));
    }

    // Output preview - check for duplicates
    const outputGroupTags = outputGroups
      .flatMap((group) => group.tags)
      .filter((t) => t.trim());
    const finalTags = [...baseTags, ...outputGroupTags];

    const tagCounts = new Map<string, number>();
    finalTags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });

    return finalTags.map((tag, index) => (
      <span key={index}>
        {index > 0 && ", "}
        <span
          className={
            (tagCounts.get(tag) || 0) > 1 ? "font-semibold text-red-600" : ""
          }
        >
          {tag}
        </span>
      </span>
    ));
  };

  // GroupList Component
  interface GroupListProps {
    groups: TagGroup[];
    onUpdateGroup: (
      groupIndex: number,
      field: keyof TagGroup,
      value: any,
    ) => void;
    onDeleteGroup: (groupIndex: number) => void;
    onReorderGroup: (fromIndex: number, toIndex: number) => void;
    onAddTag: (groupIndex: number) => void;
    onUpdateTag: (groupIndex: number, tagIndex: number, value: string) => void;
    onDeleteTag: (groupIndex: number, tagIndex: number) => void;
    onMoveTag: (
      fromGroupIndex: number,
      fromTagIndex: number,
      toGroupIndex: number,
      toTagIndex: number,
    ) => void;
    onFileDropAddTags: (groupIndex: number, tags: string[]) => void;
    dragType: string;
    outputIndex?: number;
    colorScheme?: {
      containerBg: string;
      containerBorder: string;
      groupBg: string;
      groupBorder: string;
      inputBorder: string;
      inputFocus: string;
      dropZoneBorder: string;
      dropZoneBg: string;
      dropZoneBorderHover: string;
      dropZoneBgHover: string;
      dropZoneBorderActive: string;
      dropZoneBgActive: string;
      emptyTextColor: string;
      tagMinWidth: string;
      tagFontSize: string;
      tagWidthMultiplier: number;
      tagWidthOffset: number;
      buttonSize: string;
      buttonTextSize: string;
    };
    emptyMessage?: string;
    onCrossGroupMove?: (
      dragData: any,
      groupIndex: number,
      tagIndex?: number,
    ) => void;
  }

  const GroupList = ({
    groups,
    onUpdateGroup,
    onDeleteGroup,
    onReorderGroup,
    onAddTag,
    onUpdateTag,
    onDeleteTag,
    onMoveTag,
    onFileDropAddTags,
    dragType,
    outputIndex,
    colorScheme = {
      containerBg: "bg-gray-100",
      containerBorder: "border",
      groupBg: "bg-gray-50",
      groupBorder: "border",
      inputBorder: "border-gray-300",
      inputFocus: "focus:border-blue-500 focus:ring-blue-500",
      dropZoneBorder: "border-gray-300",
      dropZoneBg: "bg-gray-50",
      dropZoneBorderHover: "hover:border-blue-400",
      dropZoneBgHover: "hover:bg-blue-50",
      dropZoneBorderActive: "border-blue-500",
      dropZoneBgActive: "bg-blue-100",
      emptyTextColor: "text-gray-400",
      tagMinWidth: "min-w-32",
      tagFontSize: "text-sm",
      tagWidthMultiplier: 8,
      tagWidthOffset: 40,
      buttonSize: "px-3 py-2",
      buttonTextSize: "text-sm",
    },
    emptyMessage = "Groupsがありません。「+ グループ追加」ボタンをクリックしてグループを作成してください。",
    onCrossGroupMove,
  }: GroupListProps) => {
    return (
      <>
        {groups.length === 0 ? (
          <div
            className={`rounded border-2 border-dashed bg-white p-8 text-center ${colorScheme.dropZoneBorder}`}
          >
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          groups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className={`mb-4 rounded ${colorScheme.groupBorder} ${colorScheme.groupBg} p-4`}
            >
              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) =>
                    onUpdateGroup(groupIndex, "name", e.target.value)
                  }
                  className={`flex-1 rounded border ${colorScheme.inputBorder} bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${colorScheme.inputFocus}`}
                  placeholder="グループ名"
                />
                <button
                  type="button"
                  onClick={() => onReorderGroup(groupIndex, groupIndex - 1)}
                  disabled={groupIndex === 0}
                  className="rounded bg-gray-400 px-3 py-2 text-white hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                  title="上に移動"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onReorderGroup(groupIndex, groupIndex + 1)}
                  disabled={groupIndex === groups.length - 1}
                  className="rounded bg-gray-400 px-3 py-2 text-white hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                  title="下に移動"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteGroup(groupIndex)}
                  className={`rounded bg-red-500 ${colorScheme.buttonSize} text-white hover:bg-red-600`}
                >
                  - グループ削除
                </button>
              </div>

              <div className="ml-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className={`font-medium ${colorScheme.buttonTextSize}`}>
                    Tags:{" "}
                    <span className="text-gray-500">({group.tags.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddTag(groupIndex)}
                    className={`rounded bg-green-500 px-3 py-1 ${colorScheme.buttonTextSize} text-white hover:bg-green-600`}
                  >
                    + タグ追加
                  </button>
                </div>
                <div
                  className={`min-h-[60px] rounded border-2 border-dashed ${colorScheme.dropZoneBorder} ${colorScheme.dropZoneBg} p-2 transition-colors ${colorScheme.dropZoneBorderHover} ${colorScheme.dropZoneBgHover}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    e.currentTarget.classList.add(
                      colorScheme.dropZoneBorderActive.replace(
                        "border-",
                        "!border-",
                      ),
                      colorScheme.dropZoneBgActive.replace("bg-", "!bg-"),
                    );
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove(
                      colorScheme.dropZoneBorderActive.replace(
                        "border-",
                        "!border-",
                      ),
                      colorScheme.dropZoneBgActive.replace("bg-", "!bg-"),
                    );
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove(
                      colorScheme.dropZoneBorderActive.replace(
                        "border-",
                        "!border-",
                      ),
                      colorScheme.dropZoneBgActive.replace("bg-", "!bg-"),
                    );

                    // Check if dropping a file
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      const file = files[0];
                      const fileExtension = file.name
                        .split(".")
                        .pop()
                        ?.toLowerCase();

                      if (fileExtension === "txt") {
                        // Handle TXT file drop
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const content = event.target?.result as string;
                            const tags = content
                              .split(",")
                              .map((tag) => tag.trim())
                              .filter((tag) => tag.length > 0);

                            // Add tags to the current group
                            onFileDropAddTags(groupIndex, tags);
                          } catch (_error) {
                            alert("ファイルの読み込みに失敗しました");
                          }
                        };
                        reader.readAsText(file);
                        return;
                      } else {
                        alert("TXTファイルをドロップしてください");
                        return;
                      }
                    }

                    // Handle tag drag and drop
                    try {
                      const dragData = JSON.parse(
                        e.dataTransfer.getData("text/plain"),
                      );

                      // Check if this is a cross-group move (between base and output)
                      if (onCrossGroupMove) {
                        onCrossGroupMove(
                          dragData,
                          groupIndex,
                          group.tags.length,
                        );
                      } else {
                        // Same group type move
                        if (
                          dragData.type === dragType ||
                          dragData.dragType === dragType
                        ) {
                          onMoveTag(
                            dragData.groupIndex,
                            dragData.tagIndex,
                            groupIndex,
                            group.tags.length,
                          );
                        }
                      }
                    } catch (_error) {
                      // If JSON parsing fails, it might be a file drop without proper handling
                    }
                  }}
                >
                  {group.tags.length === 0 ? (
                    <div
                      className={`flex h-full items-center justify-center ${colorScheme.emptyTextColor} ${colorScheme.buttonTextSize}`}
                    >
                      タグをここにドロップ
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {group.tags.map((tag, tagIndex) => (
                        <div
                          key={tagIndex}
                          className="flex gap-1"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            const dragData =
                              outputIndex !== undefined
                                ? {
                                    dragType: dragType,
                                    outputIndex,
                                    groupIndex,
                                    tagIndex,
                                  }
                                : {
                                    type: dragType,
                                    groupIndex,
                                    tagIndex,
                                  };
                            e.dataTransfer.setData(
                              "text/plain",
                              JSON.stringify(dragData),
                            );
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            // Check if dropping a file - if so, let parent handle it
                            const files = e.dataTransfer.files;
                            if (files && files.length > 0) {
                              return; // Let the parent drop handler handle files
                            }

                            const dataText =
                              e.dataTransfer.getData("text/plain");
                            if (!dataText) return; // No data to parse

                            try {
                              const dragData = JSON.parse(dataText);

                              // Check if this is a cross-group move
                              if (onCrossGroupMove) {
                                onCrossGroupMove(
                                  dragData,
                                  groupIndex,
                                  tagIndex,
                                );
                              } else {
                                // Same group type move
                                if (
                                  dragData.type === dragType ||
                                  dragData.dragType === dragType
                                ) {
                                  onMoveTag(
                                    dragData.groupIndex,
                                    dragData.tagIndex,
                                    groupIndex,
                                    tagIndex,
                                  );
                                }
                              }
                            } catch (_error) {
                              // Invalid JSON, ignore
                            }
                          }}
                        >
                          <div
                            className={`relative flex ${colorScheme.tagMinWidth}`}
                          >
                            <input
                              type="text"
                              value={tag}
                              onChange={(e) =>
                                onUpdateTag(
                                  groupIndex,
                                  tagIndex,
                                  e.target.value,
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  onAddTag(groupIndex);
                                }
                              }}
                              className={`w-full cursor-move rounded border py-1 pr-7 pl-2 ${colorScheme.tagFontSize} shadow-sm focus:outline-none focus:ring-1 ${
                                isDuplicateTag(group.tags, tag)
                                  ? "border-yellow-500 bg-yellow-100 focus:border-yellow-600 focus:ring-yellow-500"
                                  : `${colorScheme.inputBorder} bg-white ${colorScheme.inputFocus}`
                              }`}
                              placeholder="タグ"
                              style={{
                                width: `${Math.max(
                                  tag.length * colorScheme.tagWidthMultiplier +
                                    colorScheme.tagWidthOffset,
                                  parseInt(
                                    colorScheme.tagMinWidth.replace(
                                      "min-w-",
                                      "",
                                    ),
                                    10,
                                  ) * 4,
                                )}px`,
                              }}
                              title={
                                isDuplicateTag(group.tags, tag)
                                  ? "警告: このグループ内に同じタグが複数あります"
                                  : ""
                              }
                            />
                            <button
                              type="button"
                              onClick={() => onDeleteTag(groupIndex, tagIndex)}
                              className={`absolute top-0 right-0 flex h-full items-center justify-center rounded-r bg-red-400 px-1.5 ${colorScheme.tagFontSize} text-white hover:bg-red-500`}
                              aria-label="タグを削除"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      <header className="border-b bg-white">
        <nav className="container mx-auto flex items-center justify-between px-6 py-3">
          <MyLink
            href={getPathToHome()}
            className="text-gray-600 text-sm hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          >
            ← ホーム
          </MyLink>
          <h1 className="font-bold text-gray-800 text-lg">タグエディター</h1>
          <div className="w-16" />
        </nav>
      </header>

      <div className="mx-auto max-w-6xl p-8">
        <div
          className={`mb-6 rounded-lg p-6 shadow-md transition-colors ${
            isDraggingFile
              ? "border-4 border-blue-500 border-dashed bg-blue-50"
              : "bg-white"
          }`}
          onDrop={handleFileDrop}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <h2 className="mb-4 font-semibold text-xl">ファイル操作</h2>
          {isDraggingFile && (
            <div className="mb-4 rounded border-2 border-blue-400 border-dashed bg-blue-100 p-4 text-center">
              <p className="font-semibold text-blue-600">
                ここにJSONファイルまたはTXTファイルをドロップ
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <label className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
              JSONファイルを読み込む
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={downloadJSON}
              className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
            >
              JSONファイルを保存
            </button>
            <label className="cursor-pointer rounded bg-orange-500 px-4 py-2 text-white hover:bg-orange-600">
              Outputファイルを読み込む
              <input
                type="file"
                accept=".txt"
                onChange={handleOutputFileUpload}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={downloadOutputs}
              className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
              disabled={data.outputs.length === 0}
            >
              Output テキストファイルを出力
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
            >
              すべてリセット
            </button>
          </div>
          {fileName && (
            <p className="mt-2 text-gray-600 text-sm">
              読み込んだファイル: {fileName}
            </p>
          )}
        </div>

        <div className="mb-6 rounded-lg bg-gray-100 p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-xl">Base Groups</h2>
            <button
              type="button"
              onClick={addBaseGroup}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              + グループ追加
            </button>
          </div>

          <GroupList
            groups={data.base.groups}
            onUpdateGroup={updateBaseGroup}
            onDeleteGroup={deleteBaseGroup}
            onReorderGroup={reorderBaseGroup}
            onAddTag={addTagToBaseGroup}
            onUpdateTag={updateBaseTag}
            onDeleteTag={deleteBaseTag}
            onMoveTag={moveBaseTag}
            onFileDropAddTags={addTagsToBaseGroupFromFile}
            dragType="base-tag"
            emptyMessage="Base Groupsがありません。「+ グループ追加」ボタンをクリックしてグループを作成してください。"
            onCrossGroupMove={(dragData, groupIndex, tagIndex) => {
              if (dragData.type === "base-tag") {
                // Base Groups内での移動
                moveBaseTag(
                  dragData.groupIndex,
                  dragData.tagIndex,
                  groupIndex,
                  tagIndex ?? data.base.groups[groupIndex].tags.length,
                );
              } else if (dragData.dragType === "output-tag") {
                // Output GroupsからBase Groupsへの移動
                moveTagFromOutputToBase(
                  dragData.outputIndex,
                  dragData.groupIndex,
                  dragData.tagIndex,
                  groupIndex,
                  tagIndex ?? data.base.groups[groupIndex].tags.length,
                );
              }
            }}
          />

          {/* Base Groups Preview */}
          <div className="mt-6">
            <h3 className="mb-2 font-semibold text-sm">
              Base Groups プレビュー:
            </h3>
            <div className="rounded border border-gray-300 bg-white p-3">
              <code className="text-gray-700 text-xs">
                {renderPreviewWithDuplicates(data.base.groups)}
              </code>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-xl">Outputs</h2>
            <button
              type="button"
              onClick={addOutput}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              + Output追加
            </button>
          </div>

          {data.outputs.length === 0 ? (
            <div className="rounded border-2 border-blue-300 border-dashed bg-white p-8 text-center">
              <p className="text-gray-500">
                Outputsがありません。「+
                Output追加」ボタンをクリックしてOutputを作成してください。
              </p>
            </div>
          ) : (
            data.outputs.map((output, outputIndex) => (
              <div
                key={outputIndex}
                className="mb-6 rounded-lg border-2 bg-purple-50 p-4"
              >
                <div className="mb-4 flex gap-2">
                  <div className="flex flex-1 items-center gap-2">
                    <label
                      htmlFor={`output-filename-${outputIndex}`}
                      className="font-medium text-sm"
                    >
                      ファイル名:
                    </label>
                    <input
                      id={`output-filename-${outputIndex}`}
                      type="text"
                      value={output.filename}
                      onChange={(e) =>
                        updateOutput(outputIndex, "filename", e.target.value)
                      }
                      className="flex-1 rounded border border-purple-300 bg-white px-3 py-2 font-medium shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="ファイル名"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteOutput(outputIndex)}
                    className="rounded bg-red-500 px-3 py-2 text-white hover:bg-red-600"
                  >
                    - Output削除
                  </button>
                </div>

                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">Groups</h3>
                    <button
                      type="button"
                      onClick={() => addGroupToOutput(outputIndex)}
                      className="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                    >
                      + グループ追加
                    </button>
                  </div>
                  <div className="ml-4">
                    <GroupList
                      groups={output.groups}
                      onUpdateGroup={(groupIndex, field, value) =>
                        updateOutputGroup(outputIndex, groupIndex, field, value)
                      }
                      onDeleteGroup={(groupIndex) =>
                        deleteOutputGroup(outputIndex, groupIndex)
                      }
                      onReorderGroup={(fromIndex, toIndex) =>
                        reorderOutputGroup(outputIndex, fromIndex, toIndex)
                      }
                      onAddTag={(groupIndex) =>
                        addTagToOutputGroup(outputIndex, groupIndex)
                      }
                      onUpdateTag={(groupIndex, tagIndex, value) =>
                        updateOutputTag(
                          outputIndex,
                          groupIndex,
                          tagIndex,
                          value,
                        )
                      }
                      onDeleteTag={(groupIndex, tagIndex) =>
                        deleteOutputTag(outputIndex, groupIndex, tagIndex)
                      }
                      onMoveTag={(
                        fromGroupIndex,
                        fromTagIndex,
                        toGroupIndex,
                        toTagIndex,
                      ) =>
                        moveOutputTag(
                          outputIndex,
                          fromGroupIndex,
                          fromTagIndex,
                          toGroupIndex,
                          toTagIndex,
                        )
                      }
                      onFileDropAddTags={(groupIndex, tags) =>
                        addTagsToOutputGroupFromFile(
                          outputIndex,
                          groupIndex,
                          tags,
                        )
                      }
                      dragType="output-tag"
                      outputIndex={outputIndex}
                      colorScheme={{
                        containerBg: "bg-blue-50",
                        containerBorder: "border-2",
                        groupBg: "bg-blue-50",
                        groupBorder: "border",
                        inputBorder: "border-blue-300",
                        inputFocus: "focus:border-blue-500 focus:ring-blue-500",
                        dropZoneBorder: "border-blue-300",
                        dropZoneBg: "bg-blue-50",
                        dropZoneBorderHover: "hover:border-blue-500",
                        dropZoneBgHover: "hover:bg-blue-100",
                        dropZoneBorderActive: "border-blue-600",
                        dropZoneBgActive: "bg-blue-200",
                        emptyTextColor: "text-blue-400",
                        tagMinWidth: "min-w-24",
                        tagFontSize: "text-xs",
                        tagWidthMultiplier: 7,
                        tagWidthOffset: 35,
                        buttonSize: "px-3 py-1",
                        buttonTextSize: "text-xs",
                      }}
                      emptyMessage="Groupsがありません。「+ グループ追加」ボタンをクリックしてください。"
                      onCrossGroupMove={(dragData, groupIndex, tagIndex) => {
                        if (dragData.type === "base-tag") {
                          // Base GroupsからOutput Groupsへの移動
                          moveTagFromBaseToOutput(
                            dragData.groupIndex,
                            dragData.tagIndex,
                            outputIndex,
                            groupIndex,
                            tagIndex ?? output.groups[groupIndex].tags.length,
                          );
                        } else if (
                          dragData.dragType === "output-tag" &&
                          dragData.outputIndex === outputIndex
                        ) {
                          // 同じOutput内のGroups間での移動
                          moveOutputTag(
                            outputIndex,
                            dragData.groupIndex,
                            dragData.tagIndex,
                            groupIndex,
                            tagIndex ?? output.groups[groupIndex].tags.length,
                          );
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Output Preview */}
                <div className="mt-4">
                  <h3 className="mb-2 font-semibold text-sm">
                    出力プレビュー:
                  </h3>
                  <div className="rounded border border-gray-300 bg-white p-3">
                    <code className="text-gray-700 text-xs">
                      {renderPreviewWithDuplicates(
                        data.base.groups,
                        output.groups,
                      )}
                    </code>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
