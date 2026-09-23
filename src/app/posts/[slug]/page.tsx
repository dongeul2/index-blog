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
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";

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

          <Badge variant={post.category}>
            {CATEGORY_LABEL[post.category]}
            <span className="sr-only">분류: {CATEGORY_LABEL[post.category]}</span>
          </Badge>

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
              <Chip key={t} asChild>
                <Link href={`/tags/${encodeURIComponent(t)}`}>#{t}</Link>
              </Chip>
            ))}
          </div>
        </header>

        {/* 영상요약 글만 — 이 글이 실제로 다루는 영상이라 장식이 아니라 본문의 일부입니다.
            .media-frame은 hover로 밝아지는 썸네일용이라(항상 어둡게 남음), 실제 재생되는
            플레이어는 admin 시청 화면(13)과 같은 방식으로 처음부터 정상 밝기로 둡니다. */}
        {post.category === "video" && post.sourceRef && (
          <div className="post-head__video relative mt-8 aspect-video w-full overflow-hidden border border-border bg-media">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${post.sourceRef}`}
              title={post.title}
              className="size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {post.headings.length > 0 && <Toc headings={post.headings} />}

        <Markdown tree={tree} />

        <PostNav prev={prev} next={next} />
      </article>
    </div>
  );
}
