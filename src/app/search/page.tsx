import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/section";
import { PostCard } from "@/components/post-card";
import { ProjectCard } from "@/components/project-card";
import { LoadMore } from "@/components/load-more";
import { getPosts, postsOfProject, searchPosts } from "@/lib/posts";
import { searchProjects } from "@/lib/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "검색",
  description: "글과 프로젝트를 함께 찾습니다.",
};

type Search = { q?: string };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const q = ((await searchParams).q ?? "").trim();

  const posts = q ? await searchPosts(q) : [];
  const projects = q ? await searchProjects(q) : [];
  const recent = q ? [] : await getPosts();
  const projectDevlogs = await Promise.all(
    projects.map(async (p) => (await postsOfProject(p.slug)).length),
  );
  const total = posts.length + projects.length;

  return (
    <div className="page search-page">
      <header className="search-page__head">
        <h1 className="search-page__title">검색</h1>

        {/* JS 없이도 동작하도록 GET 폼입니다 — 제출하면 그대로 ?q=가 됩니다 */}
        <form className="search-page__form" action="/search" method="get" role="search">
          <label className="sr-only" htmlFor="q">
            글과 프로젝트 검색
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="글 제목, 태그, 프로젝트"
            className="h-11 flex-1 border-accent text-base"
            autoComplete="off"
          />
          <Button type="submit">검색</Button>
        </form>

        <p className="search-page__count" role="status" aria-live="polite">
          {q ? (
            <>
              &lsquo;{q}&rsquo;로 글 {posts.length}건, 프로젝트 {projects.length}건을 찾았습니다.
            </>
          ) : (
            "검색어를 입력하세요."
          )}
        </p>
      </header>

      {q && total === 0 && (
        <div className="empty-state search-page__empty">
          <p>&lsquo;{q}&rsquo;와 일치하는 글이 없습니다</p>
          <p style={{ marginTop: "1rem" }}>
            <Link href="/archive">아카이브에서 분류와 태그로 찾아보기</Link>
          </p>
        </div>
      )}

      {posts.length > 0 && (
        <Section title={`글 ${posts.length}건`}>
          <LoadMore
            step={5}
            label="글"
            items={posts.map((p) => (
              <li key={p.slug}>
                <PostCard post={p} highlight={q} />
              </li>
            ))}
            listClassName="archive__list"
          />
        </Section>
      )}

      {projects.length > 0 && (
        <Section title={`프로젝트 ${projects.length}건`}>
          <ul className="project-grid">
            {projects.map((project, i) => (
              <li key={project.slug}>
                <ProjectCard project={project} devlogs={projectDevlogs[i]} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 검색어가 없을 때는 빈 화면 대신 최근 글로 회수합니다 */}
      {!q && (
        <Section title="최근 글" more={{ href: "/archive", text: "아카이브" }}>
          <ul className="search-page__recent">
            {recent.slice(0, 6).map((p) => (
              <li key={p.slug}>
                <Link href={`/posts/${p.slug}`}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
