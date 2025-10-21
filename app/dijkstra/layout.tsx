import type { Metadata } from "next";
import { baseUrl } from "../_lib/url";

export const metadata: Metadata = {
  title: "ダイクストラ法ビジュアライザー | kik4.work",
  description:
    "最短経路探索アルゴリズムであるダイクストラ法を視覚的に体験できるインタラクティブツール。頂点と辺を自由に配置し、アルゴリズムの動作をステップバイステップで確認できます。kik4のポートフォリオプロジェクトの一つです。",
  alternates: {
    canonical: `${baseUrl}/dijkstra`,
  },
};

export default function DijkstraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
