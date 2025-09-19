import {
  faGithub,
  faNpm,
  faXTwitter,
} from "@fortawesome/free-brands-svg-icons";
import {
  faCodeBranch,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import icon from "@/app/img/icon_1000x1000.jpg";
import projectF from "@/app/img/projectF.jpg";
import projectN from "@/app/img/projectN.jpg";
import projectP from "@/app/img/projectP.jpg";
import projectPf1 from "@/app/img/projectPf1.jpg";
import projectPf2 from "@/app/img/projectPf2.jpg";
import projectS from "@/app/img/projectS.jpg";
import { AnimateOnScroll } from "./_components/AnimateOnScroll";
import { DarkToggleButton } from "./_components/DarkToggleButton";
import { WavyBackground } from "./_components/WavyBackground";

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

      <main>
        <section id="home" className="relative pt-32 pb-20">
          <WavyBackground />
          <div className="container mx-auto px-6">
            <div className="flex flex-col items-center justify-between md:flex-row">
              <AnimateOnScroll
                animation="slideRight"
                className="mb-10 md:mb-0 md:w-1/2"
              >
                <h1 className="mb-6 font-bold text-5xl leading-tight">
                  Webエンジニア、
                  <br />
                  <span className="text-accent">kik4</span>
                  です
                </h1>
                <div className="mb-10 space-y-4 text-lg">
                  <p className="border-b pb-1 font-medium">
                    <span className="text-accent">01.</span>{" "}
                    モダンな技術と効率的な開発で、スピード感あるプロダクト改善を実現。
                  </p>
                  <p className="border-b pb-1 font-medium">
                    <span className="text-accent">02.</span>{" "}
                    倉庫管理・EC・求職サイトなど、実務システム開発のスペシャリスト。
                  </p>
                  <p className="border-b pb-1 font-medium">
                    <span className="text-accent">03.</span>{" "}
                    TypeScriptを主軸に、フロントエンド中心のフルスタック開発。
                  </p>
                </div>
                <Link
                  href="#work"
                  className="rounded-full bg-blue-600 px-8 py-3 font-medium text-white transition hover:bg-blue-700"
                >
                  プロダクトを見る
                </Link>
              </AnimateOnScroll>
              <AnimateOnScroll animation="slideLeft" className="md:w-5/12">
                <div className="relative mx-auto h-80 w-80">
                  <Image
                    src={icon}
                    fill
                    className="rounded-lg object-cover shadow-xl"
                    alt="kik4"
                  />
                </div>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        <section id="work" className="bg-gray-50 py-20 dark:bg-gray-50/20">
          <div className="container mx-auto px-6">
            <AnimateOnScroll animation="fadeIn">
              <h2 className="mb-16 text-center font-bold text-3xl">
                プロダクト
              </h2>
            </AnimateOnScroll>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  category: "業務",
                  title: "倉庫検索ポータルサイト開発",
                  period: "2021〜",
                  description:
                    "最初の技術選定から始め、バックエンド/フロントエンドのほとんどの設計・開発を担当。主な機能は物件検索、問い合わせ、物件情報を他サービスとの連携、headless CMS を用いた記事掲載。GitHub Actions による CI/CD 環境構築も実施。",
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
                    "Docker/Docker Compose",
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
                    "インフラを除いたバックエンド/フロントエンドの開発を担当。要ログイン業務システム。主な担当業務としては Slack のようなリアルタイムチャットシステムの構築、Vue 2 から Next.js への置き換えを実施した。",
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
                    "Docker/Docker Compose",
                    "Github",
                    "CircleCI",
                    "Vercel",
                    "TypeORM",
                    "TailwindCSS",
                    "WebSocket",
                  ].join(", ")}...`,
                },
                {
                  category: "業務",
                  title: "ECサイト群開発",
                  period: "2015〜2018",
                  description:
                    "複数のサービスを展開する中でバックエンド/フロントエンド新規機能開発、AWS EC2サーバ構築、JenkinsによるCI環境構築、DB設計、ASP.NET Web FormsからMVCへの順次移行提案・実施、データ出力カスタムDSLの設計・式木を用いた実行システムの実装。",
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
                  period: "2014〜2015",
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
                    "AWS",
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
                    "pnpm",
                    "AI",
                  ].join(", "),
                  link: "https://github.com/kik4/my-portfolio-next",
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
              ].map((project, index) => (
                <AnimateOnScroll
                  key={project.title}
                  animation="slideUp"
                  delay={index * 0.1}
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
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-medium text-accent">
                        {project.category}
                        <span className="ml-2 text-gray-700/60 text-sm dark:text-gray-200/60">
                          {project.period}
                        </span>
                      </p>
                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-gray-600 px-2 py-1 font-medium text-white text-xs transition hover:bg-gray-700"
                        >
                          <FontAwesomeIcon icon={faGithub} size="sm" />
                          GitHub
                        </a>
                      )}
                    </div>
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
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>

        <section id="skills" className="py-20">
          <div className="container mx-auto px-6">
            <AnimateOnScroll animation="fadeIn">
              <h2 className="mb-16 text-center font-bold text-3xl">スキル</h2>
            </AnimateOnScroll>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
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
                  icon: "🗄️",
                  title: "バックエンド開発",
                  skills: "Node.js, Express, Next.js",
                },
                {
                  icon: "📖",
                  title: "IT知識",
                  skills: "情報工学専攻, 応用情報技術者資格取得",
                },
              ].map((skill, index) => (
                <AnimateOnScroll
                  key={skill.title}
                  animation="scale"
                  delay={index * 0.1}
                  className="rounded-lg bg-gray-50 p-8 text-center shadow-sm dark:bg-gray-50/20"
                >
                  <div className="mb-4 text-4xl">{skill.icon}</div>
                  <h3 className="mb-4 font-bold text-xl">{skill.title}</h3>
                  <p className="text-gray-600 dark:text-gray-200/60">
                    {skill.skills}
                  </p>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>

        <section id="oss" className="bg-gray-50 py-20 dark:bg-gray-50/20">
          <div className="container mx-auto px-6">
            <AnimateOnScroll animation="fadeIn">
              <h2 className="mb-16 text-center font-bold text-3xl">OSS活動</h2>
            </AnimateOnScroll>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {[
                {
                  icon: faCodeBranch,
                  title: "React公式ドキュメント日本語訳",
                  description:
                    "React公式ドキュメントの日本語訳プロジェクトに協力。新機能やAPIの翻訳作業を継続的に実施し、日本の開発者コミュニティへの貢献を行っています。",
                  link: "https://ja.react.dev/",
                  linkText: "React日本語ドキュメント",
                  type: "ドキュメント翻訳",
                },
                {
                  icon: faCodeBranch,
                  title: "react-intersection-observer",
                  description:
                    "人気のReactライブラリのバグ修正PRを送信。Intersection Observer APIを使用したライブラリの安定性向上に貢献しました。",
                  link: "https://github.com/thebuilder/react-intersection-observer",
                  linkText: "GitHubリポジトリ",
                  type: "バグ修正",
                },
                {
                  icon: faNpm,
                  title: "array-compressor",
                  description:
                    "配列の圧縮とセグメント化を効率的に行うnpmパッケージを開発・公開。データ処理の最適化に役立つユーティリティライブラリです。",
                  link: "https://www.npmjs.com/package/array-compressor",
                  linkText: "npmパッケージ",
                  type: "ライブラリ公開",
                },
                {
                  icon: faCodeBranch,
                  title: "simple-vercel-deploy",
                  description:
                    "Vercelへのデプロイを簡素化するGitHub Actionを開発・公開。CI/CDパイプラインの構築を効率化するツールです。",
                  link: "https://github.com/marketplace/actions/simple-vercel-deploy",
                  linkText: "GitHub Marketplace",
                  type: "GitHub Action",
                },
              ].map((item, index) => (
                <AnimateOnScroll
                  key={item.title}
                  animation="slideUp"
                  delay={index * 0.15}
                  className="hover:-translate-y-1 rounded-lg bg-white p-6 shadow-lg transition-transform dark:bg-gray-50/20"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <FontAwesomeIcon icon={item.icon} size="lg" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-bold text-lg">{item.title}</h3>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 text-xs dark:bg-gray-700/50 dark:text-gray-300">
                          {item.type}
                        </span>
                      </div>
                      <p className="mb-4 text-gray-600 dark:text-gray-300">
                        {item.description}
                      </p>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-blue-700"
                      >
                        <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" />
                        {item.linkText}
                      </a>
                    </div>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>

        <section id="tech-articles" className="py-20">
          <div className="container mx-auto px-6">
            <AnimateOnScroll animation="fadeIn">
              <h2 className="mb-16 text-center font-bold text-3xl">技術発信</h2>
            </AnimateOnScroll>

            <AnimateOnScroll animation="slideUp" delay={0.1}>
              <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 p-8 shadow-lg dark:from-gray-800/50 dark:to-gray-700/50">
                <div className="flex flex-col items-center gap-6 md:flex-row">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 text-white shadow-lg">
                    <span className="font-bold text-2xl">Q</span>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="mb-3 font-bold text-2xl">
                      Qiitaで技術記事を執筆
                    </h3>
                    <p className="mb-4 text-gray-600 dark:text-gray-300">
                      C#、.NET、TypeScript、PowerShell等の技術を中心に、実務で得た知見や実験した技術トピックを記事として投稿。
                      開発者コミュニティへの知識共有と技術普及に貢献しています。
                    </p>
                    <div className="mb-6 flex flex-wrap justify-center gap-2 md:justify-start">
                      {[
                        "C#",
                        ".NET",
                        "TypeScript",
                        "PowerShell",
                        "Web開発",
                      ].map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-green-100 px-3 py-1 text-green-700 text-sm dark:bg-green-900/30 dark:text-green-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <a
                      href="https://qiita.com/kik4"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700"
                    >
                      <FontAwesomeIcon icon={faExternalLinkAlt} />
                      Qiitaプロフィールを見る
                    </a>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 pt-16 pb-8 text-white">
        <div className="container mx-auto px-6">
          <div className="mb-12 flex flex-wrap justify-between">
            <div className="mb-8 w-full md:mb-0 md:w-1/3">
              <h3 className="mb-4 font-bold text-xl">kik4</h3>
              <p className="text-gray-400">
                Webエンジニア。現在はリードエンジニアとして自社開発プロジェクトに従事。フルリモート・フルフレックス勤務。
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
                    プロダクト
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
                <li>
                  <Link
                    href="#oss"
                    className="text-gray-400 transition hover:text-white"
                  >
                    OSS活動
                  </Link>
                </li>
                <li>
                  <Link
                    href="#tech-articles"
                    className="text-gray-400 transition hover:text-white"
                  >
                    技術発信
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
