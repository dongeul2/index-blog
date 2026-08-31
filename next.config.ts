import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 홈 디렉터리에 있는 lock 파일 때문에 Turbopack이 루트를 홈으로 추론하는 것을 막습니다.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
