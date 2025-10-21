import type { ReactNode } from "react";
import { DarkToggleButton } from "@/app/_components/DarkToggleButton";

export function InPageLayout({
  children,
  title,
  description,
  createdAt,
  updatedAt,
}: {
  children: ReactNode;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}) {
  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between border-gray-200 border-b bg-white px-6 py-4 shadow-sm lg:px-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="pl-12 lg:pl-0">
          <h1 className="font-bold text-2xl text-gray-900 dark:text-white">
            {title}
          </h1>
          <h2 className="text-gray-600 text-sm dark:text-gray-400">
            {description}
          </h2>
        </div>
        <DarkToggleButton />
      </header>

      {/* Article Content */}
      <div className="mb-16 flex-1 overflow-y-auto bg-white px-8 pt-4 pb-8 dark:bg-gray-800">
        <div className="mx-auto flex max-w-4xl flex-col items-end">
          <time
            dateTime={createdAt}
            className="block text-gray-500 text-sm dark:text-gray-400"
          >
            作成日: {createdAt}
          </time>
          <time
            dateTime={updatedAt}
            className="block text-gray-500 text-sm dark:text-gray-400"
          >
            更新日: {updatedAt}
          </time>
        </div>
        <div className="mx-auto max-w-3xl [&_h1]:py-2 [&_h1]:font-bold [&_h1]:text-2xl [&_h2]:mt-6 [&_h2]:py-1 [&_h2]:font-bold [&_h2]:text-xl [&_p]:py-2">
          {children}
        </div>
      </div>
    </>
  );
}
