import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
	subsets: ["latin"],
	weight: ["400", "700"],
	display: "swap",
});

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
			<body className={`${notoSansJp.className} antialiased`}>{children}</body>
		</html>
	);
}
