import type { Metadata } from "next";
import Link from "next/link";
import { ChannelManager } from "./channel-manager";
import { getQuota } from "@/lib/ai/quota";
import { createClient } from "@/lib/supabase/server";
import type { Channel } from "@/lib/project-types";
import { QuotaMeter } from "@/components/quota-meter";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "채널 구독 관리",
  robots: { index: false, follow: false },
};

/** 쿼터는 지금 값이어야 의미가 있습니다 — 캐시하지 않습니다. */
export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const supabase = await createClient();

  const [{ data: channels }, { data: posts }, quota] = await Promise.all([
    supabase.from("channels").select("id, name, handle, url, note").order("name"),
    supabase.from("posts").select("channel").not("channel", "is", null),
    getQuota(),
  ]);

  // 채널별 요약 글 수 — 구독을 끊기 전에 "이 채널에서 몇 편 나왔는지" 보이는 편이 낫습니다.
  const postsPerChannel: Record<string, number> = {};
  for (const p of posts ?? []) {
    const id = p.channel as string | null;
    if (id) postsPerChannel[id] = (postsPerChannel[id] ?? 0) + 1;
  }

  const y = quota.youtube;

  return (
    <div className="page admin-page">
      <header className="admin-head">
        <div className="admin-head__row">
          <div>
            <h1 className="admin-head__title">채널 구독 관리</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/videos">영상 브라우즈</Link>
          </Button>
        </div>
        <p className="admin-head__who">
          여기 있는 채널의 최신 업로드만 훑습니다. 공개 화면에는 「요즘 보는 것」으로만 나갑니다.
        </p>
      </header>

      {/* 쿼터 현황 — 무엇을 할 수 있는지가 먼저 보여야 합니다 */}
      <section className="mt-8 grid grid-cols-1 gap-6 border border-border bg-bg-subtle p-5 md:grid-cols-3">
        <QuotaMeter
          label="YOUTUBE 유닛"
          value={y.unitsRemaining}
          limit={y.unitsLimit}
          unit="유닛"
          level={y.level}
          note={`오늘 ${y.calls}회 호출 · ${y.unitsUsed.toLocaleString()}유닛 사용`}
        />
        <QuotaMeter
          label="남은 채널 훑기"
          value={y.unitsRemaining}
          limit={y.unitsLimit}
          unit="회"
          level={y.level}
          note="채널 하나를 훑는 데 1유닛입니다."
        />
        <QuotaMeter
          label="남은 검색"
          value={y.searchesRemaining}
          limit={Math.floor(y.unitsLimit / 100)}
          unit="회"
          level={y.level}
          note="검색 한 번은 100유닛 — 훑기 100번과 같습니다."
        />
      </section>

      <ChannelManager
        channels={(channels ?? []) as Channel[]}
        postsPerChannel={postsPerChannel}
        quotaEmpty={y.unitsRemaining <= 0}
      />
    </div>
  );
}
