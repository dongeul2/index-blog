"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

/**
 * 테마의 정본은 React 상태가 아니라 `<html data-theme>`입니다.
 * 초기값은 `<head>`의 동기 스크립트가 페인트 전에 심어 두므로, 여기서는 그 DOM 속성을
 * 외부 저장소로 보고 구독합니다. 서버 스냅샷은 기본값인 다크입니다.
 */
function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => mo.disconnect();
}

const getSnapshot = (): Theme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

const getServerSnapshot = (): Theme => "dark";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === "dark";

  function toggle() {
    const next: Theme = isDark ? "light" : "dark";
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.theme = next;
    } catch {
      // 저장 실패는 무시합니다 — 이번 세션에만 적용됩니다.
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="다크 모드"
      className="theme-toggle"
      onClick={toggle}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__knob" />
      </span>
      <span className="sr-only">{isDark ? "다크 모드 켜짐" : "라이트 모드 켜짐"}</span>
    </button>
  );
}
