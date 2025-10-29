"use client";

import { faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function XShareButton() {
  const handleShare = () => {
    const url = window.location.href;
    const text = document.title.replace("kik4.work", "kik4");
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank", "width=550,height=420");
  };

  return (
    <button
      className="inline-flex items-center rounded px-2 py-1 text-gray-600 hover:bg-gray-100/50 dark:text-gray-300 dark:hover:bg-gray-100/20"
      type="button"
      onClick={handleShare}
    >
      <FontAwesomeIcon
        className="mr-1 rounded bg-black p-0.5 text-white"
        icon={faXTwitter}
      />
      Xでシェア
    </button>
  );
}
