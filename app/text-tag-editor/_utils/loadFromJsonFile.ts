import { toast } from "react-toastify";

export const loadFromFile = (onLoad: (content: string) => void) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        onLoad(content);
      } catch (error) {
        console.error("Failed to load file:", error);
        toast.error("ファイルの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);
  };
  input.click();
};
