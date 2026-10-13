"use client";

import { useEffect, useRef } from "react";
import { ProjectCover } from "./project-cover";

export type HeroCard = {
  slug: string;
  name: string;
  imageUrl: string | null;
  imageAlt: string | null;
  accent: string | null;
};

/**
 * 첫 화면 — 왼쪽은 누구인지, 오른쪽은 무엇을 만들었는지.
 *
 * 대표 프로젝트 커버가 한 묶음으로 쌓여 있다가 부채꼴로 펼쳐지고(한 번의 등장 연출),
 * 포인터를 따라 묶음 전체가 3D로 기웁니다. 카드마다 깊이가 달라 시차가 생깁니다.
 * 기울기는 상태 없이 CSS 변수(--rx, --ry)만 바꿉니다 — 포인터마다 리렌더할 이유가 없습니다.
 * 움직임 줄이기·터치 기기에서는 펼쳐진 상태로 멈춰 있습니다.
 */
export function Hero({
  name,
  role,
  intro,
  github,
  cards,
}: {
  name: string;
  role: string;
  intro: string;
  github?: string;
  cards: HeroCard[];
}) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!matchMedia("(pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let rx = 0;
    let ry = 0;
    const paint = () => {
      raf = 0;
      stage.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
      stage.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    };
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      // 중심에서 -0.5 ~ 0.5
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry = px * 14;
      rx = -py * 10;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      rx = 0;
      ry = 0;
      if (!raf) raf = requestAnimationFrame(paint);
    };

    // 무대 밖(히어로 전체)에서도 반응하도록 부모에 겁니다
    const host = stage.closest(".hero") ?? stage;
    host.addEventListener("pointermove", onMove as EventListener);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onMove as EventListener);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const shown = cards.slice(0, 3);
  // 첫 카드(대표)가 가운데 맨 앞. --o: 가운데에서 떨어진 정도(-1~1), --d: 그 절댓값(깊이)
  const offsets = shown.length === 3 ? [0, -1, 1] : shown.length === 2 ? [0.5, -0.5] : [0];

  return (
    <div className="hero">
      <div className="page hero__inner">
        <div className="hero__text">
          <p className="hero__role">{role}</p>
          <h1 className="hero__name">{name}</h1>
          <p className="hero__intro">{intro}</p>
          <div className="hero__actions">
            <a className="btn btn--solid" href="#projects">
              프로젝트 보기
            </a>
            {github && (
              <a className="btn btn--ghost" href={`https://github.com/${github}`} rel="noreferrer noopener" target="_blank">
                GitHub<span className="sr-only"> (새 창)</span>
              </a>
            )}
          </div>
        </div>

        {shown.length > 0 && (
          <div ref={stageRef} className="hero__stage" data-count={shown.length}>
            <ul className="hero__fan">
              {shown.map((c, i) => (
                <li
                  key={c.slug}
                  className="hero__card"
                  style={
                    {
                      "--o": offsets[i],
                      "--d": Math.abs(offsets[i]),
                      "--accent": c.accent ?? undefined,
                      // 대표(첫 카드)가 항상 맨 위
                      zIndex: 10 - i,
                    } as React.CSSProperties
                  }
                >
                  <a href={`#project-${c.slug}`} aria-label={`${c.name} 프로젝트로 이동`}>
                    <span className="cover">
                      <ProjectCover
                        name={c.name}
                        src={c.imageUrl}
                        alt={c.imageAlt}
                        sizes="(min-width: 64rem) 30vw, 70vw"
                        priority={i === 0}
                      />
                    </span>
                    <span className="hero__card-name">{c.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
