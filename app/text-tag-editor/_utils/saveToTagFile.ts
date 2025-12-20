import { toast } from "react-toastify";

export const saveToTagFile = (data: string, filename: string) => {
  try {
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("保存しました");
  } catch (error) {
    console.error("Failed to save file:", error);
    toast.error("保存に失敗しました");
  }
};
