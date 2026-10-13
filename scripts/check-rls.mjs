/**
 * RLS가 실제로 막고 있는지 확인합니다.
 *
 *   node --env-file=.env.local scripts/check-rls.mjs
 *
 * 공개 키(anon/publishable)로만 접속해서, 정책이 의도대로 도는지 봅니다.
 * 정책을 고칠 때마다 돌려 보세요 — "될 것이다"와 "된다"는 다릅니다.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !publicKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / 공개 키가 필요합니다.");
  process.exit(1);
}

const db = createClient(url, publicKey, { auth: { persistSession: false } });

let failed = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "  OK  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

// 1. 발행된 글은 읽힌다
const { data: rows, error: readError } = await db
  .from("posts")
  .select("slug, status, published_at");

check("익명 읽기 가능", !readError, readError?.message ?? "");

if (rows) {
  check("발행글만 보인다", rows.every((r) => r.status === "published"));
  check(
    "초안은 안 보인다",
    !rows.some((r) => r.slug === "rls-check-draft"),
  );
  check(
    "예약 발행은 시각 전까지 안 보인다",
    !rows.some((r) => r.slug === "rls-check-scheduled"),
  );
  console.log(`        (익명에게 보이는 글: ${rows.length}건)`);
}

// 2. 본문도 읽힌다 (글 상세에 필요) — 특정 글에 기대지 않고, 보이는 글 중 하나로 확인합니다.
//    공개된 글이 없으면 "통과"가 아니라 "건너뜀"입니다 — 대상 없이 통과하는 검사는 거짓 안심입니다.
const visible = rows?.[0]?.slug;
const skip = (label) => console.log(` SKIP  ${label} — 익명에게 보이는 글이 없음`);

if (visible) {
  const { data: one, error: bodyError } = await db
    .from("posts")
    .select("slug, body")
    .eq("slug", visible)
    .single();
  check("본문 읽기 가능", !bodyError && Boolean(one?.body), bodyError?.message ?? "");
} else {
  skip("본문 읽기 가능");
}

// 3. 쓰기는 막힌다 — 보이는 글(있으면)과 항상 있는 검증 행 둘 다에 시도합니다
const { error: insertError } = await db
  .from("posts")
  .insert({ slug: "anon-should-fail", title: "x", category: "essay" });
check("익명 INSERT 차단", Boolean(insertError), insertError ? "" : "삽입이 성공해 버렸습니다");

for (const slug of [visible, "rls-check-draft"].filter(Boolean)) {
  const { data: updated } = await db.from("posts").update({ title: "해킹됨" }).eq("slug", slug).select();
  check(`익명 UPDATE 차단 (${slug})`, !updated || updated.length === 0);

  const { data: deleted } = await db.from("posts").delete().eq("slug", slug).select();
  check(`익명 DELETE 차단 (${slug})`, !deleted || deleted.length === 0);
}

// 4. 허용 목록 테이블은 아예 닫혀 있다
const { data: admins } = await db.from("admins").select("github_login");
check("admins 테이블 비공개", !admins || admins.length === 0);

// 5. 프로젝트·채널·저장소 캐시 — 읽기는 열려 있고 쓰기는 막혀야 합니다
for (const table of ["projects", "channels", "repo_commits", "repo_pulls"]) {
  const { error: readError } = await db.from(table).select("*").limit(1);
  check(`${table} 읽기 가능`, !readError, readError?.message ?? "");
}

const { error: projectInsert } = await db
  .from("projects")
  .insert({ slug: "anon-should-fail", name: "x" });
check("projects 익명 INSERT 차단", Boolean(projectInsert));

const { data: projectUpdate } = await db
  .from("projects")
  .update({ name: "해킹됨" })
  .eq("slug", "index-blog")
  .select();
check("projects 익명 UPDATE 차단", !projectUpdate || projectUpdate.length === 0);

const { error: channelInsert } = await db
  .from("channels")
  .insert({ id: "anon-should-fail", name: "x" });
check("channels 익명 INSERT 차단", Boolean(channelInsert));

console.log(failed === 0 ? "\n전부 통과" : `\n${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
