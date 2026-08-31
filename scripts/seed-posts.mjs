/**
 * content/posts/*.md → Supabase `posts` 테이블.
 *
 *   node --env-file=.env.local scripts/seed-posts.mjs
 *
 * service_role 키를 쓰므로 RLS를 우회합니다. 서버(내 컴퓨터)에서만 돌리는 스크립트이고,
 * 앱 코드에서는 절대 이 키를 쓰지 않습니다.
 *
 * slug 기준 upsert라 여러 번 돌려도 안전합니다.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminLogin = process.env.ADMIN_GITHUB_LOGIN;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

/** 프론트매터의 date(YYYY-MM-DD)를 KST 자정으로 봅니다. */
function publishedAt(value) {
  const day = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  return `${day}T00:00:00+09:00`;
}

const dir = path.join(process.cwd(), "content", "posts");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));

const rows = files.map((file) => {
  const { data, content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
  return {
    slug: file.replace(/\.md$/, ""),
    title: String(data.title ?? ""),
    category: String(data.category ?? "essay"),
    status: "published",
    source: String(data.source ?? "manual"),
    source_ref: data.source_ref ? String(data.source_ref) : null,
    project: data.project ? String(data.project) : null,
    channel: data.channel ? String(data.channel) : null,
    summary: String(data.summary ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    body: content.trim(),
    published_at: publishedAt(data.date),
  };
});

const { error, count } = await db
  .from("posts")
  .upsert(rows, { onConflict: "slug", count: "exact" });

if (error) {
  console.error("시드 실패:", error.message);
  process.exit(1);
}
console.log(`posts: ${count ?? rows.length}건 반영`);

// 관리자 허용 목록. 값은 .env.local에서만 읽습니다.
if (adminLogin) {
  const { error: adminError } = await db
    .from("admins")
    .upsert(
      { github_login: adminLogin.trim().toLowerCase(), note: "ADMIN_GITHUB_LOGIN" },
      { onConflict: "github_login" },
    );
  if (adminError) {
    console.error("관리자 등록 실패:", adminError.message);
    process.exit(1);
  }
  console.log("admins: 1건 반영 (ADMIN_GITHUB_LOGIN)");
} else {
  console.warn("ADMIN_GITHUB_LOGIN 이 없어 관리자 등록을 건너뜁니다.");
}
