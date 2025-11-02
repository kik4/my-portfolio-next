import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { sections } from "../_lib/articles";
import { algorithmPageTitle } from "../_lib/consts";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

// Image metadata
export async function generateImageMetadata({ params }: Props) {
  const { slug } = await params;
  const content = sections[0].items.find((item) => item.slug === slug);

  if (!content) {
    return [{ id: "default", alt: `${algorithmPageTitle} - kik4.work` }];
  }

  return [
    {
      id: slug,
      alt: `${content.title} | ${algorithmPageTitle} - kik4.work`,
    },
  ];
}

// Image generation
export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const content = sections[0].items.find((item) => item.slug === slug);

  if (!content) {
    notFound();
  }

  // タイトルと説明を省略
  const maxTitleLength = 30;
  const maxDescriptionLength = 60;
  const title =
    content.title.length > maxTitleLength
      ? `${content.title.slice(0, maxTitleLength)}...`
      : content.title;
  const description =
    content.description.length > maxDescriptionLength
      ? `${content.description.slice(0, maxDescriptionLength)}...`
      : content.description;

  // アイコン画像を読み込み
  const iconPath = join(
    process.cwd(),
    "app",
    "(home)",
    "_img",
    "icon_1024x1024.jpg",
  );
  const iconData = await readFile(iconPath);
  const iconBase64 = `data:image/jpeg;base64,${iconData.toString("base64")}`;

  const lato = await readFile(join(process.cwd(), "fonts/Lato-Bold.ttf"));
  const noto = await readFile(join(process.cwd(), "fonts/NotoSansJP-Bold.ttf"));

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fefefe",
        backgroundImage:
          "radial-gradient(circle at 25px 25px, #e5e7eb 2%, transparent 0%), radial-gradient(circle at 75px 75px, #e5e7eb 2%, transparent 0%)",
        backgroundSize: "100px 100px",
        position: "relative",
      }}
    >
      {/* 青いグラデーション背景 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
        }}
      />

      {/* メインコンテンツ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "40px",
          paddingLeft: "80px",
          paddingRight: "80px",
          paddingBottom: "60px",
        }}
      >
        {/* アイコンと全体タイトル */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {/* アイコン画像 */}
          <div
            style={{
              display: "flex",
              width: "120px",
              height: "120px",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.2)",
              border: "3px solid white",
            }}
          >
            {/** biome-ignore lint/performance/noImgElement: tmp */}
            <img
              src={iconBase64}
              width="120"
              height="120"
              style={{
                objectFit: "cover",
              }}
              alt="kik4"
            />
          </div>

          {/* ページ全体タイトル */}
          <div
            style={{
              fontSize: "24px",
              fontWeight: 400,
              color: "#2563eb",
              margin: 0,
            }}
          >
            {algorithmPageTitle}
          </div>
        </div>

        {/* テキストコンテンツ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            alignItems: "center",
            textAlign: "center",
            maxWidth: "1000px",
          }}
        >
          {/* 記事タイトル */}
          <h1
            style={{
              fontSize: "70px",
              fontWeight: 700,
              color: "#111111",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>

          {/* 記事説明 */}
          <div
            style={{
              fontSize: "32px",
              fontWeight: 400,
              color: "#555555",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        </div>
      </div>

      {/* 右下のサイト名 */}
      <div
        style={{
          position: "absolute",
          bottom: "30px",
          right: "40px",
          fontSize: "24px",
          fontWeight: 400,
          color: "#2563eb",
        }}
      >
        kik4.work
      </div>

      {/* 下部のアクセント */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "8px",
          background: "linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)",
        }}
      />
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Lato",
          data: lato,
          weight: 700,
          style: "normal",
        },
        {
          name: "Noto Sans JP",
          data: noto,
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}
