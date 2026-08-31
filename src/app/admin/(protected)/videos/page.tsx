import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "영상 라이브러리",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className="page admin-page">
      <header className="admin-head">
        <p className="admin-head__label">ADMIN</p>
        <h1 className="admin-head__title">영상 라이브러리</h1>
      </header>
      <div className="empty-state admin-empty">12~14 영상 브라우즈·시청·채널 구독 관리는 아직 만들지 않았습니다.</div>
    </div>
  );
}
