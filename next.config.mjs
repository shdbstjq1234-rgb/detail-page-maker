/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 임시 공개 링크(cloudflare 터널 등)에서 개발 서버 접근 허용
  allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt", "*.ngrok-free.app"],
  // 배포 빌드에서 ESLint 경고로 실패하지 않도록 (타입 체크는 유지)
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
