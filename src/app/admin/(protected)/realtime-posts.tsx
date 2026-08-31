"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 큐 상태가 바뀌면 화면을 다시 그립니다.
 *
 * 자동화가 다른 프로세스에서 행을 갱신하므로, 대시보드를 열어 둔 채로도 대기 → 처리중 →
 * 완료/실패가 반영되어야 합니다. 목록 자체는 서버가 그리고, 여기서는 변경 신호를 받아
 * `router.refresh()`만 부릅니다 — 상태를 두 벌로 관리하지 않기 위해서입니다.
 *
 * RLS는 realtime에도 적용되므로, 관리자가 아니면 애초에 아무 신호도 오지 않습니다.
 */
export function RealtimePosts() {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        router.refresh();
      })
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <p className="realtime" role="status" aria-live="polite">
      <span className={live ? "realtime__dot realtime__dot--on" : "realtime__dot"} aria-hidden="true" />
      {live ? "실시간 갱신 중" : "실시간 연결 대기"}
    </p>
  );
}
