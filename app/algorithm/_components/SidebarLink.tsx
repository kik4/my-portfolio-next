"use client";

import { usePathname } from "next/navigation";
import { MyLink } from "@/app/_components/MyLink";

export function SidebarLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <MyLink
      href={href}
      className={`block w-full rounded px-3 py-2 text-left text-sm transition ${
        isActive
          ? "bg-blue-50 font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
      }`}
    >
      {children}
    </MyLink>
  );
}
