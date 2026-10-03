import {
  SiExpress,
  SiGithub,
  SiReact,
  SiTypescript,
  SiX,
} from "@icons-pack/react-simple-icons";
import { clsx } from "clsx";
import {
  BookOpen,
  Bug,
  Check,
  Code,
  Database,
  ExternalLink,
  GraduationCap,
  Handshake,
  Hexagon,
  Languages,
  Layers,
  Lightbulb,
  Link as LinkIcon,
  MessageCircle,
  Monitor,
  Package,
  Palette,
  Rocket,
  Server,
  Sprout,
  Target,
  TrendingUp,
  Triangle,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { MyLink } from "../_components/MyLink";
import { getPathToDijkstra } from "../dijkstra/getPath";
import { getPathToMimesis } from "../mimesis/getPath";
import { getPathToTextTagEditor } from "../text-tag-editor/getPath";
import { getPathToTypeScript } from "../typescript/getPath";
import { AnimateOnScroll } from "./_components/AnimateOnScroll";
import { IconBox } from "./_components/IconBox";
import { WavyBackground } from "./_components/WavyBackground";
import bannerArticles from "./_img/banner_articles.jpg";
import icon from "./_img/icon_1024x1024.jpg";
import projectNoImage from "./_img/no-image.png";
import projectDijkstra from "./_img/projectDijkstra.jpg";
import projectF from "./_img/projectF.jpg";
import projectN from "./_img/projectN.jpg";
import projectNametsubu from "./_img/projectNametsubu.jpg";
import projectP from "./_img/projectP.jpg";
import projectPf1 from "./_img/projectPf1.jpg";
import projectPf2 from "./_img/projectPf2.jpg";
import projectS from "./_img/projectS.jpg";
import projectTagEditor from "./_img/tag-editor.jpg";

export const metadata: Metadata = {
  // タイトルと説明はルートの layout.tsx 側で設定
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <main className="mt-20 [&>*:nth-child(2n)]:bg-gray-50 [&>*:nth-child(2n)]:dark:bg-gray-50/20">
      <section className="relative pt-12 pb-20">
        <WavyBackground />
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <AnimateOnScroll
              animation="slideRight"
              className="mb-10 md:mb-0 md:w-1/2"
            >
              <h2 className="mb-6 font-bold text-4xl leading-tight sm:text-5xl">
                Webエンジニア、
                <br />
                <span className="text-accent">kik4</span>
                です
              </h2>
              <ul className="mb-10 text-lg">
                {[
                  "モダンな技術と効率的な開発環境構築で、プロダクトを高速に改善。",
                  "倉庫管理・EC・求職サイトなど、実務システム開発のスペシャリスト。",
                  "TypeScriptを主軸に、バックエンドもフロントエンドも対応可能。",
                ].map((text) => (
                  <li
                    key={text}
                    className="flex gap-3 border-gray-300 border-b py-3 font-medium first:pt-0 dark:border-gray-600"
                  >
                    <span className="mt-[0.6em] h-2 w-2 shrink-0 rounded-full bg-blue-600 dark:bg-blue-300" />
                    {text}
                  </li>
                ))}
              </ul>
              <MyLink
                href="#work"
                className="inline-block rounded-full bg-blue-600 px-8 py-3 font-medium text-white transition hover:bg-blue-700"
              >
                プロダクトを見る
              </MyLink>
            </AnimateOnScroll>
            <AnimateOnScroll animation="slideLeft" className="md:w-5/12">
              <div className="relative mx-auto h-80 w-80">
                <Image
                  src={icon}
                  width={320}
                  height={320}
                  className="rounded-lg object-cover shadow-xl"
                  alt="kik4"
                  loading="eager"
                />
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      <section id="work" className="py-20">
        <div className="container mx-auto px-6">
          <AnimateOnScroll animation="fadeIn">
            <h2 className="mb-16 text-center font-bold text-3xl">プロダクト</h2>
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
                  "複数のサービスを展開する中でバックエンド/フロントエンド新規機能開発、AWS EC2サーバ構築、JenkinsによるCI環境構築、DB設計、ASP.NET Web FormsからMVCへの順次移行提案・実施、データ出力カスタムDSLの設計・式木を用いた実行システムの実装。新規サイトを開発リーダーとして立ち上げ、運用まで推進。",
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
                className="flex flex-col overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-50/20"
              >
                <div className="relative h-56">
                  <Image
                    src={project.image}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    alt=""
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-accent">
                      {project.category}
                      <span className="ml-2 text-gray-700/60 text-sm dark:text-gray-200/60">
                        {project.period}
                      </span>
                    </p>
                    {project.link && (
                      <MyLink
                        href={project.link}
                        className="inline-flex items-center gap-1 rounded bg-gray-600 px-2 py-1 font-medium text-white text-xs transition hover:bg-gray-700"
                      >
                        <ExternalLink size={14} />
                        GitHub
                      </MyLink>
                    )}
                  </div>
                  <h3 className="mb-3 font-bold text-xl">{project.title}</h3>
                  <p className="mb-5 text-gray-600 leading-relaxed dark:text-gray-300">
                    {project.description}
                  </p>
                  <dl className="mt-auto grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-gray-200 border-t pt-4 text-sm dark:border-gray-600">
                    {[
                      { label: "担当", value: project.responsible },
                      { label: "規模", value: project.scale },
                      { label: "技術", value: project.tech },
                    ].map(({ label, value }) => (
                      <div key={label} className="contents">
                        <dt className="text-gray-500 dark:text-gray-400">
                          {label}
                        </dt>
                        <dd className="text-gray-700 dark:text-gray-200">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </AnimateOnScroll>
            ))}
          </div>

          {/* 遊び心のプロジェクト */}
          <div className="mx-auto mt-16 max-w-2xl">
            <AnimateOnScroll animation="fadeIn">
              <h3 className="mb-4 text-center font-bold text-gray-500 dark:text-gray-300">
                遊び心のプロジェクト
              </h3>
            </AnimateOnScroll>
            <div className="flex flex-col gap-4">
              {[
                {
                  title: "2.5Dモデリングツール",
                  category: "技術実験" as const,
                  period: "2026",
                  description:
                    "2Dと3Dを組み合わせたモデリングツール。2Dのスプライトを配置して理想の3Dキャラクターを構築。（開発中）",
                  image: projectNoImage,
                  tech: ["React", "TypeScript"].join(", "),
                  link: getPathToMimesis(),
                  linkIcon: <LinkIcon size={16} />,
                },
                {
                  title: "テキストタグエディター",
                  category: "技術実験" as const,
                  period: "2025",
                  description:
                    "テキストベースでタグ管理ができるエディター。タグデータをテキスト形式で保存・読み込み可能。共通タグの抽出機能も搭載し、タグ管理を効率化。",
                  image: projectTagEditor,
                  tech: ["Next.js", "React", "TypeScript", "TailwindCSS"].join(
                    ", ",
                  ),
                  link: getPathToTextTagEditor(),
                  linkIcon: <LinkIcon size={16} />,
                },
                {
                  title: "ダイクストラ法ビジュアライザー",
                  category: "技術実験" as const,
                  period: "2025",
                  description:
                    "グラフ理論のダイクストラ法をインタラクティブに体験できるWebアプリ。Canvas APIでグラフを描画し、アルゴリズムの動作をステップバイステップで可視化。",
                  image: projectDijkstra,
                  tech: [
                    "Next.js",
                    "React",
                    "TypeScript",
                    "Canvas API",
                    "TailwindCSS",
                  ].join(", "),
                  link: getPathToDijkstra(),
                  linkIcon: <LinkIcon size={16} />,
                },
                {
                  title: "ガキが舐めてると潰すぞメーカー",
                  category: "遊び心" as const,
                  period: "2019",
                  description:
                    "バズったミーム画像を再現できるWebアプリ。Canvas APIを使った画像生成とクライアントサイド完結の実装を実験。",
                  image: projectNametsubu,
                  tech: [
                    "HTML5",
                    "Canvas API",
                    "JavaScript",
                    "GitHub Pages",
                  ].join(", "),
                  link: "https://kik4.github.io/nametsubu/",
                  linkIcon: <ExternalLink size={16} />,
                },
              ].map((project, index) => (
                <AnimateOnScroll
                  key={project.title}
                  animation="slideUp"
                  delay={index * 0.1}
                >
                  <div className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-gray-700/50 dark:bg-gray-800/30 dark:hover:border-gray-600 dark:hover:bg-gray-800/50">
                    <MyLink
                      href={project.link}
                      className="flex flex-row items-center"
                    >
                      <div className="relative ml-2 h-24 w-24 flex-shrink-0 sm:h-32 sm:w-32">
                        <Image
                          src={project.image}
                          fill
                          sizes="33vw"
                          className="rounded-lg object-cover opacity-80 group-hover:opacity-100"
                          alt=""
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between p-4">
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className={clsx(
                                "rounded px-2 py-0.5 font-medium text-xs",
                                project.category === "技術実験"
                                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
                              )}
                            >
                              {project.category}
                            </span>
                            <span className="text-gray-400 text-xs dark:text-gray-400">
                              {project.period}
                            </span>
                          </div>
                          <h3
                            className={clsx(
                              "mb-1 font-semibold text-base text-gray-700 dark:text-gray-300",
                              project.category === "技術実験"
                                ? "group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                : "group-hover:text-purple-600 dark:group-hover:text-purple-400",
                            )}
                          >
                            {project.title}
                          </h3>
                          <p className="mb-2 text-gray-600 text-sm leading-relaxed dark:text-gray-400">
                            {project.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-gray-500 text-xs dark:text-gray-400">
                            {project.tech}
                          </p>
                          <span
                            className={clsx(
                              "inline-flex items-center gap-1 text-xs",
                              project.category === "技術実験"
                                ? "text-blue-500 dark:text-blue-400"
                                : "text-purple-500 dark:text-purple-400",
                            )}
                          >
                            {project.linkIcon}
                          </span>
                        </div>
                      </div>
                    </MyLink>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <AnimateOnScroll animation="fadeIn">
            <h2 className="mb-16 text-center font-bold text-3xl">代表スキル</h2>
          </AnimateOnScroll>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
            {[
              {
                icon: <Monitor size={24} />,
                title: "Webデザイン",
                skills: "HTML5, CSS3, Responsive Design",
              },
              {
                icon: <Palette size={24} />,
                title: "UI/UXデザイン",
                skills: "プロトタイピング, インタラクションデザイン",
              },
              {
                icon: <Code size={24} />,
                title: "フロントエンド開発",
                skills: "TypeScript, React.js, Next.js",
              },
              {
                icon: <Server size={24} />,
                title: "バックエンド開発",
                skills: "Node.js, Express, Next.js",
              },
              {
                icon: <GraduationCap size={24} />,
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
                <IconBox className="mx-auto mb-4">{skill.icon}</IconBox>
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
                {
                  name: "TypeScript",
                  icon: <SiTypescript className="fill-white" size={32} />,
                  color: "bg-[#3178c6]",
                },
                {
                  name: "React",
                  icon: <SiReact className="fill-white" size={32} />,
                  color: "bg-cyan-500",
                },
                { name: "Next.js", icon: "N", color: "bg-black" },
                { name: "Node.js", icon: <Hexagon />, color: "bg-green-700" },
                {
                  name: "GitHub",
                  icon: <SiGithub className="fill-white" size={32} />,
                  color: "bg-gray-800",
                },
                {
                  name: "Express",
                  icon: <SiExpress className="fill-white" size={32} />,
                  color: "bg-green-600",
                },
                {
                  name: "PostgreSQL",
                  icon: <Database />,
                  color: "bg-blue-800",
                },
                { name: "Vercel", icon: <Triangle />, color: "bg-black" },
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
                      tech.icon
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

      <section className="py-20">
        <div className="container mx-auto px-6">
          <AnimateOnScroll animation="fadeIn">
            <h2 className="mb-16 text-center font-bold text-3xl">OSS活動</h2>
          </AnimateOnScroll>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {[
              {
                icon: <Languages size={22} />,
                title: "React公式ドキュメント日本語訳",
                description:
                  "React公式ドキュメントの日本語訳プロジェクトに協力。日本の開発者コミュニティへの貢献を行いました。",
                link: "https://ja.react.dev/",
                linkText: "React日本語ドキュメント",
                type: "ドキュメント翻訳",
              },
              {
                icon: <Bug size={22} />,
                title: "react-intersection-observer",
                description:
                  "人気のReactライブラリのバグ修正PRを送信。Intersection Observer APIを使用したライブラリの安定性向上に貢献しました。",
                link: "https://github.com/thebuilder/react-intersection-observer",
                linkText: "GitHubリポジトリ",
                type: "バグ修正",
              },
              {
                icon: <Package size={22} />,
                title: "array-compressor",
                description:
                  "配列の圧縮とセグメント化を効率的に行うnpmパッケージを開発・公開。データ処理の最適化に役立つユーティリティライブラリです。",
                link: "https://www.npmjs.com/package/array-compressor",
                linkText: "npmパッケージ",
                type: "ライブラリ公開",
              },
              {
                icon: <Workflow size={22} />,
                title: "simple-vercel-deploy",
                description:
                  "Vercelへのデプロイを行うシンプルなGitHub Actionを開発・公開。自動デプロイでは足りない部分を補完し、CI/CDパイプラインの構築を効率化するツールです。",
                link: "https://github.com/marketplace/actions/simple-vercel-deploy",
                linkText: "GitHub Marketplace",
                type: "GitHub Action",
              },
            ].map((item, index) => (
              <AnimateOnScroll
                key={item.title}
                animation="slideUp"
                delay={index * 0.15}
                className="h-full rounded-lg bg-white p-6 shadow-md dark:bg-gray-50/20"
              >
                <div className="flex items-start gap-4">
                  <IconBox>{item.icon}</IconBox>
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-lg">{item.title}</h3>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 text-xs dark:bg-gray-700/50 dark:text-gray-300">
                        {item.type}
                      </span>
                    </div>
                    <p className="mb-4 text-gray-600 leading-relaxed dark:text-gray-300">
                      {item.description}
                    </p>
                    <MyLink
                      href={item.link}
                      className="inline-flex items-center gap-2 rounded border border-blue-600 px-4 py-2 font-medium text-blue-600 text-sm transition hover:bg-blue-600 hover:text-white dark:border-blue-300 dark:text-blue-300 dark:hover:bg-blue-300 dark:hover:text-gray-900"
                    >
                      <ExternalLink size={14} />
                      {item.linkText}
                    </MyLink>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <AnimateOnScroll animation="fadeIn">
            <h2 className="mb-16 text-center font-bold text-3xl">技術発信</h2>
          </AnimateOnScroll>

          <div className="mb-8 flex justify-center">
            <AnimateOnScroll animation="slideUp" delay={0.1}>
              <MyLink
                className="inline-block shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl"
                href={getPathToTypeScript()}
              >
                <Image
                  src={bannerArticles}
                  width={480}
                  height={240}
                  className="rounded-lg border border-gray-400 object-cover"
                  alt="技術記事 TypeScriptでアルゴリズム バナー"
                />
              </MyLink>
            </AnimateOnScroll>
          </div>

          <AnimateOnScroll animation="slideUp" delay={0.2}>
            <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-8 shadow-md dark:border-gray-700/50 dark:bg-gray-50/20">
              <div className="flex flex-col items-center gap-6 md:flex-row">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-black text-white dark:ring-1 dark:ring-gray-500">
                  <SiX className="fill-white" size={24} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="mb-3 font-bold text-2xl">Xで技術情報を発信</h3>
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
                  <MyLink
                    href="https://x.com/_kik4_"
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800"
                  >
                    <ExternalLink size={16} />
                    Xプロフィールを見る
                  </MyLink>
                </div>
              </div>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll animation="slideUp" delay={0.3}>
            <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-gray-200 bg-white p-8 shadow-md dark:border-gray-700/50 dark:bg-gray-50/20">
              <div className="flex flex-col items-center gap-6 md:flex-row">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
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
                    {["C#", ".NET", "TypeScript", "PowerShell", "Web開発"].map(
                      (tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-green-100 px-3 py-1 text-green-700 text-sm dark:bg-green-900/30 dark:text-green-300"
                        >
                          {tag}
                        </span>
                      ),
                    )}
                  </div>
                  <MyLink
                    href="https://qiita.com/kik4"
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700"
                  >
                    <ExternalLink size={16} />
                    Qiitaプロフィールを見る
                  </MyLink>
                </div>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <AnimateOnScroll animation="fadeIn">
            <h2 className="mb-16 text-center font-bold text-3xl">
              エンジニアとしての特徴
            </h2>
          </AnimateOnScroll>

          <div className="mx-auto max-w-6xl">
            <AnimateOnScroll animation="slideUp" delay={0.1}>
              <div className="mb-8 rounded-2xl bg-white p-8 shadow-md dark:bg-gray-50/20">
                <div className="text-center">
                  <div className="group mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full shadow-md transition-all duration-300 hover:animate-shake hover:blur-[1px]">
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
                  <p className="mx-auto max-w-3xl text-gray-600 leading-relaxed [line-break:strict] dark:text-gray-300">
                    私は日々の開発業務に集中し、 スピード感のある業務を心がけ、
                    成長し続けるコードを書き続けてきました。
                    そんな「もくもく系」の私の特徴をご紹介します。
                  </p>
                </div>
              </div>
            </AnimateOnScroll>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: <BookOpen size={22} />,
                  title: "継続的な技術習得",
                  points: [
                    "2014年から10年以上の実務経験を積み重ね",
                    "PHP → C# → TypeScriptとプロダクトと時代に応じて柔軟にアップデート",
                    "個人プロジェクトで新技術を積極的に試用",
                  ],
                },
                {
                  icon: <Layers size={22} />,
                  title: "幅広い開発対応力",
                  points: [
                    "バックエンドからフロントエンド、インフラまで担当",
                    "要件定義から保守まで全工程を経験",
                    "倉庫管理システムを安定運用中",
                  ],
                },
                {
                  icon: <Zap size={22} />,
                  title: "スピードと挑戦を重視した開発",
                  points: [
                    "プロジェクトに最適な技術選定を心がけ",
                    "爆速開発で短期間でのリリースを実現",
                    "Vue 2→Next.js移行など技術的負債を積極的に解決",
                  ],
                },
                {
                  icon: <Users size={22} />,
                  title: "開発者コミュニティへの貢献",
                  points: [
                    "React公式ドキュメントの日本語翻訳に参加",
                    "Qiitaで実務経験に基づく技術記事を執筆",
                    "npmパッケージ・GitHub Actionを開発・公開",
                  ],
                },
                {
                  icon: <TrendingUp size={22} />,
                  title: "リモートワークでの高い生産性",
                  points: [
                    "フルリモート・フルフレックス環境で集中開発",
                    "迅速なアウトプットを維持",
                    "6年間継続しているプロジェクトで責任感を発揮",
                  ],
                },
                {
                  icon: <Lightbulb size={22} />,
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
                  className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-50/20"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <IconBox>{value.icon}</IconBox>
                    <h4 className="font-bold text-lg">{value.title}</h4>
                  </div>
                  <ul className="divide-y divide-gray-200 dark:divide-gray-600/50">
                    {value.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-2 py-2 text-gray-600 text-sm first:pt-0 last:pb-0 dark:text-gray-300"
                      >
                        <span className="shrink-0 text-accent">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </AnimateOnScroll>
              ))}
            </div>

            <AnimateOnScroll animation="fadeIn" delay={0.3}>
              <div className="mt-12 rounded-2xl bg-blue-50 p-8 dark:bg-blue-900/20">
                <h4 className="mb-4 font-bold text-xl">私のスタンス</h4>
                <p className="max-w-4xl text-gray-700 leading-relaxed dark:text-gray-300">
                  派手なアピールは得意ではありませんが、
                  <strong>技術への深い理解</strong>、
                  <strong>学び続ける姿勢</strong>、<strong>確実な実装力</strong>
                  を武器に、チームの信頼できるエンジニアとして貢献したいと考えています。
                  特にリモートワークが当たり前となった現在、自律的に学習し続け、
                  安定したアウトプットを提供できることが私の強みです。
                </p>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <AnimateOnScroll animation="fadeIn">
            <h2 className="mb-16 text-center font-bold text-3xl">
              フィットする企業風土
            </h2>
          </AnimateOnScroll>

          <div className="mx-auto max-w-6xl">
            <AnimateOnScroll animation="slideUp" delay={0.1}>
              <div className="mb-8 rounded-2xl bg-gray-50 p-8 dark:bg-gray-50/10">
                <div className="text-center">
                  <div className="group relative mx-auto mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-white shadow-md dark:bg-blue-500">
                    <Rocket
                      size={32}
                      className="relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:animate-pulse"
                    />
                    {/* 白い粒のアニメーション */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      {[
                        { left: 30, top: 15, delay: 0 },
                        { left: 110, top: 20, delay: 150 },
                        { left: 70, top: 25, delay: 300 },
                        { left: 20, top: 30, delay: 450 },
                        { left: 65, top: 35, delay: 600 },
                        { left: 100, top: 40, delay: 750 },
                        { left: 40, top: 45, delay: 900 },
                        { left: 85, top: 50, delay: 1050 },
                      ].map((particle) => (
                        <div
                          key={`particle-${particle.left}-${particle.top}`}
                          className="absolute h-1 w-1 animate-rocket-trail rounded-full bg-white"
                          style={{
                            left: `${particle.left}%`,
                            top: `${particle.top}%`,
                            animationDelay: `${particle.delay}ms`,
                            animationDuration: "0.5s",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <h3 className="mb-4 font-bold text-2xl">
                    私が力を発揮できる企業環境
                  </h3>
                  <p className="mx-auto max-w-3xl text-gray-600 leading-relaxed dark:text-gray-300">
                    開発者の裁量を重視し、挑戦を歓迎するフットワークの軽い企業文化で、
                    私のスキルと経験を最大限に活かして貢献したいと考えています。
                  </p>
                </div>
              </div>
            </AnimateOnScroll>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[
                {
                  icon: <Zap size={22} />,
                  title: "爆速スタート・スピード重視",
                  description: "技術選定から実装まで迅速に進める開発体制",
                  points: [
                    "6ヶ月以内でのプロダクトリリース実績",
                    "プロトタイプから本格運用まで一気通貫で対応",
                    "必要な技術を素早く習得・適用する能力",
                  ],
                },
                {
                  icon: <Target size={22} />,
                  title: "開発者裁量・技術選択の自由",
                  description:
                    "最適な技術スタックを開発者が主導で決められる環境",
                  points: [
                    "Vue 2→Next.js移行などモダン化を歓迎",
                    "プロジェクトに最適なツールを選択・提案",
                    "AIなどの新技術の導入を積極的に検討・実装",
                  ],
                },
                {
                  icon: <Rocket size={22} />,
                  title: "チャレンジを歓迎する文化",
                  description: "失敗を恐れず新しい挑戦を推奨する組織風土",
                  points: [
                    "新技術への積極的な取り組みを評価",
                    "改善提案を歓迎し実行に移せる環境",
                    "継続的な学習・成長をサポート",
                  ],
                },
                {
                  icon: <Handshake size={22} />,
                  title: "フラットな組織・風通しの良さ",
                  description: "階層に関係なく意見を言い合える開放的な環境",
                  points: [
                    "意見を出しやすい活発な雰囲気",
                    "スピード感のある意思決定",
                    "リモートワークだからこそ密なコミュニケーション",
                  ],
                },
              ].map((item, index) => (
                <AnimateOnScroll
                  key={item.title}
                  animation="slideUp"
                  delay={index * 0.1}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-gray-50/10"
                >
                  <div className="mb-4 flex items-start gap-4">
                    <IconBox>{item.icon}</IconBox>
                    <div>
                      <h4 className="mb-1 font-bold text-lg">{item.title}</h4>
                      <p className="text-gray-600 text-sm dark:text-gray-300">
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
                        <Check
                          size={16}
                          className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-300"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </AnimateOnScroll>
              ))}
            </div>

            <AnimateOnScroll animation="fadeIn" delay={0.3}>
              <div className="mt-12 rounded-2xl bg-blue-50 p-8 text-center dark:bg-blue-900/20">
                <h4 className="mb-6 font-bold text-xl">理想的な協働スタイル</h4>
                <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
                  {[
                    {
                      icon: <MessageCircle size={22} />,
                      title: "オープンな議論",
                      description: "技術的な課題を率直に話し合える関係性",
                    },
                    {
                      icon: <Target size={22} />,
                      title: "成果重視",
                      description: "プロセスよりも最終的なアウトプットを重視",
                    },
                    {
                      icon: <Sprout size={22} />,
                      title: "共に成長",
                      description: "チーム全体の成長を目指す文化",
                    },
                  ].map((style) => (
                    <div key={style.title} className="text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                        {style.icon}
                      </div>
                      <h5 className="mb-2 font-semibold">{style.title}</h5>
                      <p className="text-gray-600 text-sm dark:text-gray-300">
                        {style.description}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <p className="text-gray-700 leading-relaxed dark:text-gray-300">
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

      <section className="py-20">
        <div className="container mx-auto px-6">
          <AnimateOnScroll animation="fadeIn">
            <h2 className="mb-16 text-center font-bold text-3xl">コンタクト</h2>
          </AnimateOnScroll>

          <AnimateOnScroll animation="slideUp" delay={0.1}>
            <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-md dark:bg-gray-50/20">
              <p className="mb-6 text-gray-600 dark:text-gray-300">
                気軽にお声がけください
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  {
                    label: "X (@_kik4_)",
                    href: "https://x.com/_kik4_",
                    icon: <SiX size={16} />,
                    primary: true,
                  },
                  {
                    label: "GitHub",
                    href: "https://github.com/kik4",
                    icon: <SiGithub size={18} />,
                  },
                  {
                    label: "Qiita",
                    href: "https://qiita.com/kik4",
                    icon: <span className="font-bold">Q</span>,
                  },
                ].map((contact) => (
                  <MyLink
                    key={contact.href}
                    href={contact.href}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-medium transition",
                      contact.primary
                        ? "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 [&_svg]:fill-current"
                        : "border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 [&_svg]:fill-current",
                    )}
                  >
                    {contact.icon}
                    {contact.label}
                  </MyLink>
                ))}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>
    </main>
  );
}
