"use client";

import { faAngleUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useState } from "react";

export const HiddenSections: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);
	return (
		<>
			<button
				className="flex items-center justify-center rounded border p-2 hover:bg-slate-400"
				type="button"
				onClick={() => setIsOpen((v) => !v)}
			>
				{isOpen ? (
					<span>
						close
						<FontAwesomeIcon className="ml-[0.5em]" icon={faAngleUp} />
					</span>
				) : (
					"and more..."
				)}
			</button>
			{isOpen && (
				<>
					<section className="flex flex-col gap-2 rounded border p-2 text-sm">
						<h3 className="text-lg">初代ポートフォリオサイト</h3>
						<div>
							<span className="mr-[0.5em] font-bold">時期:</span>
							2018〜2019
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">担当工程:</span>
							{["要件定義", "設計", "実装", "テスト", "運用/保守"].join(", ")}
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">技術:</span>
							{[
								"Nuxt.js",
								"JavaScript",
								"Vue.js",
								"Google App Engine",
								"Go",
								"Firebase",
							].join(", ")}
						</div>
						<div>
							<span className="mr-[0.5em] font-bold">概要:</span>
							最初に作ったポートフォリオサイト。Nuxt, GAE, Go, Firebase
							などの技術を試用と個人実績作りのために作成。
							<Link
								className="inline-block underline"
								href="https://github.com/kik4/my-portfolio-nuxt/tree/master"
							>
								リポジトリはこちら。
							</Link>
						</div>
					</section>
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
				</>
			)}
		</>
	);
};
