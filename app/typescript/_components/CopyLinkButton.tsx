"use client";

import { Link } from "lucide-react";
import { useState } from "react";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  return (
    <button
      className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100/50 dark:text-gray-300 dark:hover:bg-gray-100/20"
      type="button"
      onClick={handleCopyLink}
    >
      <Link className="mr-1 inline-block" size={16} />
      {copied ? "コピーしました！" : "リンクをコピー"}
    </button>
  );
}
