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
    <article>
      {/* Header */}
      <header className="relative flex items-center justify-between gap-2 border-gray-200 border-b bg-white px-6 py-4 shadow-sm lg:px-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="2xl:w-24"></div>
        <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-between sm:flex-row">
          <div className="ml-12 lg:ml-0">
            <h1 className="font-bold text-2xl text-gray-900 dark:text-white">
              {title}
            </h1>
            <h2 className="text-gray-600 text-sm dark:text-gray-400">
              {description}
            </h2>
          </div>
          <div className="mt-1 flex items-end gap-2 text-gray-500 text-xs sm:flex-col sm:gap-0 sm:text-sm dark:text-gray-400">
            <time dateTime={createdAt}>作成日: {createdAt}</time>
            <time dateTime={updatedAt}>更新日: {updatedAt}</time>
          </div>
        </div>
        <DarkToggleButton />
      </header>

      {/* Article Content */}
      <div className="mb-16 flex-1 overflow-y-auto bg-white px-8 py-8 dark:bg-gray-800">
        <div className="mx-auto max-w-3xl [&_h1]:py-2 [&_h1]:font-bold [&_h1]:text-2xl [&_h2]:mt-6 [&_h2]:py-1 [&_h2]:font-bold [&_h2]:text-xl [&_p]:py-2">
          {children}
        </div>
      </div>
    </article>
  );
}
