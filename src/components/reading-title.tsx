"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * 축소된 헤더(44px)에 노출할 "지금 읽고 있는 글" 제목.
 * 헤더는 레이아웃에, 제목을 아는 쪽은 페이지에 있으므로 컨텍스트로 잇습니다.
 */
const Ctx = createContext<{
  title: string | null;
  setTitle: (t: string | null) => void;
}>({ title: null, setTitle: () => {} });

export function ReadingTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  return <Ctx.Provider value={{ title, setTitle }}>{children}</Ctx.Provider>;
}

export function useReadingTitle() {
  return useContext(Ctx).title;
}

/** 글 상세에서 호출하면 헤더가 축소될 때 이 제목을 보여줍니다. */
export function SetReadingTitle({ title }: { title: string }) {
  const { setTitle } = useContext(Ctx);
  useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
  return null;
}
