import icon from "@/app/img/icon_400x400.jpg";
import { faGithub, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import { DarkToggleButton } from "./_components/DarkToggleButton";
import { HiddenSections } from "./_components/HiddenSections";

export default function Home() {
	return (
		<div className="grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 bg-background p-8 pb-20 text-foreground sm:p-20">
			<header className="flex gap-8">
				<Link href="/">
					<h1 className="text-lg">kik4.work</h1>
				</Link>
				<DarkToggleButton />
			</header>
			<main className="row-start-2 flex flex-col items-center gap-8 sm:items-start">
				<div className="flex flex-col items-center justify-center gap-8 sm:flex-row">
					<Image
						className="rounded-full"
						src={icon}
						alt="kik4 avator"
						width={180}
						height={180}
						priority
					/>
					<div className="flex flex-col gap-2 px-4 pt-2 pb-4">
						<a
							className="flex items-center gap-2 hover:underline hover:underline-offset-4"
							href="https://github.com/kik4"
							target="_blank"
							rel="noopener noreferrer"
						>
							<FontAwesomeIcon icon={faGithub} />
							@kik4
						</a>
						<a
							className="flex items-center gap-2 hover:underline hover:underline-offset-4"
							href="https://x.com/_kik4_"
							target="_blank"
							rel="noopener noreferrer"
						>
							<FontAwesomeIcon icon={faXTwitter} />
							@_kik4_
						</a>
						<a
							className="flex items-center gap-2 hover:underline hover:underline-offset-4"
							href="https://qiita.com/kik4"
							target="_blank"
							rel="noopener noreferrer"
						>
							<span>Qiita</span>
							@kik4
						</a>
					</div>
				</div>

				<section className="rounded border px-4 pt-2 pb-4">
					<h2 className="font-bold text-lg">プロフィール</h2>
					<div className="mt-2 grid grid-cols-[100px_1fr] gap-2 text-sm">
						<div>名前</div>
						<div>kik4（きっくふぉー）</div>
						<div>職業</div>
						<div>Webエンジニア（主にフロントエンド。フルスタックもあり）</div>
						<div>業務経歴</div>
						<ul className="list-inside list-disc">
							{[
								"倉庫検索ポータルサイト開発",
								"業務用倉庫保管管理サービス開発",
								"EC系サイト開発",
								"求職サイト開発",
							].map((v) => (
								<li key={v}>{v}</li>
							))}
						</ul>
						<div>主な経験技術</div>
						<div className="text-balance">
							Typescript / JavaScript / Next.js / PostgreSQL / Node.js / Express
							/ React / Vue2 / SPA / PHP
						</div>
						<div>資格</div>
						<div className="text-balance">応用情報技術者など</div>
					</div>
				</section>

				<section className="flex flex-col gap-4 rounded border px-2 pt-2 pb-4">
					<h2 className="font-bold text-lg">業務経験詳細</h2>
					<section className="flex flex-col gap-2 rounded border p-2 text-sm">
						<h3 className="text-lg">倉庫検索ポータルサイト開発</h3>
						<div>
							<span className="mr-[0.5em] font-bold">時期:</span>
							2021〜現在
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">担当工程:</span>
							{["要件定義", "設計", "実装", "テスト", "保守"].join(", ")}
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">技術:</span>
							{[
								"TypeScript",
								"React (Next.js)",
								"Node.js",
								"Docker",
								"Github",
								"Github Actions",
								"Vercel",
								"Prisma",
								"TailwindCSS",
								"その他",
							].join(", ")}
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">概要:</span>
							自社プロダクト。最初の技術選定から始め、ほとんどのバックエンド/フロントエンドの設計・開発を担当。
							<br />
							ログイン不要。主な機能は物件検索、物件情報を他サービスとの連携、headless
							CMS を用いた記事掲載。
						</div>
					</section>
					<section className="flex flex-col gap-2 rounded border p-2 text-sm">
						<h3 className="text-lg">業務用倉庫保管管理サービス開発</h3>
						<div>
							<span className="mr-[0.5em] font-bold">時期:</span>
							2018末頃〜現在
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">担当工程:</span>
							{["要件定義", "設計", "実装", "テスト", "保守"].join(", ")}
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">技術:</span>
							{[
								"TypeScript",
								"React (Next.js) / Vue.js",
								"Node.js",
								"Docker",
								"Github",
								"CircleCI",
								"TailwindCSS",
								"その他",
							].join(", ")}
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">概要:</span>
							自社プロダクト。インフラ除き、バックエンド/フロントエンドの開発を担当。
							<br />
							大きな機能としては Slack のようなチャットシステムを構築するなど。
							<br />
							機能追加以外では Vue2 から Next.js への置き換えを実施した。
						</div>
					</section>
					<HiddenSections />
				</section>
			</main>
			<footer className="row-start-3 flex flex-wrap items-center justify-center gap-6 text-sm">
				<span>©︎ 2024 kik4</span>
				<a
					className="flex items-center gap-1 hover:underline hover:underline-offset-4"
					href="https://github.com/kik4/my-portfolio-next"
					target="_blank"
					rel="noopener noreferrer"
				>
					<FontAwesomeIcon icon={faGithub} />
					このサイトのソース
				</a>
			</footer>
		</div>
	);
}
