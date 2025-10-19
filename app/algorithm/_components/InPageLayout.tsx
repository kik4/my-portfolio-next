import type { ReactNode } from "react";
import { DarkToggleButton } from "@/app/_components/DarkToggleButton";

export function InPageLayout({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description: string;
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
      <div className="mb-16 flex-1 overflow-y-auto bg-white px-8 py-8 dark:bg-gray-800">
        <div className="mx-auto max-w-4xl [&_h1]:py-2 [&_h1]:font-bold [&_h1]:text-2xl [&_h2]:mt-6 [&_h2]:py-1 [&_h2]:font-bold [&_h2]:text-xl [&_p]:py-2">
          {children}
        </div>
      </div>
    </>
  );
}
