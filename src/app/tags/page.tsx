import type { Metadata } from "next";
import Link from "next/link";
import { getPosts, tagCounts } from "@/lib/posts";
import { Chip, ChipCount } from "@/components/ui/chip";

export const metadata: Metadata = {
  title: "태그",
  description: "전체 태그와 각 태그에 달린 글 수.",
};

export default async function TagsPage() {
  const tags = await tagCounts();
  const total = (await getPosts()).length;
  const max = tags[0]?.count ?? 1;

  return (
    <div className="page tags">
      <header className="tags-head">
        <h1 className="tags-head__title">태그</h1>
        <p className="tags-head__count">
          태그 {tags.length}종 · 글 {total}편
        </p>
      </header>

      {/* 개수 내림차순. 많이 쓰인 태그일수록 위에 오되, 크기는 키우지 않습니다
          — 글자 크기로 빈도를 표현하면 읽기 리듬이 깨집니다. 숫자로만 알립니다. */}
      <ul className="tag-cloud">
        {tags.map((t) => (
          <li key={t.value}>
            <Chip asChild>
              <Link href={`/tags/${encodeURIComponent(t.value)}`}>
                #{t.value}
                <ChipCount>{t.count}</ChipCount>
                <span className="sr-only">, 글 {t.count}편</span>
              </Link>
            </Chip>
            {/* 빈도를 시각적으로도 한 줄 — 괘선 길이로만 */}
            <span
              className="tag-cloud__bar"
              style={{ width: `${Math.round((t.count / max) * 100)}%` }}
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
