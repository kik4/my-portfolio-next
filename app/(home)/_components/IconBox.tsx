import { clsx } from "clsx";
import type { ReactNode } from "react";

// セクション共通のアイコン枠（アクセント色の薄い背景）
export const IconBox = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={clsx(
      "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
      className,
    )}
  >
    {children}
  </div>
);
