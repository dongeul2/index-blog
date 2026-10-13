import path from "node:path";
import type { NextConfig } from "next";

// 관리자가 홈에서 올린 이미지(Supabase Storage의 media 버킷)만 이미지 최적화 대상으로 엽니다.
// 아무 외부 도메인이나 열면 최적화 경로가 임의 주소를 대신 받아 오는 통로가 됩니다(#56).
const storageHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // 홈 디렉터리에 있는 lock 파일 때문에 Turbopack이 루트를 홈으로 추론하는 것을 막습니다.
  turbopack: { root: path.resolve(".") },
  images: {
    remotePatterns: storageHost
      ? [{ protocol: "https", hostname: storageHost, pathname: "/storage/v1/object/public/media/**" }]
      : [],
  },
};

export default nextConfig;
