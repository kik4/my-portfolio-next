/** biome-ignore-all lint/suspicious/noArrayIndexKey: <for utility> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <for utility> */
"use client";

import { useState } from "react";
import { MyLink } from "../_components/MyLink";
import { getPathToHome } from "../(home)/getPath";

interface TagGroup {
  name: string;
  tags: string[];
}

interface Output {
  filename: string;
  groups: TagGroup[];
  "negative-groups": TagGroup[];
}

interface TagData {
  base: {
    groups: TagGroup[];
  };
  outputs: Output[];
}

export default function TagEditor() {
  const [data, setData] = useState<TagData>({
    base: {
      groups: [
        {
          name: "Group 1",
          tags: ["tag 1", "tag 2"],
        },
        {
          name: "Group 2",
          tags: ["tag 3", "tag 4", "tag 5"],
        },
      ],
    },
    outputs: [
      {
        filename: "1",
        groups: [],
        "negative-groups": [],
      },
      {
        filename: "2",
        groups: [
          {
            name: "Group 3",
            tags: ["tag 6"],
          },
        ],
        "negative-groups": [
          {
            name: "Negative Group 1",
            tags: ["tag 1", "tag 4"],
          },
        ],
      },
    ],
  });
  const [fileName, setFileName] = useState<string>("");

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
      // base.groupsの全タグを取得
      const baseTags = data.base.groups.flatMap((group) => group.tags);

      // outputのgroupsのタグを取得
      const outputGroupTags = output.groups.flatMap((group) => group.tags);

      // negative-groupsのタグを取得
      const negativeGroupTags = output["negative-groups"].flatMap(
        (group) => group.tags,
      );

      // baseタグとoutputタグを結合
      const allPositiveTags = [...baseTags, ...outputGroupTags];

      // negativeタグを除外
      const finalTags = allPositiveTags.filter(
        (tag) => !negativeGroupTags.includes(tag),
      );

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

  const addBaseGroup = () => {
    setData({
      ...data,
      base: {
        groups: [...data.base.groups, { name: "New Group", tags: [] }],
      },
    });
  };

  const updateBaseGroup = (
    index: number,
    field: keyof TagGroup,
    value: any,
  ) => {
    const newGroups = [...data.base.groups];
    newGroups[index] = { ...newGroups[index], [field]: value };
    setData({ ...data, base: { groups: newGroups } });
  };

  const deleteBaseGroup = (index: number) => {
    setData({
      ...data,
      base: {
        groups: data.base.groups.filter((_, i) => i !== index),
      },
    });
  };

  const reorderBaseGroup = (fromIndex: number, toIndex: number) => {
    const newGroups = [...data.base.groups];
    const [removed] = newGroups.splice(fromIndex, 1);
    newGroups.splice(toIndex, 0, removed);
    setData({ ...data, base: { groups: newGroups } });
  };

  const addTagToBaseGroup = (groupIndex: number) => {
    const newGroups = [...data.base.groups];
    newGroups[groupIndex].tags.push("");
    setData({ ...data, base: { groups: newGroups } });
  };

  const updateBaseTag = (
    groupIndex: number,
    tagIndex: number,
    value: string,
  ) => {
    const newGroups = [...data.base.groups];
    newGroups[groupIndex].tags[tagIndex] = value;
    setData({ ...data, base: { groups: newGroups } });
  };

  const deleteBaseTag = (groupIndex: number, tagIndex: number) => {
    const newGroups = [...data.base.groups];
    newGroups[groupIndex].tags = newGroups[groupIndex].tags.filter(
      (_, i) => i !== tagIndex,
    );
    setData({ ...data, base: { groups: newGroups } });
  };

  const moveBaseTag = (
    fromGroupIndex: number,
    fromTagIndex: number,
    toGroupIndex: number,
    toTagIndex: number,
  ) => {
    const newGroups = [...data.base.groups];

    // タグを取得して削除
    const tag = newGroups[fromGroupIndex].tags[fromTagIndex];
    newGroups[fromGroupIndex].tags = newGroups[fromGroupIndex].tags.filter(
      (_, i) => i !== fromTagIndex,
    );

    // 移動先に挿入
    newGroups[toGroupIndex].tags.splice(toTagIndex, 0, tag);

    setData({ ...data, base: { groups: newGroups } });
  };

  const addOutput = () => {
    setData({
      ...data,
      outputs: [
        ...data.outputs,
        { filename: "", groups: [], "negative-groups": [] },
      ],
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

  const addGroupToOutput = (
    outputIndex: number,
    type: "groups" | "negative-groups",
  ) => {
    const newOutputs = [...data.outputs];
    newOutputs[outputIndex][type].push({ name: "New Group", tags: [] });
    setData({ ...data, outputs: newOutputs });
  };

  const updateOutputGroup = (
    outputIndex: number,
    type: "groups" | "negative-groups",
    groupIndex: number,
    field: keyof TagGroup,
    value: any,
  ) => {
    const newOutputs = [...data.outputs];
    newOutputs[outputIndex][type][groupIndex] = {
      ...newOutputs[outputIndex][type][groupIndex],
      [field]: value,
    };
    setData({ ...data, outputs: newOutputs });
  };

  const deleteOutputGroup = (
    outputIndex: number,
    type: "groups" | "negative-groups",
    groupIndex: number,
  ) => {
    const newOutputs = [...data.outputs];
    newOutputs[outputIndex][type] = newOutputs[outputIndex][type].filter(
      (_, i) => i !== groupIndex,
    );
    setData({ ...data, outputs: newOutputs });
  };

  const reorderOutputGroup = (
    outputIndex: number,
    type: "groups" | "negative-groups",
    fromIndex: number,
    toIndex: number,
  ) => {
    const newOutputs = [...data.outputs];
    const groups = [...newOutputs[outputIndex][type]];
    const [removed] = groups.splice(fromIndex, 1);
    groups.splice(toIndex, 0, removed);
    newOutputs[outputIndex][type] = groups;
    setData({ ...data, outputs: newOutputs });
  };

  const addTagToOutputGroup = (
    outputIndex: number,
    type: "groups" | "negative-groups",
    groupIndex: number,
  ) => {
    const newOutputs = [...data.outputs];
    newOutputs[outputIndex][type][groupIndex].tags.push("");
    setData({ ...data, outputs: newOutputs });
  };

  const updateOutputTag = (
    outputIndex: number,
    type: "groups" | "negative-groups",
    groupIndex: number,
    tagIndex: number,
    value: string,
  ) => {
    const newOutputs = [...data.outputs];
    newOutputs[outputIndex][type][groupIndex].tags[tagIndex] = value;
    setData({ ...data, outputs: newOutputs });
  };

  const deleteOutputTag = (
    outputIndex: number,
    type: "groups" | "negative-groups",
    groupIndex: number,
    tagIndex: number,
  ) => {
    const newOutputs = [...data.outputs];
    newOutputs[outputIndex][type][groupIndex].tags = newOutputs[outputIndex][
      type
    ][groupIndex].tags.filter((_, i) => i !== tagIndex);
    setData({ ...data, outputs: newOutputs });
  };

  const moveOutputTag = (
    outputIndex: number,
    type: "groups" | "negative-groups",
    fromGroupIndex: number,
    fromTagIndex: number,
    toGroupIndex: number,
    toTagIndex: number,
  ) => {
    const newOutputs = [...data.outputs];

    // タグを取得して削除
    const tag =
      newOutputs[outputIndex][type][fromGroupIndex].tags[fromTagIndex];
    newOutputs[outputIndex][type][fromGroupIndex].tags = newOutputs[
      outputIndex
    ][type][fromGroupIndex].tags.filter((_, i) => i !== fromTagIndex);

    // 移動先に挿入
    newOutputs[outputIndex][type][toGroupIndex].tags.splice(toTagIndex, 0, tag);

    setData({ ...data, outputs: newOutputs });
  };

  // Base Groups から Output/Negative Groups へ移動
  const moveTagFromBaseToOutput = (
    fromGroupIndex: number,
    fromTagIndex: number,
    toOutputIndex: number,
    toType: "groups" | "negative-groups",
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

    // Output/Negative Groupsに挿入
    newOutputs[toOutputIndex][toType][toGroupIndex].tags.splice(
      toTagIndex,
      0,
      tag,
    );

    setData({ ...data, base: { groups: newGroups }, outputs: newOutputs });
  };

  // Output/Negative Groups から Base Groups へ移動
  const moveTagFromOutputToBase = (
    fromOutputIndex: number,
    fromType: "groups" | "negative-groups",
    fromGroupIndex: number,
    fromTagIndex: number,
    toGroupIndex: number,
    toTagIndex: number,
  ) => {
    const newGroups = [...data.base.groups];
    const newOutputs = [...data.outputs];

    // Output/Negative Groupsからタグを取得して削除
    const tag =
      newOutputs[fromOutputIndex][fromType][fromGroupIndex].tags[fromTagIndex];
    newOutputs[fromOutputIndex][fromType][fromGroupIndex].tags = newOutputs[
      fromOutputIndex
    ][fromType][fromGroupIndex].tags.filter((_, i) => i !== fromTagIndex);

    // Base Groupsに挿入
    newGroups[toGroupIndex].tags.splice(toTagIndex, 0, tag);

    setData({ ...data, base: { groups: newGroups }, outputs: newOutputs });
  };

  // Output/Negative Groups 間で移動
  const moveTagBetweenOutputTypes = (
    outputIndex: number,
    fromType: "groups" | "negative-groups",
    fromGroupIndex: number,
    fromTagIndex: number,
    toType: "groups" | "negative-groups",
    toGroupIndex: number,
    toTagIndex: number,
  ) => {
    const newOutputs = [...data.outputs];

    // 元のグループからタグを取得して削除
    const tag =
      newOutputs[outputIndex][fromType][fromGroupIndex].tags[fromTagIndex];
    newOutputs[outputIndex][fromType][fromGroupIndex].tags = newOutputs[
      outputIndex
    ][fromType][fromGroupIndex].tags.filter((_, i) => i !== fromTagIndex);

    // 移動先に挿入
    newOutputs[outputIndex][toType][toGroupIndex].tags.splice(
      toTagIndex,
      0,
      tag,
    );

    setData({ ...data, outputs: newOutputs });
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
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 font-semibold text-xl">ファイル操作</h2>
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
          </div>
          {fileName && (
            <p className="mt-2 text-gray-600 text-sm">
              読み込んだファイル: {fileName}
            </p>
          )}
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
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

          {data.base.groups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className="mb-4 rounded border bg-gray-50 p-4"
            >
              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) =>
                    updateBaseGroup(groupIndex, "name", e.target.value)
                  }
                  className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="グループ名"
                />
                <button
                  type="button"
                  onClick={() => reorderBaseGroup(groupIndex, groupIndex - 1)}
                  disabled={groupIndex === 0}
                  className="rounded bg-gray-400 px-3 py-2 text-white hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                  title="上に移動"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => reorderBaseGroup(groupIndex, groupIndex + 1)}
                  disabled={groupIndex === data.base.groups.length - 1}
                  className="rounded bg-gray-400 px-3 py-2 text-white hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                  title="下に移動"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => deleteBaseGroup(groupIndex)}
                  className="rounded bg-red-500 px-3 py-2 text-white hover:bg-red-600"
                >
                  削除
                </button>
              </div>

              <div className="ml-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-sm">Tags:</span>
                  <button
                    type="button"
                    onClick={() => addTagToBaseGroup(groupIndex)}
                    className="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                  >
                    + タグ追加
                  </button>
                </div>
                <div
                  className="min-h-[60px] rounded border-2 border-gray-300 border-dashed bg-gray-50 p-2 transition-colors hover:border-blue-400 hover:bg-blue-50"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    e.currentTarget.classList.add(
                      "border-blue-500",
                      "bg-blue-100",
                    );
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove(
                      "border-blue-500",
                      "bg-blue-100",
                    );
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove(
                      "border-blue-500",
                      "bg-blue-100",
                    );
                    const dragData = JSON.parse(
                      e.dataTransfer.getData("text/plain"),
                    );
                    if (dragData.type === "base-tag") {
                      // Base Groups内での移動
                      moveBaseTag(
                        dragData.groupIndex,
                        dragData.tagIndex,
                        groupIndex,
                        group.tags.length,
                      );
                    } else if (dragData.dragType === "output-tag") {
                      // Output/Negative GroupsからBase Groupsへの移動
                      moveTagFromOutputToBase(
                        dragData.outputIndex,
                        dragData.type,
                        dragData.groupIndex,
                        dragData.tagIndex,
                        groupIndex,
                        group.tags.length,
                      );
                    }
                  }}
                >
                  {group.tags.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-gray-400 text-sm">
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
                            e.dataTransfer.setData(
                              "text/plain",
                              JSON.stringify({
                                type: "base-tag",
                                groupIndex,
                                tagIndex,
                              }),
                            );
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const dragData = JSON.parse(
                              e.dataTransfer.getData("text/plain"),
                            );
                            if (dragData.type === "base-tag") {
                              moveBaseTag(
                                dragData.groupIndex,
                                dragData.tagIndex,
                                groupIndex,
                                tagIndex,
                              );
                            } else if (dragData.dragType === "output-tag") {
                              moveTagFromOutputToBase(
                                dragData.outputIndex,
                                dragData.type,
                                dragData.groupIndex,
                                dragData.tagIndex,
                                groupIndex,
                                tagIndex,
                              );
                            }
                          }}
                        >
                          <div className="relative flex w-32">
                            <input
                              type="text"
                              value={tag}
                              onChange={(e) =>
                                updateBaseTag(
                                  groupIndex,
                                  tagIndex,
                                  e.target.value,
                                )
                              }
                              className="w-full cursor-move rounded border border-gray-300 bg-white py-1 pr-7 pl-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="タグ"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                deleteBaseTag(groupIndex, tagIndex)
                              }
                              className="absolute top-0 right-0 flex h-full items-center justify-center rounded-r bg-red-400 px-1.5 text-sm text-white hover:bg-red-500"
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
          ))}

          {/* Base Groups Preview */}
          <div className="mt-6">
            <h3 className="mb-2 font-semibold text-sm">
              Base Groups プレビュー:
            </h3>
            <div className="rounded border border-gray-300 bg-white p-3">
              <code className="text-gray-700 text-xs">
                {data.base.groups.flatMap((group) => group.tags).join(", ")}
              </code>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
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

          {data.outputs.map((output, outputIndex) => (
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
                  Output削除
                </button>
              </div>

              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">Groups</h3>
                  <button
                    type="button"
                    onClick={() => addGroupToOutput(outputIndex, "groups")}
                    className="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                  >
                    + グループ追加
                  </button>
                </div>
                {output.groups.map((group, groupIndex) => (
                  <div
                    key={groupIndex}
                    className="mb-3 ml-4 rounded border bg-blue-50 p-3"
                  >
                    <div className="mb-2 flex gap-2">
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) =>
                          updateOutputGroup(
                            outputIndex,
                            "groups",
                            groupIndex,
                            "name",
                            e.target.value,
                          )
                        }
                        className="flex-1 rounded border border-blue-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="グループ名"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          reorderOutputGroup(
                            outputIndex,
                            "groups",
                            groupIndex,
                            groupIndex - 1,
                          )
                        }
                        disabled={groupIndex === 0}
                        className="rounded bg-gray-400 px-2 py-1 text-white text-xs hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                        title="上に移動"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          reorderOutputGroup(
                            outputIndex,
                            "groups",
                            groupIndex,
                            groupIndex + 1,
                          )
                        }
                        disabled={groupIndex === output.groups.length - 1}
                        className="rounded bg-gray-400 px-2 py-1 text-white text-xs hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                        title="下に移動"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          deleteOutputGroup(outputIndex, "groups", groupIndex)
                        }
                        className="rounded bg-red-400 px-3 py-1 text-sm text-white hover:bg-red-500"
                      >
                        削除
                      </button>
                    </div>
                    <div className="ml-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-xs">Tags:</span>
                        <button
                          type="button"
                          onClick={() =>
                            addTagToOutputGroup(
                              outputIndex,
                              "groups",
                              groupIndex,
                            )
                          }
                          className="rounded bg-green-400 px-2 py-1 text-white text-xs hover:bg-green-500"
                        >
                          + タグ
                        </button>
                      </div>
                      <div
                        className="min-h-[50px] rounded border-2 border-blue-300 border-dashed bg-blue-50 p-2 transition-colors hover:border-blue-500 hover:bg-blue-100"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          e.currentTarget.classList.add(
                            "!border-blue-600",
                            "!bg-blue-200",
                          );
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove(
                            "!border-blue-600",
                            "!bg-blue-200",
                          );
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove(
                            "!border-blue-600",
                            "!bg-blue-200",
                          );
                          const dragData = JSON.parse(
                            e.dataTransfer.getData("text/plain"),
                          );
                          if (dragData.type === "base-tag") {
                            // Base GroupsからOutput Groupsへの移動
                            moveTagFromBaseToOutput(
                              dragData.groupIndex,
                              dragData.tagIndex,
                              outputIndex,
                              "groups",
                              groupIndex,
                              group.tags.length,
                            );
                          } else if (
                            dragData.dragType === "output-tag" &&
                            dragData.outputIndex === outputIndex &&
                            dragData.type === "groups"
                          ) {
                            // 同じOutput内のGroups間での移動
                            moveOutputTag(
                              outputIndex,
                              "groups",
                              dragData.groupIndex,
                              dragData.tagIndex,
                              groupIndex,
                              group.tags.length,
                            );
                          } else if (
                            dragData.dragType === "output-tag" &&
                            dragData.outputIndex === outputIndex &&
                            dragData.type === "negative-groups"
                          ) {
                            // Negative GroupsからGroupsへの移動
                            moveTagBetweenOutputTypes(
                              outputIndex,
                              "negative-groups",
                              dragData.groupIndex,
                              dragData.tagIndex,
                              "groups",
                              groupIndex,
                              group.tags.length,
                            );
                          }
                        }}
                      >
                        {group.tags.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-blue-400 text-xs">
                            タグをここにドロップ
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {group.tags.map((tag, tagIndex) => (
                              <div
                                key={tagIndex}
                                className="flex gap-1"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData(
                                    "text/plain",
                                    JSON.stringify({
                                      dragType: "output-tag",
                                      outputIndex,
                                      type: "groups",
                                      groupIndex,
                                      tagIndex,
                                    }),
                                  );
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const dragData = JSON.parse(
                                    e.dataTransfer.getData("text/plain"),
                                  );
                                  if (dragData.type === "base-tag") {
                                    moveTagFromBaseToOutput(
                                      dragData.groupIndex,
                                      dragData.tagIndex,
                                      outputIndex,
                                      "groups",
                                      groupIndex,
                                      tagIndex,
                                    );
                                  } else if (
                                    dragData.dragType === "output-tag" &&
                                    dragData.outputIndex === outputIndex &&
                                    dragData.type === "groups"
                                  ) {
                                    moveOutputTag(
                                      outputIndex,
                                      "groups",
                                      dragData.groupIndex,
                                      dragData.tagIndex,
                                      groupIndex,
                                      tagIndex,
                                    );
                                  } else if (
                                    dragData.dragType === "output-tag" &&
                                    dragData.outputIndex === outputIndex &&
                                    dragData.type === "negative-groups"
                                  ) {
                                    moveTagBetweenOutputTypes(
                                      outputIndex,
                                      "negative-groups",
                                      dragData.groupIndex,
                                      dragData.tagIndex,
                                      "groups",
                                      groupIndex,
                                      tagIndex,
                                    );
                                  }
                                }}
                              >
                                <div className="relative flex w-24">
                                  <input
                                    type="text"
                                    value={tag}
                                    onChange={(e) =>
                                      updateOutputTag(
                                        outputIndex,
                                        "groups",
                                        groupIndex,
                                        tagIndex,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full cursor-move rounded border border-blue-300 bg-white py-1 pr-6 pl-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="タグ"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteOutputTag(
                                        outputIndex,
                                        "groups",
                                        groupIndex,
                                        tagIndex,
                                      )
                                    }
                                    className="absolute top-0 right-0 flex h-full items-center justify-center rounded-r bg-red-300 px-1 text-white text-xs hover:bg-red-400"
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
                ))}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">Negative Groups</h3>
                  <button
                    type="button"
                    onClick={() =>
                      addGroupToOutput(outputIndex, "negative-groups")
                    }
                    className="rounded bg-orange-500 px-3 py-1 text-sm text-white hover:bg-orange-600"
                  >
                    + Negativeグループ追加
                  </button>
                </div>
                {output["negative-groups"].map((group, groupIndex) => (
                  <div
                    key={groupIndex}
                    className="mb-3 ml-4 rounded border bg-orange-50 p-3"
                  >
                    <div className="mb-2 flex gap-2">
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) =>
                          updateOutputGroup(
                            outputIndex,
                            "negative-groups",
                            groupIndex,
                            "name",
                            e.target.value,
                          )
                        }
                        className="flex-1 rounded border border-orange-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        placeholder="グループ名"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          reorderOutputGroup(
                            outputIndex,
                            "negative-groups",
                            groupIndex,
                            groupIndex - 1,
                          )
                        }
                        disabled={groupIndex === 0}
                        className="rounded bg-gray-400 px-2 py-1 text-white text-xs hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                        title="上に移動"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          reorderOutputGroup(
                            outputIndex,
                            "negative-groups",
                            groupIndex,
                            groupIndex + 1,
                          )
                        }
                        disabled={
                          groupIndex === output["negative-groups"].length - 1
                        }
                        className="rounded bg-gray-400 px-2 py-1 text-white text-xs hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                        title="下に移動"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          deleteOutputGroup(
                            outputIndex,
                            "negative-groups",
                            groupIndex,
                          )
                        }
                        className="rounded bg-red-400 px-3 py-1 text-sm text-white hover:bg-red-500"
                      >
                        削除
                      </button>
                    </div>
                    <div className="ml-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-xs">Tags:</span>
                        <button
                          type="button"
                          onClick={() =>
                            addTagToOutputGroup(
                              outputIndex,
                              "negative-groups",
                              groupIndex,
                            )
                          }
                          className="rounded bg-orange-400 px-2 py-1 text-white text-xs hover:bg-orange-500"
                        >
                          + タグ
                        </button>
                      </div>
                      <div
                        className="min-h-[50px] rounded border-2 border-orange-300 border-dashed bg-orange-50 p-2 transition-colors hover:border-orange-500 hover:bg-orange-100"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          e.currentTarget.classList.add(
                            "!border-orange-600",
                            "!bg-orange-200",
                          );
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove(
                            "!border-orange-600",
                            "!bg-orange-200",
                          );
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove(
                            "!border-orange-600",
                            "!bg-orange-200",
                          );
                          const dragData = JSON.parse(
                            e.dataTransfer.getData("text/plain"),
                          );
                          if (dragData.type === "base-tag") {
                            // Base GroupsからNegative Groupsへの移動
                            moveTagFromBaseToOutput(
                              dragData.groupIndex,
                              dragData.tagIndex,
                              outputIndex,
                              "negative-groups",
                              groupIndex,
                              group.tags.length,
                            );
                          } else if (
                            dragData.dragType === "output-tag" &&
                            dragData.outputIndex === outputIndex &&
                            dragData.type === "negative-groups"
                          ) {
                            // 同じOutput内のNegative Groups間での移動
                            moveOutputTag(
                              outputIndex,
                              "negative-groups",
                              dragData.groupIndex,
                              dragData.tagIndex,
                              groupIndex,
                              group.tags.length,
                            );
                          } else if (
                            dragData.dragType === "output-tag" &&
                            dragData.outputIndex === outputIndex &&
                            dragData.type === "groups"
                          ) {
                            // GroupsからNegative Groupsへの移動
                            moveTagBetweenOutputTypes(
                              outputIndex,
                              "groups",
                              dragData.groupIndex,
                              dragData.tagIndex,
                              "negative-groups",
                              groupIndex,
                              group.tags.length,
                            );
                          }
                        }}
                      >
                        {group.tags.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-orange-400 text-xs">
                            タグをここにドロップ
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {group.tags.map((tag, tagIndex) => (
                              <div
                                key={tagIndex}
                                className="flex gap-1"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData(
                                    "text/plain",
                                    JSON.stringify({
                                      dragType: "output-tag",
                                      outputIndex,
                                      type: "negative-groups",
                                      groupIndex,
                                      tagIndex,
                                    }),
                                  );
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const dragData = JSON.parse(
                                    e.dataTransfer.getData("text/plain"),
                                  );
                                  if (dragData.type === "base-tag") {
                                    moveTagFromBaseToOutput(
                                      dragData.groupIndex,
                                      dragData.tagIndex,
                                      outputIndex,
                                      "negative-groups",
                                      groupIndex,
                                      tagIndex,
                                    );
                                  } else if (
                                    dragData.dragType === "output-tag" &&
                                    dragData.outputIndex === outputIndex &&
                                    dragData.type === "negative-groups"
                                  ) {
                                    moveOutputTag(
                                      outputIndex,
                                      "negative-groups",
                                      dragData.groupIndex,
                                      dragData.tagIndex,
                                      groupIndex,
                                      tagIndex,
                                    );
                                  } else if (
                                    dragData.dragType === "output-tag" &&
                                    dragData.outputIndex === outputIndex &&
                                    dragData.type === "groups"
                                  ) {
                                    moveTagBetweenOutputTypes(
                                      outputIndex,
                                      "groups",
                                      dragData.groupIndex,
                                      dragData.tagIndex,
                                      "negative-groups",
                                      groupIndex,
                                      tagIndex,
                                    );
                                  }
                                }}
                              >
                                <div className="relative flex w-24">
                                  <input
                                    type="text"
                                    value={tag}
                                    onChange={(e) =>
                                      updateOutputTag(
                                        outputIndex,
                                        "negative-groups",
                                        groupIndex,
                                        tagIndex,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full cursor-move rounded border border-orange-300 bg-white py-1 pr-6 pl-2 text-xs shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    placeholder="タグ"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteOutputTag(
                                        outputIndex,
                                        "negative-groups",
                                        groupIndex,
                                        tagIndex,
                                      )
                                    }
                                    className="absolute top-0 right-0 flex h-full items-center justify-center rounded-r bg-red-300 px-1 text-white text-xs hover:bg-red-400"
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
                ))}
              </div>

              {/* Output Preview */}
              <div className="mt-4">
                <h3 className="mb-2 font-semibold text-sm">出力プレビュー:</h3>
                <div className="rounded border border-gray-300 bg-white p-3">
                  <code className="text-gray-700 text-xs">
                    {(() => {
                      const baseTags = data.base.groups.flatMap(
                        (group) => group.tags,
                      );
                      const outputGroupTags = output.groups.flatMap(
                        (group) => group.tags,
                      );
                      const negativeGroupTags = output[
                        "negative-groups"
                      ].flatMap((group) => group.tags);
                      const allPositiveTags = [...baseTags, ...outputGroupTags];
                      const finalTags = allPositiveTags.filter(
                        (tag) => !negativeGroupTags.includes(tag),
                      );
                      return finalTags.join(", ");
                    })()}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
