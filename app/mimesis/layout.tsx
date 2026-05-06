import type { Metadata } from "next";
import { getPathToMimesis } from "./getPath";

export const metadata: Metadata = {
  title: "Mimesis | 2.5Dモデリング | kik4.work",
  description:
    "2.5Dモデリングツール Mimesis。2D 制御点を視点ごとに補間して疑似 3D に見せる初期世代の実装。",
  alternates: {
    canonical: getPathToMimesis(),
  },
};

export default function MimesisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
