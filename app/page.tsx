import {
  faGithub,
  faNodeJs,
  faNpm,
  faReact,
  faXTwitter,
} from "@fortawesome/free-brands-svg-icons";
import {
  faCodeBranch,
  faDatabase,
  faExternalLinkAlt,
  faServer,
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
                    モダンな技術と効率的な開発環境構築で、プロダクトを高速に改善。
                  </p>
                  <p className="border-b pb-1 font-medium">
                    <span className="text-accent">02.</span>{" "}
                    倉庫管理・EC・求職サイトなど、実務システム開発のスペシャリスト。
                  </p>
                  <p className="border-b pb-1 font-medium">
                    <span className="text-accent">03.</span>{" "}
                    TypeScriptを主軸に、バックエンドもフロントエンドも対応可能。
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
                    "最初の技術選定から始め、詳細設計・開発を主に一人で担当して半年でリリース。主な機能は物件検索、問い合わせ、物件情報を他サービスとの連携、headless CMS を用いた記事掲載。表示パフォーマンスの改善やSEO対策でユーザー数増加。GitHub Actions による CI/CD 環境構築も実施。",
                  image: projectP,
                  responsible: [
                    "要件定義",
                    "設計",
                    "実装",
                    "テスト",
                    "保守",
                  ].join(", "),
                  scale: "小規模・1-2名",
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
                    "PostgreSQL",
                    "AWS",
                  ].join(", ")}...`,
                },
                {
                  category: "業務",
                  title: "業務用倉庫保管管理サービス開発",
                  period: "2018〜",
                  description:
                    "小規模時から参加しプロダクトの成長に貢献。バックエンド/フロントエンドの機能開発を担当。要ログイン業務システム。特筆すべき担当業務としてはリアルタイムチャットシステムの構築、Vue 2 から Next.js への置き換えによりモダン化とビルド時間の100倍短縮を実現。",
                  image: projectS,
                  responsible: [
                    "要件定義",
                    "設計",
                    "実装",
                    "テスト",
                    "保守",
                  ].join(", "),
                  scale: "中規模・3-5名",
                  tech: `${[
                    "TypeScript",
                    "React (Next.js) / Vue.js",
                    "Node.js",
                    "Express",
                    "Docker/Docker Compose",
                    "Github",
                    "CircleCI",
                    "Vercel",
                    "TypeORM",
                    "TailwindCSS",
                    "WebSocket",
                    "PostgreSQL",
                    "Redis",
                    "AWS",
                  ].join(", ")}...`,
                },
                {
                  category: "業務",
                  title: "ECサイト群開発",
                  period: "2015〜2018",
                  description:
                    "複数のサービスを展開する中でバックエンド/フロントエンド新規機能開発、AWS EC2サーバ構築、JenkinsによるCI環境構築、DB設計、ASP.NET Web FormsからMVCへの順次移行提案・実施、データ出力カスタムDSLの設計・式木を用いた実行システムの実装。新規サイトの立ち上げも経験。",
                  image: projectF,
                  responsible: [
                    "要件定義",
                    "設計",
                    "実装",
                    "テスト",
                    "運用/保守",
                  ].join(", "),
                  scale: "大規模・10名以上",
                  tech: `${[
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
                    "Windows Server",
                  ].join(", ")}...`,
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
                  scale: "小規模・2-3名",
                  tech: `${[
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
                    "Vagrant",
                  ].join(", ")}...`,
                },
                {
                  category: "個人",
                  title: "ポートフォリオサイトv2",
                  period: "2024〜",
                  description:
                    "本ポートフォリオサイト。Next.js の app router や Biome などの新規技術の試用も兼ねて開発中。",
                  image: projectPf2,
                  responsible: ["全工程"].join(", "),
                  scale: "個人開発・1名",
                  tech: `${[
                    "Next.js (app router)",
                    "React",
                    "TypeScript",
                    "TailwindCSS",
                    "Vercel",
                    "Biome",
                    "pnpm",
                    "AI Coding",
                  ].join(", ")}...`,
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
                  scale: "個人開発・1名",
                  tech: `${[
                    "Nuxt.js",
                    "Vue.js",
                    "JavaScript",
                    "Google App Engine",
                    "Go",
                    "Firebase",
                  ].join(", ")}...`,
                  link: "https://github.com/kik4/my-portfolio-nuxt",
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
                        <span className="text-green-600 dark:text-green-400">
                          {project.responsible}
                        </span>
                        <br />
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {project.scale}
                        </span>
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
              <h2 className="mb-16 text-center font-bold text-3xl">
                代表スキル
              </h2>
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
                  skills: "TypeScript, React.js, Next.js",
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

            {/* Tech Stack Icons */}
            <AnimateOnScroll animation="fadeIn" delay={0.3}>
              <div className="mt-12 flex flex-wrap justify-center gap-8">
                {[
                  { name: "TypeScript", icon: "TS", color: "bg-blue-600" },
                  { name: "React", icon: faReact, color: "bg-cyan-500" },
                  { name: "Next.js", icon: "N", color: "bg-black" },
                  { name: "Node.js", icon: faNodeJs, color: "bg-green-700" },
                  { name: "GitHub", icon: faGithub, color: "bg-gray-800" },
                  { name: "Express", icon: faServer, color: "bg-green-600" },
                  {
                    name: "PostgreSQL",
                    icon: faDatabase,
                    color: "bg-blue-800",
                  },
                  { name: "Vercel", icon: "▲", color: "bg-black" },
                ].map((tech) => (
                  <div
                    key={tech.name}
                    className="group flex flex-col items-center gap-2"
                  >
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-xl ${tech.color} text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}
                    >
                      {typeof tech.icon === "string" ? (
                        <span className="font-bold text-xl">{tech.icon}</span>
                      ) : (
                        <FontAwesomeIcon icon={tech.icon} size="xl" />
                      )}
                    </div>
                    <span className="font-medium text-gray-600 text-sm dark:text-gray-400">
                      {tech.name}
                    </span>
                  </div>
                ))}
              </div>
            </AnimateOnScroll>
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
              <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100 p-8 shadow-lg dark:from-blue-800/50 dark:to-blue-700/50">
                <div className="flex flex-col items-center gap-6 md:flex-row">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black text-white shadow-lg">
                    <FontAwesomeIcon icon={faXTwitter} size="2x" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="mb-3 font-bold text-2xl">
                      Xで技術情報を発信
                    </h3>
                    <p className="mb-4 text-gray-600 dark:text-gray-300">
                      日常的なつぶやきの他に開発の気づき、学習した内容をリアルタイムで投稿。
                      他の開発者の投稿から学びを得ながら、最新の技術トレンドを追いかけています。
                    </p>
                    <div className="mb-6 flex flex-wrap justify-center gap-2 md:justify-start">
                      {[
                        "技術トレンド",
                        "開発Tips",
                        "学習記録",
                        "コミュニティ",
                      ].map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 text-sm dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <a
                      href="https://x.com/_kik4_"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800"
                    >
                      <FontAwesomeIcon icon={faXTwitter} />
                      Xプロフィールを見る
                    </a>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll animation="slideUp" delay={0.2}>
              <div className="mx-auto mt-8 max-w-4xl rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 p-8 shadow-lg dark:from-gray-800/50 dark:to-gray-700/50">
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

        <section
          id="engineer-value"
          className="bg-gray-50 py-20 dark:bg-gray-50/20"
        >
          <div className="container mx-auto px-6">
            <AnimateOnScroll animation="fadeIn">
              <h2 className="mb-16 text-center font-bold text-3xl">
                エンジニアとしての特徴
              </h2>
            </AnimateOnScroll>

            <div className="mx-auto max-w-6xl">
              <AnimateOnScroll animation="slideUp" delay={0.1}>
                <div className="mb-8 rounded-2xl bg-gradient-to-r from-purple-100 to-blue-100 p-8 shadow-lg dark:from-purple-800/50 dark:to-blue-800/50">
                  <div className="mb-6 text-center">
                    <div className="group mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full shadow-lg transition-all duration-300 hover:animate-shake hover:blur-[1px]">
                      <Image
                        src={icon}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                        alt="kik4"
                      />
                    </div>
                    <h3 className="mb-4 font-bold text-2xl">
                      堅実かつ迅速開発に邁進するエンジニア
                    </h3>
                    <p className="mx-auto max-w-3xl text-gray-600 [line-break:strict] dark:text-gray-300">
                      私は日々の開発業務に集中し、
                      スピード感のある業務を心がけ、
                      成長し続けるコードを書き続けてきました。
                      そんな「もくもく系」の私の特徴をご紹介します。
                    </p>
                  </div>
                </div>
              </AnimateOnScroll>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    icon: "📚",
                    title: "継続的な技術習得",
                    points: [
                      "2014年から10年以上の実務経験を積み重ね",
                      "PHP → C# → TypeScriptとプロダクトと時代に応じて柔軟にアップデート",
                      "個人プロジェクトで新技術を積極的に試用",
                    ],
                  },
                  {
                    icon: "⚡",
                    title: "幅広い開発対応力",
                    points: [
                      "バックエンドからフロントエンド、インフラまで担当",
                      "要件定義から保守まで全工程を経験",
                      "倉庫管理システムを安定運用中",
                    ],
                  },
                  {
                    icon: "🏃",
                    title: "スピードと挑戦を重視した開発",
                    points: [
                      "プロジェクトに最適な技術選定を心がけ",
                      "爆速開発で短期間でのリリースを実現",
                      "Vue 2→Next.js移行など技術的負債を積極的に解決",
                    ],
                  },
                  {
                    icon: "🤝",
                    title: "開発者コミュニティへの貢献",
                    points: [
                      "React公式ドキュメントの日本語翻訳に参加",
                      "Qiitaで実務経験に基づく技術記事を執筆",
                      "npmパッケージ・GitHub Actionを開発・公開",
                    ],
                  },
                  {
                    icon: "📈",
                    title: "リモートワークでの高い生産性",
                    points: [
                      "フルリモート・フルフレックス環境で集中開発",
                      "迅速なアウトプットを維持",
                      "6年間継続しているプロジェクトで責任感を発揮",
                    ],
                  },
                  {
                    icon: "💡",
                    title: "現代開発スタイルへの適応",
                    points: [
                      "GitHubでのコードレビュー文化に慣れ親しみ",
                      "CI/CDやコンテナ技術も積極的に活用",
                      "AIコーディングツールも効果的に取り入れ",
                    ],
                  },
                ].map((value, index) => (
                  <AnimateOnScroll
                    key={value.title}
                    animation="slideUp"
                    delay={index * 0.1}
                    className="hover:-translate-y-1 rounded-lg bg-zinc-100 p-6 shadow-lg transition-transform dark:bg-gray-50/20"
                  >
                    <div className="mb-4 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50 text-2xl shadow-sm dark:bg-gray-800/50">
                        {value.icon}
                      </div>
                      <h4 className="font-bold text-lg">{value.title}</h4>
                    </div>
                    <ul className="divide-y divide-gray-200 dark:divide-gray-600/50">
                      {value.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-center gap-2 py-2 text-gray-600 text-sm first:pt-0 last:pb-0 dark:text-gray-300"
                        >
                          <span className="flex-shrink-0 text-accent">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </AnimateOnScroll>
                ))}
              </div>

              <AnimateOnScroll animation="fadeIn" delay={0.3}>
                <div className="mt-12 rounded-2xl bg-gradient-to-r from-gray-200 to-gray-300 p-8 text-center shadow-lg dark:from-gray-800/50 dark:to-gray-700/50">
                  <h4 className="mb-4 font-bold text-xl">私のスタンス</h4>
                  <p className="mx-auto max-w-4xl text-gray-600 dark:text-gray-300">
                    派手なアピールは得意ではありませんが、
                    <strong>技術への深い理解</strong>、
                    <strong>学び続ける姿勢</strong>、
                    <strong>確実な実装力</strong>
                    を武器に、チームの信頼できるエンジニアとして貢献したいと考えています。
                    特にリモートワークが当たり前となった現在、自律的に学習し続け、
                    安定したアウトプットを提供できることが私の強みです。
                  </p>
                </div>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        <section id="company-fit" className="py-20">
          <div className="container mx-auto px-6">
            <AnimateOnScroll animation="fadeIn">
              <h2 className="mb-16 text-center font-bold text-3xl">
                フィットする企業風土
              </h2>
            </AnimateOnScroll>

            <div className="mx-auto max-w-6xl">
              <AnimateOnScroll animation="slideUp" delay={0.1}>
                <div className="mb-8 rounded-2xl bg-gradient-to-r from-green-100 to-emerald-100 p-8 shadow-lg dark:from-green-800/50 dark:to-emerald-800/50">
                  <div className="text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-green-300 to-emerald-300 text-white shadow-lg dark:from-green-600 dark:to-emerald-600">
                      <span className="text-3xl">🚀</span>
                    </div>
                    <h3 className="mb-4 font-bold text-2xl">
                      私が力を発揮できる企業環境
                    </h3>
                    <p className="mx-auto max-w-3xl text-gray-600 dark:text-gray-300">
                      開発者の裁量を重視し、挑戦を歓迎するフットワークの軽い企業文化で、
                      私のスキルと経験を最大限に活かして貢献したいと考えています。
                    </p>
                  </div>
                </div>
              </AnimateOnScroll>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {[
                  {
                    icon: "⚡",
                    title: "爆速スタート・スピード重視",
                    description: "技術選定から実装まで迅速に進める開発体制",
                    points: [
                      "6ヶ月以内でのプロダクトリリース実績",
                      "プロトタイプから本格運用まで一気通貫で対応",
                      "必要な技術を素早く習得・適用する能力",
                    ],
                    color:
                      "from-orange-100 to-red-100 dark:from-orange-800/50 dark:to-red-800/50",
                    iconBg:
                      "bg-gradient-to-r from-orange-300 to-red-300 dark:from-orange-600 dark:to-red-600",
                  },
                  {
                    icon: "🎯",
                    title: "開発者裁量・技術選択の自由",
                    description:
                      "最適な技術スタックを開発者が主導で決められる環境",
                    points: [
                      "Vue 2→Next.js移行などモダン化を歓迎",
                      "プロジェクトに最適なツールを選択・提案",
                      "AIなどの新技術の導入を積極的に検討・実装",
                    ],
                    color:
                      "from-blue-100 to-cyan-100 dark:from-blue-800/50 dark:to-cyan-800/50",
                    iconBg:
                      "bg-gradient-to-r from-blue-300 to-cyan-300 dark:from-blue-600 dark:to-cyan-600",
                  },
                  {
                    icon: "🏃‍♂️",
                    title: "チャレンジを歓迎する文化",
                    description: "失敗を恐れず新しい挑戦を推奨する組織風土",
                    points: [
                      "新技術への積極的な取り組みを評価",
                      "改善提案を歓迎し実行に移せる環境",
                      "継続的な学習・成長をサポート",
                    ],
                    color:
                      "from-purple-100 to-pink-100 dark:from-purple-800/50 dark:to-pink-800/50",
                    iconBg:
                      "bg-gradient-to-r from-purple-300 to-pink-300 dark:from-purple-600 dark:to-pink-600",
                  },
                  {
                    icon: "🤝",
                    title: "フラットな組織・風通しの良さ",
                    description: "階層に関係なく意見を言い合える開放的な環境",
                    points: [
                      "意見を出しやすい活発な雰囲気",
                      "スピード感のある意思決定",
                      "リモートワークだからこそ密なコミュニケーション",
                    ],
                    color:
                      "from-emerald-100 to-teal-100 dark:from-emerald-800/50 dark:to-teal-800/50",
                    iconBg:
                      "bg-gradient-to-r from-emerald-300 to-teal-300 dark:from-emerald-600 dark:to-teal-600",
                  },
                ].map((item, index) => (
                  <AnimateOnScroll
                    key={item.title}
                    animation="slideUp"
                    delay={index * 0.15}
                    className={`hover:-translate-y-2 rounded-2xl bg-gradient-to-r ${item.color} p-6 shadow-lg transition-transform`}
                  >
                    <div className="mb-4 flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${item.iconBg} shadow-md`}
                      >
                        <span className="text-xl">{item.icon}</span>
                      </div>
                      <div>
                        <h4 className="mb-2 font-bold text-lg">{item.title}</h4>
                        <p className="mb-4 text-gray-600 text-sm dark:text-gray-300">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {item.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2 text-gray-700 text-sm dark:text-gray-200"
                        >
                          <span className="mt-1 flex-shrink-0 text-green-500">
                            ✓
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </AnimateOnScroll>
                ))}
              </div>

              <AnimateOnScroll animation="fadeIn" delay={0.6}>
                <div className="mt-12 rounded-2xl bg-gradient-to-r from-gray-100 to-blue-50 p-8 text-center shadow-lg dark:from-gray-800/50 dark:to-blue-900/50">
                  <h4 className="mb-4 font-bold text-xl">
                    理想的な協働スタイル
                  </h4>
                  <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
                    {[
                      {
                        icon: "💬",
                        title: "オープンな議論",
                        description: "技術的な課題を率直に話し合える関係性",
                      },
                      {
                        icon: "🎯",
                        title: "成果重視",
                        description: "プロセスよりも最終的なアウトプットを重視",
                      },
                      {
                        icon: "🌱",
                        title: "共に成長",
                        description: "チーム全体の成長を目指す文化",
                      },
                    ].map((style) => (
                      <div key={style.title} className="text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                          <span className="text-xl">{style.icon}</span>
                        </div>
                        <h5 className="mb-2 font-semibold">{style.title}</h5>
                        <p className="text-gray-600 text-sm dark:text-gray-300">
                          {style.description}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <p className="text-gray-600 dark:text-gray-300">
                      このような環境で、私の<strong>継続的な学習意欲</strong>と
                      <strong>実装力</strong>を活かし、
                      チームの技術的成長とプロダクトの成功に貢献したいと考えています。
                    </p>
                  </div>
                </div>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        <section id="contact" className="py-20">
          <div className="container mx-auto px-6">
            <AnimateOnScroll animation="fadeIn">
              <h2 className="mb-16 text-center font-bold text-3xl">
                コンタクト
              </h2>
            </AnimateOnScroll>

            <AnimateOnScroll animation="slideUp" delay={0.1}>
              <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-r from-white to-gray-100 p-8 text-center shadow-lg dark:from-black dark:to-gray-800">
                <div className="mb-6 flex justify-center">
                  <a
                    href="https://x.com/_kik4_"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-gray-700"
                  >
                    <FontAwesomeIcon icon={faXTwitter} size="lg" />
                  </a>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  気軽にお声がけください
                </p>
              </div>
            </AnimateOnScroll>
          </div>
        </section>
      </main>

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
                    <Link
                      href={href}
                      className="text-gray-400 transition hover:text-white"
                    >
                      {label}
                    </Link>
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
