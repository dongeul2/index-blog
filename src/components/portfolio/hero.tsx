"use client";

import { useEffect, useRef } from "react";

/**
 * 첫 화면 — 제도 용지.
 *
 * 이름은 플로터가 펜으로 긋듯 윤곽선이 먼저 그려지고 나서 채워집니다(CSS, `.hero__name`).
 * 포인터를 따라 CAD 커서처럼 십자선과 좌표가 움직입니다. 좌표는 용지 왼쪽 위를 원점으로 한
 * 밀리미터 단위인 척하는 값입니다 — 1px = 0.25mm.
 *
 * 움직임 줄이기를 켰거나 포인터가 거친(터치) 기기에서는 십자선을 띄우지 않습니다.
 * 상태를 React에 두지 않고 DOM 스타일을 직접 바꿉니다 — 포인터마다 리렌더할 이유가 없습니다.
 */
export function Hero({
  name,
  nameLatin,
  role,
  intro,
}: {
  name: string;
  nameLatin: string;
  role: string;
  intro: string;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sheet = sheetRef.current;
    const cursor = cursorRef.current;
    const readout = readoutRef.current;
    if (!sheet || !cursor || !readout) return;

    const fine = matchMedia("(pointer: fine)").matches;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || still) return;

    let raf = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      raf = 0;
      cursor.style.setProperty("--x", `${x}px`);
      cursor.style.setProperty("--y", `${y}px`);
      readout.textContent = `X ${(x / 4).toFixed(1).padStart(6, "0")}  Y ${(y / 4).toFixed(1).padStart(6, "0")}`;
    };
    const onMove = (e: PointerEvent) => {
      const r = sheet.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      sheet.dataset.cursor = "on";
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      sheet.dataset.cursor = "off";
    };

    sheet.addEventListener("pointermove", onMove);
    sheet.addEventListener("pointerleave", onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      sheet.removeEventListener("pointermove", onMove);
      sheet.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={sheetRef} className="hero" data-cursor="off">
      <div className="hero__grid" aria-hidden="true" />

      <div className="page hero__inner">
        <p className="hero__role">{role}</p>
        <h1 className="hero__title">
          <span className="sr-only">{name}</span>
          {/* 윤곽선 → 채움. 글자 수에 따라 폭이 달라지므로 viewBox는 넉넉히, 텍스트는 왼쪽 정렬 */}
          <svg className="hero__name" viewBox="0 0 1000 170" aria-hidden="true" focusable="false">
            <text x="2" y="135">
              {nameLatin}
            </text>
          </svg>
        </h1>
        <p className="hero__intro">{intro}</p>
        <a className="hero__next" href="#about">
          표제란으로 내려가기
        </a>
      </div>

      <div ref={cursorRef} className="hero__cursor" aria-hidden="true">
        <span className="hero__cx" />
        <span className="hero__cy" />
        <span ref={readoutRef} className="hero__readout" />
      </div>
    </div>
  );
}
