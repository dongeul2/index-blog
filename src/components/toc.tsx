"use client";

import { useEffect, useRef, useState } from "react";
import type { Heading } from "@/lib/content-types";

export function Toc({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "");
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const nodes = headings
      .map((h) => document.getElementById(h.id))
      .filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return;

    const visible = new Set<string>();
    const order = new Map(headings.map((h, i) => [h.id, i]));

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        if (visible.size === 0) return; // 밴드를 벗어난 동안은 직전 항목을 유지합니다
        let top = "";
        for (const id of visible) {
          if (top === "" || (order.get(id) ?? 0) < (order.get(top) ?? 0)) top = id;
        }
        setActiveId(top);
      },
      { rootMargin: "-96px 0px -70%", threshold: 0 },
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [headings]);

  // 모바일 접이식 TOC: ESC로 닫고 트리거(summary)로 포커스 복귀
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = detailsRef.current;
      if (e.key !== "Escape" || !el?.open) return;
      el.open = false;
      el.querySelector("summary")?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const list = (
    <ul>
      {headings.map((h) => (
        <li key={h.id}>
          <a
            href={`#${h.id}`}
            className={h.level === 3 ? "toc__link toc__link--h3" : "toc__link"}
            aria-current={activeId === h.id ? "true" : undefined}
            onClick={() => {
              setActiveId(h.id);
              if (detailsRef.current) detailsRef.current.open = false;
            }}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <aside className="article-toc" aria-label="목차">
      {/* < 1280: 본문 상단 접이식 */}
      <details className="article-toc__details" ref={detailsRef}>
        <summary>목차 {headings.length}항목</summary>
        {list}
      </details>

      {/* ≥ 1280: 우측 sticky */}
      <div className="article-toc__sticky">
        <p className="toc__label">목차</p>
        {list}
      </div>
    </aside>
  );
}
