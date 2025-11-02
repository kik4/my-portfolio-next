import type { ReactNode } from "react";
import { Footer } from "../_components/Footer";
import { MyLink } from "../_components/MyLink";
import { getPathToHome } from "../(home)/getPath";
import { Sidebar } from "./_components/Sidebar";
import { SidebarLink } from "./_components/SidebarLink";
import { sections } from "./_lib/articles";
import { algorithmPageTitle } from "./_lib/consts";
import { getPathToTypeScript, getPathToTypeScriptArticle } from "./getPath";

// Revalidate layout every hour
export const revalidate = 3600;

export default function Layout({ children }: { children: ReactNode }) {
  const now = new Date();

  // Filter sections to only show published articles
  const publishedSections = sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => new Date(item.createdAt) <= now),
  }));

  return (
    <>
      <div className="flex min-h-screen bg-white dark:bg-gray-800">
        {/* Sidebar */}
        <Sidebar>
          {/* コンテンツ */}
          <div className="p-6">
            <MyLink href={getPathToTypeScript()} className="mb-6 block">
              <h1 className="font-bold text-gray-900 text-medium dark:text-white">
                {algorithmPageTitle}
              </h1>
            </MyLink>

            <nav className="space-y-6">
              {publishedSections.map((section) => (
                <div key={section.id}>
                  <h3 className="mb-2 font-semibold text-gray-700 text-sm uppercase tracking-wider dark:text-gray-300">
                    {section.title}
                  </h3>
                  <ul>
                    {section.items.map((item) => (
                      <li key={getPathToTypeScriptArticle(item.slug)}>
                        <SidebarLink
                          href={getPathToTypeScriptArticle(item.slug)}
                        >
                          {item.title}
                        </SidebarLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          {/* トップページに戻るリンク */}
          <div className="border-gray-200 border-t p-4 dark:border-gray-700">
            <MyLink
              href={getPathToHome()}
              className="flex items-center gap-2 text-gray-500 text-sm transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <span>←</span>
              kik4.work
            </MyLink>
          </div>
        </Sidebar>

        {/* Main Content */}
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      <Footer />
    </>
  );
}
