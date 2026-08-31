import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Toc } from "@/components/toc";
import { PostNav } from "@/components/post-nav";
import { SetReadingTitle } from "@/components/reading-title";
import { getProject } from "@/lib/projects";
import {
  CATEGORY_LABEL,
  formatDate,
  getAdjacent,
  getPost,
  getPostTree,
  getPosts,
} from "@/lib/posts";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};
  return { title: post.title, description: post.summary };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  const tree = await getPostTree(slug);
  if (!post || !tree) notFound();

  const { prev, next } = await getAdjacent(post.slug);
  const project = post.project ? await getProject(post.project) : undefined;

  return (
    <div className="page article-shell">
      {/* 축소된 헤더에 이 글 제목을 노출 */}
      <SetReadingTitle title={post.title} />

      <article className="article-main">
        <header className="post-head">
          {/* devlog는 소속 프로젝트 링크 줄을 답니다 */}
          {project && (
            <p className="post-head__project">
              <span>프로젝트</span>
              <Link href={`/projects/${project.slug}`}>{project.name}</Link>
              {project.repo && <code>{project.repo}</code>}
            </p>
          )}

          <span className={`badge badge--${post.category}`}>
            {CATEGORY_LABEL[post.category]}
            <span className="sr-only">분류: {CATEGORY_LABEL[post.category]}</span>
          </span>

          <h1>{post.title}</h1>

          <p className="post-head__meta">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span className="post-head__sep" aria-hidden="true">/</span>
            <span>
              읽는 시간 <time dateTime={`PT${post.readingMinutes}M`}>{post.readingMinutes}분</time>
            </span>
            {post.generated && (
              <>
                <span className="post-head__sep" aria-hidden="true">/</span>
                {/* 아이콘 없이 카테고리 색 텍스트로만 표기 */}
                <span style={{ color: `var(--color-cat-${post.category})` }}>
                  자동 생성
                  <span className="sr-only">자동 생성된 요약</span>
                </span>
              </>
            )}
          </p>

          <div className="post-head__tags">
            {post.tags.map((t) => (
              <Link key={t} href={`/tags/${encodeURIComponent(t)}`} className="chip">
                #{t}
              </Link>
            ))}
          </div>
        </header>

        {post.headings.length > 0 && <Toc headings={post.headings} />}

        <Markdown tree={tree} />

        <PostNav prev={prev} next={next} />
      </article>
    </div>
  );
}
