import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ReadingTitleProvider } from "@/components/reading-title";
import { buildSearchIndex } from "@/lib/build-search-index";

export const metadata: Metadata = {
  title: { default: "기록실 INDEX.", template: "%s — 기록실 INDEX." },
  description: "개발 일지 · 영상 요약 · 일반 글을 모아 두는 개인 기록 블로그.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/apple-touch-icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#16191E" },
    { media: "(prefers-color-scheme: light)", color: "#FCFCFB" },
  ],
};

/** 플래시 방지 — 페인트 전에 data-theme을 심습니다(디자인 시스템 지정 스니펫). */
const THEME_SCRIPT = `const t = localStorage.theme ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
if (t === 'light') document.documentElement.dataset.theme = 'light';`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 헤더 드롭다운은 클라이언트 컴포넌트라 DB에 직접 붙을 수 없어, 인덱스를 여기서 만들어 내려보냅니다
  const searchIndex = await buildSearchIndex();

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* 이 규칙은 Pages Router의 _document를 겨냥한 것이라 App Router에서는 해당하지 않습니다.
            폰트 로딩 방식은 디자인 시스템이 지정한 그대로 둡니다. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          본문으로 건너뛰기
        </a>
        <ReadingTitleProvider>
          <SiteHeader searchIndex={searchIndex} />
          <main id="main">{children}</main>
        </ReadingTitleProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
