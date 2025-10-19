"use client";

import { faGithub } from "@fortawesome/free-brands-svg-icons";
import {
  faBars,
  faExternalLinkAlt,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DarkToggleButton } from "./DarkToggleButton";
import { MyLink } from "./MyLink";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // クライアントサイドでのみマウント
  useEffect(() => {
    setMounted(true);
  }, []);

  // メニューが開いているときはbodyのスクロールを無効化
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const menuContent = (
    <>
      {/* オーバーレイ */}
      <button
        type="button"
        className={clsx(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          {
            "opacity-100": isOpen,
            "pointer-events-none opacity-0": !isOpen,
          },
        )}
        onClick={() => setIsOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setIsOpen(false);
        }}
        aria-label="メニューを閉じる"
        tabIndex={isOpen ? 0 : -1}
      />

      {/* スライドメニュー */}
      <div
        className={clsx(
          "fixed top-0 left-0 z-50 h-full w-64 transform bg-white transition-all duration-300 ease-out-quint md:hidden dark:bg-gray-900",
          {
            "translate-x-0 opacity-100 blur-none": isOpen,
            "-translate-x-full opacity-0 blur-sm lg:blur-none": !isOpen,
          },
        )}
      >
        <div className="flex h-full flex-col shadow-[inset_-10px_0_15px_-8px_rgba(0,0,0,0.2)] dark:shadow-[inset_-10px_0_15px_-8px_rgba(0,0,0,0.5)]">
          {/* ヘッダー部分 */}
          <div className="flex items-center justify-between border-gray-200 border-b p-4 dark:border-gray-700">
            <span className="font-bold text-lg">Menu</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 transition hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="メニューを閉じる"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>

          {/* メニュー項目 */}
          <nav className="flex flex-col gap-2 p-4">
            <MyLink
              href="/"
              className="rounded-lg px-4 py-3 font-medium transition hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsOpen(false)}
            >
              Home
            </MyLink>
            <MyLink
              href="/algorithm"
              className="rounded-lg px-4 py-3 font-medium transition hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsOpen(false)}
            >
              Algorithm
            </MyLink>
            <MyLink
              href="https://github.com/kik4"
              className="flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <FontAwesomeIcon icon={faGithub} size="lg" />
              <span>GitHub</span>
              <FontAwesomeIcon icon={faExternalLinkAlt} />
            </MyLink>
          </nav>

          {/* フッター部分（ダークモード切り替え） */}
          <div className="border-gray-200 border-t p-4 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <DarkToggleButton />
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ハンバーガーアイコンボタン */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center rounded-lg p-2 text-foreground transition hover:bg-gray-100 md:hidden dark:hover:bg-gray-800"
        aria-label="メニューを開く"
      >
        <FontAwesomeIcon icon={faBars} size="lg" />
      </button>

      {/* Portal でメニューを body 直下にレンダリング */}
      {mounted && createPortal(menuContent, document.body)}
    </>
  );
}
