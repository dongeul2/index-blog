"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { flushSync } from "react-dom";

/**
 * 역량 필터 — 범례(Skills)에서 고른 역량으로 프로젝트와 경력을 함께 거릅니다.
 *
 * 상태는 URL(`?skill=`)에 남겨 공유·뒤로 가기가 되게 하되, `useSearchParams`를 쓰지 않습니다.
 * 그걸 쓰면 홈 전체가 정적 생성에서 빠지거나 Suspense 경계가 필요해집니다. 대신 마운트 때 한 번
 * 읽고, 바꿀 때 history에 직접 씁니다.
 *
 * 목록이 바뀌는 순간은 View Transitions로 잇습니다 — 사용자가 누른 것에 대한 응답이라서
 * 움직임이 "무엇이 바뀌었는지"를 보여 줍니다. 지원하지 않거나 움직임 줄이기면 바로 바뀝니다.
 */

type SkillFilter = {
  skill: string | null;
  select: (slug: string | null) => void;
};

const Ctx = createContext<SkillFilter>({ skill: null, select: () => {} });

export const useSkillFilter = () => useContext(Ctx);

const PARAM = "skill";

export function SkillFilterProvider({
  known,
  children,
}: {
  /** 존재하는 역량 슬러그 — URL에 엉뚱한 값이 와도 필터가 걸리지 않게 */
  known: string[];
  children: React.ReactNode;
}) {
  const [skill, setSkill] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const v = new URLSearchParams(location.search).get(PARAM);
      setSkill(v && known.includes(v) ? v : null);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [known]);

  const select = useCallback((slug: string | null) => {
    const url = new URL(location.href);
    if (slug) url.searchParams.set(PARAM, slug);
    else url.searchParams.delete(PARAM);
    history.pushState(history.state, "", url);

    const apply = () => flushSync(() => setSkill(slug));
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!still && "startViewTransition" in document) document.startViewTransition(apply);
    else apply();
  }, []);

  return <Ctx.Provider value={{ skill, select }}>{children}</Ctx.Provider>;
}
