"use client";

import clsx from "clsx";
import { useState } from "react";

export function Sidebar({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      {/* ハンバーガーメニューボタン（モバイル時のみ） */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-5 left-4 z-10 rounded-md border border-gray-300 bg-white p-2 lg:hidden dark:bg-gray-700"
        aria-label="メニューを開く"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>メニュー</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* オーバーレイ（モバイル時のみ） */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* サイドバー */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-30 w-64 flex-shrink-0 transform overflow-y-auto border-gray-200 border-r bg-white transition-all duration-300 ease-out-quint lg:relative lg:translate-x-0 lg:overflow-clip lg:opacity-100 dark:border-gray-700 dark:bg-gray-900",
          {
            "translate-x-0 opacity-100 blur-none": isSidebarOpen,
            "-translate-x-full opacity-0 blur-sm lg:blur-none": !isSidebarOpen,
          },
          "not-lg:shadow-[inset_-10px_0_15px_-8px_rgba(0,0,0,0.2)] dark:not-lg:shadow-[inset_-10px_0_15px_-8px_rgba(0,0,0,0.5)]",
        )}
      >
        {/* 閉じるボタン（モバイル時のみ） */}
        <div className="flex items-center justify-start border-gray-200 border-b p-2 lg:hidden dark:border-gray-700">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label="サイドバーを閉じる"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="sticky top-0">{children}</div>
      </aside>
    </>
  );
}
