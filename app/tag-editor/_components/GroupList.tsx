/** biome-ignore-all lint/suspicious/noArrayIndexKey: <for utility> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <ok> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <for utility> */

export interface TagGroup {
  name: string;
  tags: string[];
}

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
  isDuplicateTag: (tags: string[], currentTag: string) => boolean;
}

export const GroupList = ({
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
  isDuplicateTag,
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
                      onCrossGroupMove(dragData, groupIndex, group.tags.length);
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

                          const dataText = e.dataTransfer.getData("text/plain");
                          if (!dataText) return; // No data to parse

                          try {
                            const dragData = JSON.parse(dataText);

                            // Check if this is a cross-group move
                            if (onCrossGroupMove) {
                              onCrossGroupMove(dragData, groupIndex, tagIndex);
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
                              onUpdateTag(groupIndex, tagIndex, e.target.value)
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
                              width: `${Math.max(tag.length * colorScheme.tagWidthMultiplier + colorScheme.tagWidthOffset, parseInt(colorScheme.tagMinWidth.replace("min-w-", ""), 10) * 4)}px`,
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
