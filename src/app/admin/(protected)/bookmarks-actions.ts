"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * 대시보드 바로가기 위젯 — 등록·삭제.
 *
 * 경계는 RLS가 지킵니다(`bookmarks_admin_all`) — 여기서 관리자 여부를 다시 묻지
 * 않습니다. 이 기능은 관리자 전용으로 정해졌으므로 공개 읽기 정책 자체가 없습니다.
 */

export type Bookmark = { id: number; url: string; title: string };

export type WriteResult = { ok: true } | { ok: false; error: string };

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.toString();
  } catch {
    return null;
  }
}

export async function addBookmark(input: { url: string; title: string }): Promise<WriteResult> {
  const url = normalizeUrl(input.url);
  if (!url) return { ok: false, error: "올바른 URL이 아닙니다." };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "이름을 입력하세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("bookmarks").insert({ url, title });
  if (error) return { ok: false, error: `추가하지 못했습니다: ${error.message}` };

  revalidatePath("/admin");
  return { ok: true };
}

export async function removeBookmark(id: number): Promise<WriteResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("bookmarks").delete().eq("id", id);
  if (error) return { ok: false, error: `지우지 못했습니다: ${error.message}` };

  revalidatePath("/admin");
  return { ok: true };
}
