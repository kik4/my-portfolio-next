import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "タグエディター",
  description: "タグとグループを管理するエディター",
};

export default function TagEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
