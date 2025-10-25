import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { baseUrl } from "@/app/_lib/url";
import { InPageLayout } from "../_components/InPageLayout";
import { sections } from "../_lib/articles";
import { algorithmPageTitle } from "../_lib/consts";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return sections[0].items.map((content) => ({
    slug: content.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const content = sections[0].items.find((item) => item.slug === slug);

  if (!content) {
    return {};
  }

  return {
    title: `${content.title} | ${algorithmPageTitle} | kik4.work`,
    description: `${content.description} | TypeScriptでアルゴリズムを書く方法を実例コードと実際に実行可能な環境と共に解説します。 | kik4.work - フロントエンドエンジニアkik4のサイト`,
    alternates: {
      canonical: `${baseUrl}/algorithm/${slug}`,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const content = sections[0].items.find((item) => item.slug === slug);

  if (!content) {
    notFound();
  }

  return (
    <InPageLayout
      title={content.title}
      description={content.description}
      createdAt={content.createdAt}
      updatedAt={content.updatedAt}
    >
      {content.content}
    </InPageLayout>
  );
}
