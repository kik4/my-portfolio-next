import { faGithub, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { DarkToggleButton } from "../_components/DarkToggleButton";
import { MyLink } from "../_components/MyLink";
import icon from "./_img/icon_1024x1024.jpg";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="fixed top-0 z-50 w-full bg-background/50 shadow-md backdrop-blur-sm">
        <nav className="container mx-auto flex justify-between px-6 py-5">
          <h1 className="font-bold text-2xl">
            <MyLink href="/" className="font-bold text-2xl">
              kik4.work
            </MyLink>
          </h1>
          <div className="flex gap-4">
            <a
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 font-medium text-gray-700 transition hover:bg-gray-200 hover:text-black dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
              href="https://github.com/kik4"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faGithub} size="lg" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <DarkToggleButton />
          </div>
        </nav>
      </header>
      {children}
      <footer className="bg-gray-800 pt-16 pb-8 text-white">
        <div className="container mx-auto px-6">
          <div className="mb-12 flex flex-wrap justify-between">
            <div className="mb-8 w-full md:mb-0 md:w-1/3">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-8 w-8 overflow-hidden rounded-full">
                  <Image
                    src={icon}
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                    alt="kik4"
                  />
                </div>
                <h3 className="font-bold text-xl">kik4</h3>
              </div>
              <p className="text-gray-400">
                Webエンジニア。現在はリードエンジニアとして自社開発プロジェクトに従事。フルリモート・フルフレックス勤務。
              </p>
            </div>
            <div className="mb-8 w-full md:mb-0 md:w-1/4">
              <h3 className="mb-4 font-bold text-xl">リンク</h3>
              <ul className="space-y-2">
                {[
                  { href: "#home", label: "ホーム" },
                  { href: "#work", label: "プロダクト" },
                  { href: "#skills", label: "代表スキル" },
                  { href: "#oss", label: "OSS活動" },
                  { href: "#tech-articles", label: "技術発信" },
                  { href: "#engineer-value", label: "特徴" },
                  { href: "#company-fit", label: "フィットする企業風土" },
                  { href: "#contact", label: "コンタクト" },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <MyLink
                      href={href}
                      className="text-gray-400 transition hover:text-white"
                    >
                      {label}
                    </MyLink>
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-full md:w-1/4">
              <h3 className="mb-4 font-bold text-xl">フォローする</h3>
              <div className="flex space-x-4">
                {[
                  { icon: faGithub, href: "https://github.com/kik4" },
                  { icon: faXTwitter, href: "https://x.com/_kik4_" },
                  { icon: "Q", href: "https://qiita.com/kik4" },
                ].map((social) => (
                  <a
                    key={social.href}
                    href={social.href}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 transition hover:bg-blue-600"
                  >
                    {typeof social.icon === "string" ? (
                      social.icon
                    ) : (
                      <FontAwesomeIcon icon={social.icon} />
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-gray-700 border-t pt-8 text-center text-gray-400">
            <p>&copy; kik4. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
