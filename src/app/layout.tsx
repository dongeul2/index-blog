import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ReadingTitleProvider } from "@/components/reading-title";
import { buildSearchIndex } from "@/lib/build-search-index";

/**
 * 에디터의 「명조」 — 한글 명조는 기기마다 없을 수 있어 사이트가 직접 제공합니다.
 * 미리 받지 않습니다(preload: false). 명조를 쓴 글자가 화면에 나올 때만 그 조각을 받습니다.
 */
const serif = Noto_Serif_KR({ weight: ["400", "700"], preload: false, display: "swap", variable: "--font-serif" });

export const metadata: Metadata = {
  title: { default: "기록실 INDEX.", template: "%s — 기록실 INDEX." },
  description: "개발 일지와 영상 요약, 가끔 쓰는 글을 모아 두는 개인 기록 블로그.",
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
    <html lang="ko" className={serif.variable} suppressHydrationWarning>
      <head>
        {/* [91]은 Pretendard 동적 서브셋 중 기본 라틴 + 최빈 한글이 든 조각입니다.
            첫 화면 글자 대부분이 여기에 있어, 이것만 미리 받아 두면 FOUT이 거의 사라집니다. */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/pretendard/PretendardVariable.subset.91.woff2"
          crossOrigin=""
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
