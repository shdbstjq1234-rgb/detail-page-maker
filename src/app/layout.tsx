import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Detail Page Maker",
  description: "상품 사진 한 장으로 AI 상세페이지 제작 — 분석 · USP · 카피 · 이미지 · 편집 · 다운로드",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="bg-[#F7F7F5] font-sans text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
