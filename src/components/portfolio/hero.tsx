"use client";

import { useEffect, useRef } from "react";
import { ROLES, ROLE_LABEL } from "@/lib/roles";

/**
 * 첫 화면 — 네 자루 펜의 플로터.
 *
 * 이름을 기획·개발·QA·운영 네 색의 펜이 차례로 긋고(조금씩 어긋난 다색 인쇄처럼), 마지막에
 * 먹으로 채웁니다. 포인터를 올리면 네 장의 도면이 3D로 벌어져 역할별 층으로 나뉘고, 포인터를
 * 따라 기웁니다 — 한 사람이 네 역할을 겹쳐 하고 있다는 것을 그림으로.
 *
 * 3D는 CSS(preserve-3d)입니다. 레이어 다섯 장을 기울이는 데 WebGL은 과하고, 글자가 벡터로
 * 남아야 선명합니다. 기울기·벌어짐은 CSS 변수만 바꿔 리렌더 없이 움직입니다.
 * CAD 커서(십자선·좌표)는 그대로 둡니다. 움직임 줄이기·터치 기기에서는 펼쳐지지 않습니다.
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
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sheet = sheetRef.current;
    const cursor = cursorRef.current;
    const readout = readoutRef.current;
    const stack = stackRef.current;
    if (!sheet || !cursor || !readout || !stack) return;

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
      // 이름 묶음의 가운데를 기준으로 기울입니다(-1 ~ 1)
      const r = stack.getBoundingClientRect();
      const s = sheet.getBoundingClientRect();
      const px = (x + s.left - (r.left + r.width / 2)) / (s.width / 2);
      const py = (y + s.top - (r.top + r.height / 2)) / (s.height / 2);
      stack.style.setProperty("--ry", `${(px * 22).toFixed(2)}deg`);
      stack.style.setProperty("--rx", `${(-py * 16 + 18).toFixed(2)}deg`);
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

  const text = (
    <text x="2" y="135">
      {nameLatin}
    </text>
  );

  return (
    <div ref={sheetRef} className="hero" data-cursor="off">
      <div className="hero__grid" aria-hidden="true" />

      <div className="page hero__inner">
        {role && <p className="hero__role">{role}</p>}
        <h1 className="hero__title">
          <span className="sr-only">{name || nameLatin}</span>
          <div ref={stackRef} className="hero__stack" aria-hidden="true">
            {ROLES.map((r, i) => (
              <div key={r} className="hero__layer" data-role={r} style={{ "--i": i } as React.CSSProperties}>
                <svg className="hero__pen" viewBox="0 0 1000 170" focusable="false">
                  {text}
                </svg>
                <span className="hero__tag">{ROLE_LABEL[r]}</span>
              </div>
            ))}
            {/* 먹 — 펜 네 자루가 다 그은 뒤 채워지는 맨 윗장. 이 장이 묶음의 크기를 정합니다 */}
            <svg className="hero__ink" viewBox="0 0 1000 170" focusable="false">
              {text}
            </svg>
          </div>
        </h1>
        {intro && <p className="hero__intro">{intro}</p>}
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
