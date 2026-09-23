"use client";

import { useEffect, useRef, useState } from "react";
import { highlightLines } from "@/lib/highlight";
import { Button } from "@/components/ui/button";

type Props = {
  code: string;
  lang: string;
  /** 헤드에 표시되고 `aria-label`("코드: …")에도 쓰입니다. */
  filename: string;
  /** 강조할 줄 번호(1-based) */
  highlight?: number[];
};

export function CodeBlock({ code, lang, filename, highlight = [] }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return; // 클립보드가 막힌 환경에서는 "복사됨"을 거짓으로 띄우지 않습니다.
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  const lines = highlightLines(code, lang);
  const hl = new Set(highlight);

  return (
    <figure className="code-block group">
      <div className="code-block__head">
        <span>{filename}</span>
        {/* hover·focus에서만 드러납니다 — 읽는 동안에는 조용해야 합니다 */}
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={copy}
          className={
            copied
              ? "h-6 border-accent px-2 text-accent opacity-100"
              : "h-6 border-border px-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          }
        >
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>

      {/* 가로 스크롤을 키보드로도 움직일 수 있어야 합니다 */}
      <pre tabIndex={0} role="region" aria-label={`코드: ${filename}`}>
        <code>
          {lines.map((tokens, i) => (
            <span
              key={i}
              className={hl.has(i + 1) ? "line line--hl" : "line"}
            >
              <span className="line__no" aria-hidden="true">{i + 1}</span>
              <span className="line__code">
                {tokens.length === 0
                  ? "​"
                  : tokens.map((t, j) => (
                      <span key={j} className={t.cls || undefined}>{t.text}</span>
                    ))}
              </span>
            </span>
          ))}
        </code>
      </pre>

      <span aria-live="polite" className="sr-only">
        {copied ? "복사됨" : ""}
      </span>
    </figure>
  );
}
