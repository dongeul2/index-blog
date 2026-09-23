"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 스크롤로 들어오면 살짝 떠오르며 나타납니다. 홈 화면 전용 — 다른 화면에는 쓰지 않습니다.
 *
 * 한 번만 켜지고 다시 꺼지지 않습니다(`io.disconnect()`) — 스크롤을 오갈 때마다
 * 깜빡이면 "탐색은 대담하게"가 아니라 산만해집니다.
 *
 * `prefers-reduced-motion`은 `globals.css`의 전역 규칙(`transition-duration: 0.01ms`)이
 * 자동으로 처리합니다 — 여기서 따로 분기하지 않아도 애니메이션이 사실상 꺼집니다.
 * 뷰포트 안에 이미 있는 요소는 마운트 직후 바로 보입니다(IntersectionObserver의
 * 첫 콜백이 현재 상태를 즉시 알려 줍니다) — 콘텐츠가 영구히 숨는 경우는 없습니다.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "header";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={cn("reveal", visible && "reveal--visible", className)}>
      {children}
    </Tag>
  );
}
