"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { channelByHandle, channelInfo, parseChannelRef } from "@/lib/youtube";
import type { Channel } from "@/lib/project-types";

/**
 * 채널 등록·삭제.
 *
 * 경계는 RLS가 지킵니다 — 여기서 관리자 여부를 다시 묻지 않습니다. 쿠키 클라이언트로
 * 쓰면 정책이 그대로 걸리고, 관리자가 아니면 행이 들어가지 않습니다.
 *
 * **조회는 1유닛입니다.** 등록할 때 딱 한 번 부르고, 그 뒤로는 DB에 남은 값을 씁니다.
 */

export type LookupResult =
  | { ok: true; channel: Channel; thumbnail: string | null; already: boolean }
  | { ok: false; error: string };

/** 주소·핸들·ID 중 무엇이 오든 한 번의 호출로 채널을 확정합니다. */
export async function lookupChannel(input: string): Promise<LookupResult> {
  const ref = parseChannelRef(input);
  if (ref.kind === "unknown") {
    return {
      ok: false,
      error: "채널 주소(youtube.com/@이름), @핸들, 또는 UC로 시작하는 채널 ID를 넣어 주세요.",
    };
  }

  const res =
    ref.kind === "id" ? await channelInfo(ref.value) : await channelByHandle(ref.value);

  if (!res.ok) {
    return {
      ok: false,
      error:
        res.kind === "daily"
          ? "YouTube 일일 쿼터를 다 썼습니다. PT 자정에 리셋됩니다."
          : res.message,
    };
  }
  if (!res.data) {
    return { ok: false, error: `'${ref.value}' 로 찾히는 채널이 없습니다. 채널 ID로 시도해 보세요.` };
  }

  const info = res.data;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("channels")
    .select("id")
    .eq("id", info.id)
    .maybeSingle();

  return {
    ok: true,
    already: Boolean(existing),
    thumbnail: info.thumbnail,
    channel: {
      id: info.id,
      name: info.title,
      handle: info.handle,
      url: info.handle
        ? `https://www.youtube.com/${info.handle}`
        : `https://www.youtube.com/channel/${info.id}`,
      note: null,
    },
  };
}

export type WriteResult = { ok: true } | { ok: false; error: string };

export async function addChannel(channel: Channel): Promise<WriteResult> {
  if (!/^UC[\w-]{20,}$/.test(channel.id)) {
    return { ok: false, error: "채널 ID 형식이 아닙니다." };
  }

  const supabase = await createClient();
  // 같은 채널을 두 번 등록해도 메모만 갱신되고 행이 늘지 않습니다.
  const { error } = await supabase.from("channels").upsert(
    {
      id: channel.id,
      name: channel.name,
      handle: channel.handle,
      url: channel.url,
      note: channel.note,
    },
    { onConflict: "id" },
  );

  if (error) return { ok: false, error: `등록하지 못했습니다: ${error.message}` };

  revalidatePath("/admin/videos");
  revalidatePath("/");
  return { ok: true };
}

export async function removeChannel(id: string): Promise<WriteResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("channels").delete().eq("id", id);
  if (error) return { ok: false, error: `지우지 못했습니다: ${error.message}` };

  revalidatePath("/admin/videos");
  revalidatePath("/");
  return { ok: true };
}
