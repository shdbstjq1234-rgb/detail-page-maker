import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        // 한국 상세페이지 기준 폭
        detail: "375px",
      },
      maxWidth: {
        detail: "780px", // 상세페이지 콘텐츠 폭 (고정 780 / 세로 무한)
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "'Helvetica Neue'",
          "'Segoe UI'",
          "'Apple SD Gothic Neo'",
          "'Noto Sans KR'",
          "'Malgun Gothic'",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          DEFAULT: "#111111",
          soft: "#333333",
          mute: "#767676",
        },
        line: "#ececec",
      },
    },
  },
  plugins: [],
};

export default config;
