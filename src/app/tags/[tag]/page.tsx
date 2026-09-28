import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LoadMore } from "@/components/load-more";
import { PostCard } from "@/components/post-card";
import { Section } from "@/components/section";
import { archiveHref, postsOfTag, relatedTags, tagCounts } from "@/lib/posts";
import { Chip, ChipCount } from "@/components/ui/chip";

type Params = { tag: string };

export async function generateStaticParams(): Promise<Params[]> {
  return (await tagCounts()).map((t) => ({ tag: t.value }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const tag = decodeURIComponent((await params).tag);
  return { title: `#${tag}`, description: `${tag} 태그가 달린 글.` };
}

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const tag = decodeURIComponent((await params).tag);
  const posts = await postsOfTag(tag);
  if (posts.length === 0) notFound();

  const related = await relatedTags(tag);

  return (
    <div className="page tag">
      <header className="tag-head">
        <p className="tag-head__back">
          <Link href="/tags">← 전체 태그</Link>
        </p>

        <h1 className="tag-head__title">#{tag}</h1>
        <p className="tag-head__count">
          {posts.length}편
          <span className="tag-head__sep" aria-hidden="true">/</span>
          <Link href={archiveHref({ tag })}>아카이브에서 분류와 연도로 더 좁히기</Link>
        </p>

        {related.length > 0 && (
          <div className="tag-head__related">
            <p className="tag-head__related-label">함께 쓰인 태그</p>
            <div className="tag-head__related-chips">
              {related.map((t) => (
                <Chip key={t.value} asChild>
                  <Link href={`/tags/${encodeURIComponent(t.value)}`}>
                    #{t.value}
                    <ChipCount>{t.count}</ChipCount>
                  </Link>
                </Chip>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* 태그 페이지는 페이지네이션이 아니라 「더 보기」입니다(디자인 시스템 규칙) */}
      <Section title="글">
        <LoadMore
          step={5}
          label="글"
          listClassName="archive__list"
          items={posts.map((p) => (
            <li key={p.slug}>
              <PostCard post={p} />
            </li>
          ))}
        />
      </Section>
    </div>
  );
}
