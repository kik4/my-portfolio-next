import type { Metadata } from "next";
import { getPathTo2d5DModeling } from "./getPath";

export const metadata: Metadata = {
  title: "2.5Dモデリング | kik4.work",
  description: "2.5Dモデリングツール",
  alternates: {
    canonical: getPathTo2d5DModeling(),
  },
};

export default function ModelingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
