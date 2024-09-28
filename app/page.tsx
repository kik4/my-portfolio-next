import icon from "@/app/img/icon_400x400.jpg";
import { faGithub, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import { DarkToggleButton } from "./DarkToggleButton";

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
				<Image
					className="rounded-full"
					src={icon}
					alt="kik4 avator"
					width={180}
					height={180}
					priority
				/>

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
								"業務用倉庫保管管理サービス開発",
								"倉庫検索ポータルサイト開発",
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
						<h3 className="text-lg">ECサイト開発</h3>
						<div>
							<span className="mr-[0.5em] font-bold">担当工程:</span>
							{["要件定義", "設計", "実装", "テスト", "運用/保守"].join(", ")}
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">技術:</span>
							{[
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
							].join(", ")}
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">概要:</span>
							自社プロダクト。フルスタックで何でも担当。比較的技術寄りの部分を解決。主な作業は以下の通り。
							<ul className="mt-1 list-inside list-disc">
								<li>フロントエンド/バックエンド新規機能開発</li>
								<li>AWS EC2サーバ構築</li>
								<li>CI環境構築</li>
								<li>React/Vue.jsなどライブラリ技術選定</li>
								<li>DB設計</li>
								<li>ツール作成</li>
								<li>コードレビュー</li>
								<li>ASP.NET Web FormsからMVCへの順次移行提案・実施</li>
								<li>
									データ出力カスタムDSLの設計・式木を用いた実行システムの実装
								</li>
							</ul>
						</div>
					</section>
					<section className="flex flex-col gap-2 rounded border p-2 text-sm">
						<h3 className="text-lg">求職サイト開発</h3>
						<div>
							<span className="mr-[0.5em] font-bold">担当工程:</span>
							{["設計", "実装", "テスト", "運用/保守", "一部デザイン"].join(
								", ",
							)}
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">技術:</span>
							{[
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
							].join(", ")}
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">概要:</span>
							自社プロダクト。主に新規機能開発やバグ修正。一部デザインも担当。その他、vagrantを用いた環境構築など。
						</div>
					</section>
				</section>
			</main>
			<footer className="row-start-3 flex flex-wrap items-center justify-center gap-6">
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
			</footer>
		</div>
	);
}
