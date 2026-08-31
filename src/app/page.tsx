import Link from "next/link";
import { Section } from "@/components/section";
import { PostCard } from "@/components/post-card";
import { ProjectCard } from "@/components/project-card";
import { activeProjects, getChannels } from "@/lib/projects";
import {
  CATEGORY_LABEL,
  getPosts,
  postsOfChannel,
  postsOfProject,
  archiveHref,
  categoryHighlights,
  formatDate,
} from "@/lib/posts";

export default async function Home() {
  const posts = await getPosts();
  const latest = posts.slice(0, 4);
  const highlights = await categoryHighlights(3);

  // JSX 안에서는 await 할 수 없으므로 미리 묶어 둡니다.
  const projects = await Promise.all(
    (await activeProjects()).map(async (project) => ({
      project,
      devlogs: (await postsOfProject(project.slug)).length,
    })),
  );
  const watching = await Promise.all(
    (await getChannels()).map(async (channel) => ({
      channel,
      posts: await postsOfChannel(channel.id),
    })),
  );

  return (
    <div className="page home">
      {/* 표제 — 본문에서 뺀 개성을 여기서 씁니다 */}
      <header className="home-hero">
        <h1 className="home-hero__title">
          읽기는 조용하게,
          <br />
          탐색은 대담하게<span className="home-hero__dot">.</span>
        </h1>
        <p className="home-hero__sub">
          개발 일지 · 영상 요약 · 일반 글 {posts.length}편. 상당수는 자동화 파이프라인이 먼저 초안을
          만들고, 손으로 다듬어 올립니다.
        </p>
      </header>

      {/* 1. 최신 글 */}
      <Section
        label="LATEST"
        title="최신 글"
        more={{ href: "/archive", text: "아카이브 전체 보기" }}
      >
        <ul className="archive__list">
          {latest.map((p) => (
            <li key={p.slug}>
              <PostCard post={p} />
            </li>
          ))}
        </ul>
      </Section>

      {/* 2. 카테고리 하이라이트 */}
      <Section label="BY CATEGORY" title="분류별로 보기">
        <div className="cat-grid">
          {highlights.map(({ category, total, posts }) => (
            <div className="cat-col" key={category}>
              <div className="cat-col__head">
                <span className={`badge badge--${category}`}>
                  {CATEGORY_LABEL[category]}
                  <span className="sr-only">분류: {CATEGORY_LABEL[category]}</span>
                </span>
                <span className="cat-col__count">{total}편</span>
              </div>
              <ul className="cat-col__list">
                {posts.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/posts/${p.slug}`} className="cat-col__link">
                      {p.title}
                    </Link>
                    <time dateTime={p.date} className="cat-col__date">
                      {formatDate(p.date)}
                    </time>
                  </li>
                ))}
              </ul>
              <p className="cat-col__more">
                <Link href={archiveHref({ category })}>
                  {CATEGORY_LABEL[category]} 전체 <span aria-hidden="true">→</span>
                </Link>
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 3. 진행 중 프로젝트 */}
      <Section
        label="PROJECTS"
        title="진행 중 프로젝트"
        more={{ href: "/projects", text: "보관된 것까지 전부" }}
      >
        <ul className="project-grid">
          {projects.map(({ project, devlogs }) => (
            <li key={project.slug}>
              <ProjectCard project={project} devlogs={devlogs} />
            </li>
          ))}
        </ul>
      </Section>

      {/* 4. 요즘 보는 것 — 캐시된 정적 데이터. 방문자가 봐도 API 쿼터를 쓰지 않습니다. */}
      <Section label="WATCHING" title="요즘 보는 것">
        <ul className="watch-list">
          {watching.map(({ channel: ch, posts }) => {
            return (
              <li className="watch-row" key={ch.id}>
                <div className="watch-row__channel">
                  {ch.url ? (
                    <a href={ch.url} rel="noreferrer noopener" target="_blank">
                      {ch.name}
                    </a>
                  ) : (
                    <span>{ch.name}</span>
                  )}
                  {ch.handle && <span className="watch-row__handle">{ch.handle}</span>}
                  {ch.note && <p className="watch-row__note">{ch.note}</p>}
                </div>

                <div className="watch-row__posts">
                  {posts.length > 0 ? (
                    <ul>
                      {posts.map((p) => (
                        <li key={p.slug}>
                          <Link href={`/posts/${p.slug}`}>{p.title}</Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="watch-row__none">아직 정리한 글 없음</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
