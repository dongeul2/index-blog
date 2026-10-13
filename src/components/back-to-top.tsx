"use client";

/** 맨 위로 — 움직임 줄이기면 바로 이동합니다. 포커스도 맨 위(건너뛰기 링크 앞)로 돌려 놓습니다. */
export function BackToTop() {
  return (
    <button
      type="button"
      className="back-to-top"
      onClick={() => {
        const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
        // 다음 Tab이 건너뛰기 링크부터 시작하도록
        document.body.setAttribute("tabindex", "-1");
        document.body.focus({ preventScroll: true });
      }}
    >
      맨 위로
    </button>
  );
}
