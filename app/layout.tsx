/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import "./globals.css";
import clsx from "clsx";

export const metadata: Metadata = {
	title: "kik4.work",
	description: "フロントエンドエンジニア kik4 のポートフォリオ",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ja">
			<head>
				<link
					href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Noto+Sans+JP:wght@400;700&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body className={clsx("antialiased")}>{children}</body>
		</html>
	);
}
