import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Image metadata
export const alt = "kik4.work - Webエンジニアのポートフォリオ";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function OgImage() {
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
          alignItems: "center",
          justifyContent: "center",
          gap: "60px",
        }}
      >
        {/* アイコン画像 */}
        <div
          style={{
            display: "flex",
            width: "280px",
            height: "280px",
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "6px solid white",
          }}
        >
          {/** biome-ignore lint/performance/noImgElement: tmp */}
          <img
            src={iconBase64}
            width="280"
            height="280"
            style={{
              objectFit: "cover",
            }}
            alt="kik4"
          />
        </div>

        {/* テキストコンテンツ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "600px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                fontSize: "28px",
                fontWeight: 400,
                color: "#333333",
                margin: 0,
                marginBottom: "8px",
              }}
            >
              Webエンジニア
            </div>
            <h1
              style={{
                fontSize: "80px",
                fontWeight: 700,
                color: "#111111",
                margin: 0,
                lineHeight: 1.0,
              }}
            >
              kik4 ⚡
            </h1>
            <div
              style={{
                fontSize: "32px",
                fontWeight: 400,
                color: "#2563eb",
                margin: 0,
                marginTop: "4px",
              }}
            >
              kik4.work
            </div>
          </div>
        </div>
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
