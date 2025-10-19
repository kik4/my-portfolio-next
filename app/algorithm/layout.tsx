import type { ReactNode } from "react";
import { Footer } from "../_components/Footer";
import { MyLink } from "../_components/MyLink";
import { Sidebar } from "./_components/Sidebar";
import { SidebarLink } from "./_components/SidebarLink";
import { algorithmPageTitle, sections } from "./_lib/articles";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flex min-h-screen bg-white dark:bg-gray-800">
        {/* Sidebar */}
        <Sidebar>
          {/* コンテンツ */}
          <div className="p-6">
            <MyLink href="/algorithm" className="mb-6 block">
              <h2 className="font-bold text-gray-900 text-medium dark:text-white">
                {algorithmPageTitle}
              </h2>
            </MyLink>

            <nav className="space-y-6">
              {sections.map((section) => (
                <div key={section.id}>
                  <h3 className="mb-2 font-semibold text-gray-700 text-sm uppercase tracking-wider dark:text-gray-300">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.slug}>
                        <SidebarLink href={`/algorithm/${item.slug}`}>
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
              href="/"
              className="flex items-center gap-2 text-gray-500 text-sm transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <span>←</span>
              <h1>kik4.work</h1>
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
