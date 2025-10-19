import { faGithub, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import icon from "@/app/_img/icon_400x400.jpg";
import { MyLink } from "./MyLink";

export function Footer({ isHome = false }: { isHome?: boolean }) {
  return (
    <footer className="border-gray-200 border-t bg-gray-800 pt-16 pb-8 text-white dark:border-gray-700 dark:bg-gray-900">
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
                { href: { pathname: "/" }, label: "ホーム" },
                ...(!isHome
                  ? [
                      {
                        href: { pathname: "/algorithm" },
                        label: "アルゴリズム",
                      },
                    ]
                  : [
                      {
                        href: { pathname: "/", hash: "#work" },
                        label: "プロダクト",
                      },
                      {
                        href: { pathname: "/", hash: "#skills" },
                        label: "代表スキル",
                      },
                      {
                        href: { pathname: "/", hash: "#oss" },
                        label: "OSS活動",
                      },
                      {
                        href: { pathname: "/", hash: "#tech-articles" },
                        label: "技術発信",
                      },
                      {
                        href: { pathname: "/", hash: "#engineer-value" },
                        label: "特徴",
                      },
                      {
                        href: { pathname: "/", hash: "#company-fit" },
                        label: "フィットする企業風土",
                      },
                      {
                        href: { pathname: "/", hash: "#contact" },
                        label: "コンタクト",
                      },
                    ]),
              ].map(({ href, label }) => (
                <li key={label}>
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
                <MyLink
                  key={social.href}
                  href={social.href}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 transition hover:bg-blue-600"
                >
                  {typeof social.icon === "string" ? (
                    social.icon
                  ) : (
                    <FontAwesomeIcon icon={social.icon} />
                  )}
                </MyLink>
              ))}
            </div>
          </div>
        </div>
        <div className="border-gray-700 border-t pt-8 text-center text-gray-400">
          <p>&copy; kik4. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
