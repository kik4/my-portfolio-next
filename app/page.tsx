import icon from "@/app/img/icon_1000x1000.jpg";
import projectF from "@/app/img/projectF.jpg";
import projectN from "@/app/img/projectN.jpg";
import projectP from "@/app/img/projectP.jpg";
import projectPf1 from "@/app/img/projectPf1.jpg";
import projectPf2 from "@/app/img/projectPf2.jpg";
import projectS from "@/app/img/projectS.jpg";
import { faGithub, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import { DarkToggleButton } from "./_components/DarkToggleButton";

export default function Home() {
  return (
    <>
      <header className="fixed top-0 z-50 w-full bg-background/50 shadow-md backdrop-blur-sm">
        <nav className="container mx-auto flex justify-between px-6 py-5">
          <Link href="/" className="font-bold text-2xl">
            kik4.work
          </Link>
          <div className="flex gap-4">
            <a
              className="flex items-center gap-1 hover:underline hover:underline-offset-4"
              href="https://github.com/kik4/my-portfolio-next"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faGithub} size="2x" />
            </a>
            <DarkToggleButton />
          </div>
        </nav>
      </header>

      <main>
        <section id="home" className="pt-32 pb-20">
          <div className="container mx-auto px-6">
            <div className="flex flex-col items-center justify-between md:flex-row">
              <div className="mb-10 md:mb-0 md:w-1/2">
                <h1 className="mb-6 font-bold text-5xl leading-tight">
                  Webエンジニア、
                  <br />
                  <span className="text-blue-600">kik4</span>です
                </h1>
                <div className="mb-8 text-lg">
                  <p>
                    “使えるUI”は、業務理解から。
                    自社開発の倉庫管理・EC・求職サイトなどの実務システム開発に従事。
                    TypeScriptを主軸に、フロントエンド中心のフルスタック開発を行っています。
                  </p>
                </div>
                <Link
                  href="#work"
                  className="rounded-full bg-blue-600 px-8 py-3 font-medium text-white transition hover:bg-blue-700"
                >
                  開発経歴を見る
                </Link>
              </div>
              <div className="md:w-5/12">
                <div className="relative mx-auto h-80 w-80">
                  <Image
                    src={icon}
                    fill
                    className="rounded-lg object-cover shadow-xl"
                    alt="kik4"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="work" className="bg-gray-50 py-20 dark:bg-gray-50/20">
          <div className="container mx-auto px-6">
            <h2 className="mb-16 text-center font-bold text-3xl">開発経歴</h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  category: "業務",
                  title: "倉庫検索ポータルサイト開発",
                  period: "2021〜",
                  description:
                    "最初の技術選定から始め、バックエンド/フロントエンドのほとんどの設計・開発を担当。主な機能は物件検索、問い合わせ、物件情報を他サービスとの連携、headless CMS を用いた記事掲載。",
                  image: projectP,
                  responsible: [
                    "要件定義",
                    "設計",
                    "実装",
                    "テスト",
                    "保守",
                  ].join(", "),
                  tech: `${[
                    "TypeScript",
                    "React (Next.js)",
                    "Node.js",
                    "Docker",
                    "Github",
                    "Github Actions",
                    "Vercel",
                    "Prisma",
                    "TailwindCSS",
                  ].join(", ")}...`,
                },
                {
                  category: "業務",
                  title: "業務用倉庫保管管理サービス開発",
                  period: "2018〜",
                  description:
                    "インフラを除いたバックエンド/フロントエンドの開発を担当。要ログイン業務システム。主な担当業務としては Slack のようなチャットシステムの構築、Vue 2 から Next.js への置き換えを実施した。",
                  image: projectS,
                  responsible: [
                    "要件定義",
                    "設計",
                    "実装",
                    "テスト",
                    "保守",
                  ].join(", "),
                  tech: `${[
                    "TypeScript",
                    "React (Next.js) / Vue.js",
                    "Node.js",
                    "Docker",
                    "Github",
                    "CircleCI",
                    "Vercel",
                    "TypeORM",
                    "TailwindCSS",
                  ].join(", ")}...`,
                },
                {
                  category: "業務",
                  title: "ECサイト群開発",
                  period: "2016〜2018",
                  description:
                    "複数のサービスを展開する中でバックエンド/フロントエンド新規機能開発、AWS EC2サーバ構築、CI環境構築、DB設計、ASP.NET Web FormsからMVCへの順次移行提案・実施、データ出力カスタムDSLの設計・式木を用いた実行システムの実装。",
                  image: projectF,
                  responsible: [
                    "要件定義",
                    "設計",
                    "実装",
                    "テスト",
                    "運用/保守",
                  ].join(", "),
                  tech: [
                    "C#",
                    "ASP.NET Web Forms/MVC",
                    "JavaScript",
                    "React+Redux",
                    "Vue.js",
                    "jQuery",
                    "AWS",
                    "SQL Server",
                    "IIS",
                    "Jenkins",
                    "GitBucket",
                  ].join(", "),
                },
                {
                  category: "業務",
                  title: "求職・求人サイト開発",
                  period: "2014〜2016",
                  description:
                    "バックエンド/フロントエンド新規機能開発。一部フォームデザインや開発環境整備なども実施。",
                  image: projectN,
                  responsible: [
                    "設計",
                    "実装",
                    "テスト",
                    "運用/保守",
                    "一部デザイン",
                  ].join(", "),
                  tech: [
                    "PHP",
                    "Laravel",
                    "JavaScript",
                    "React",
                    "jQuery",
                    "Apache",
                    "nginx",
                    "MariaDB",
                    "BootStrap",
                    "BitBucket",
                  ].join(", "),
                },
                {
                  category: "個人",
                  title: "ポートフォリオサイトv2",
                  period: "2024〜",
                  description:
                    "本ポートフォリオサイト。Next.js の app router や Biome などの新規技術の試用も兼ねて開発中。",
                  image: projectPf2,
                  responsible: ["全工程"].join(", "),
                  tech: [
                    "Next.js (app router)",
                    "React",
                    "TypeScript",
                    "TailwindCSS",
                    "Biome",
                    "AI",
                  ].join(", "),
                },
                {
                  category: "個人",
                  title: "ポートフォリオサイトv1",
                  period: "2018〜2019",
                  description:
                    "最初に作ったポートフォリオサイト。Nuxt, GAE, Go, Firebase などの技術の試用に作成。",
                  image: projectPf1,
                  responsible: ["全工程"].join(", "),
                  tech: [
                    "Nuxt.js",
                    "Vue.js",
                    "JavaScript",
                    "Google App Engine",
                    "Go",
                    "Firebase",
                  ].join(", "),
                },
              ].map((project) => (
                <div
                  key={project.title}
                  className="hover:-translate-y-2 overflow-hidden rounded-lg bg-white shadow-lg transition-transform dark:bg-gray-50/20"
                >
                  <div className="relative h-56">
                    <Image
                      src={project.image}
                      fill
                      className="object-cover"
                      alt=""
                    />
                  </div>
                  <div className="p-6">
                    <p className="mb-2 font-medium text-blue-600 dark:text-blue-300">
                      {project.category}
                      <span className="ml-2 text-gray-700/60 text-sm dark:text-gray-200/60">
                        {project.period}
                      </span>
                    </p>
                    <h3 className="mb-3 font-bold text-xl">{project.title}</h3>
                    <div className="flex flex-col gap-2 text-gray-600 dark:text-gray-300">
                      <p className="mb-2 text-gray-600 dark:text-gray-300">
                        {project.description}
                      </p>
                      <p className="text-gray-700/60 text-sm italic dark:text-gray-200/60">
                        {project.responsible}
                        <br />
                        {project.tech}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="skills" className="py-20">
          <div className="container mx-auto px-6">
            <h2 className="mb-16 text-center font-bold text-3xl">スキル</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: "💻",
                  title: "Webデザイン",
                  skills: "HTML5, CSS3, Responsive Design",
                },
                {
                  icon: "🎨",
                  title: "UI/UXデザイン",
                  skills: "プロトタイピング, インタラクションデザイン",
                },
                {
                  icon: "⚙️",
                  title: "フロントエンド開発",
                  skills: "TypeScript, React.js, Next.js, Vue.js",
                },
                {
                  icon: "🖥️",
                  title: "バックエンド開発",
                  skills: "Node.js, Express, Next.js",
                },
              ].map((skill) => (
                <div
                  key={skill.title}
                  className="rounded-lg bg-gray-50 p-8 text-center shadow-sm dark:bg-gray-50/20"
                >
                  <div className="mb-4 text-4xl">{skill.icon}</div>
                  <h3 className="mb-4 font-bold text-xl">{skill.title}</h3>
                  <p className="text-gray-600 dark:text-gray-200/60">
                    {skill.skills}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 pt-16 pb-8 text-white">
        <div className="container mx-auto px-6">
          <div className="mb-12 flex flex-wrap justify-between">
            <div className="mb-8 w-full md:mb-0 md:w-1/3">
              <h3 className="mb-4 font-bold text-xl">kik4</h3>
              <p className="text-gray-400">
                Webエンジニア（主にフロントエンド。フルスタックも担当）
              </p>
            </div>
            <div className="mb-8 w-full md:mb-0 md:w-1/4">
              <h3 className="mb-4 font-bold text-xl">リンク</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#home"
                    className="text-gray-400 transition hover:text-white"
                  >
                    ホーム
                  </Link>
                </li>
                <li>
                  <Link
                    href="#work"
                    className="text-gray-400 transition hover:text-white"
                  >
                    作品
                  </Link>
                </li>
                <li>
                  <Link
                    href="#skills"
                    className="text-gray-400 transition hover:text-white"
                  >
                    スキル
                  </Link>
                </li>
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
