"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 편집 모드 — 홈은 누구에게나 같은 정적 페이지이고, 관리자에게만 브라우저에서 편집 도구가 붙습니다.
 *
 * 관리자 여부를 서버에서 판단하면(쿠키를 읽으면) 홈 전체가 요청마다 렌더되는 동적 페이지가
 * 됩니다. 그래서 여기서는 브라우저가 세션을 보고 `is_admin()`을 물어 버튼만 띄우고,
 * 실제 권한은 저장할 때 서버 액션과 RLS가 다시 확인합니다.
 */

type EditMode = { isAdmin: boolean; editing: boolean };

const Ctx = createContext<EditMode>({ isAdmin: false, editing: false });

export const useEditMode = () => useContext(Ctx);

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    // 개발 서버 전용: 로그인 없이 편집 UI 모양만 확인(`?edit-preview`). 저장은 서버가 거부합니다.
    if (process.env.NODE_ENV !== "production" && new URLSearchParams(location.search).has("edit-preview")) {
      queueMicrotask(() => {
        setIsAdmin(true);
        setEditing(true);
      });
      return;
    }
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: admin } = await supabase.rpc("is_admin");
      if (alive && admin === true) {
        setIsAdmin(true);
        // 새로고침해도 편집 중이던 상태를 이어 갑니다(이 브라우저에서만)
        try {
          setEditing(sessionStorage.getItem("folio-editing") === "1");
        } catch {}
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggle = () => {
    const next = !editing;
    setEditing(next);
    try {
      sessionStorage.setItem("folio-editing", next ? "1" : "0");
    } catch {}
  };

  return (
    <Ctx.Provider value={{ isAdmin, editing: isAdmin && editing }}>
      {children}
      {isAdmin && (
        <div className="edit-dock" role="region" aria-label="편집 도구">
          <button type="button" className="edit-dock__toggle" aria-pressed={editing} onClick={toggle}>
            {editing ? "편집 끝내기" : "이 화면 편집하기"}
          </button>
          <Link href="/admin" className="edit-dock__link">
            관리자 화면
          </Link>
        </div>
      )}
    </Ctx.Provider>
  );
}
