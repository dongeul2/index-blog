import Link from "next/link";
import { Section } from "@/components/section";
import { ProjectCard } from "@/components/project-card";
import { activeProjects, getChannels } from "@/lib/projects";
import { activityStats } from "@/lib/activity";
import { getTopStories } from "@/lib/hn";
import {
  CATEGORY_LABEL,
  getPosts,
  postsOfChannel,
  postsOfProject,
  archiveHref,
  categoryHighlights,
  tagCounts,
} from "@/lib/posts";
import { Badge } from "@/components/ui/badge";

/** 색인의 날짜 열 — 해는 서랍 라벨이 따로 말하므로 월.일만. 사이트 기준은 서울입니다. */
const monthDay = (iso: string) => {
  const d = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(iso));
  const get = (t: string) => d.find((p) => p.type === t)?.value ?? "";
  return `${Number(get("month"))}.${Number(get("day"))}`;
};

const yearOf = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric" }).format(
    new Date(iso),
  );

export default async function Home() {
  const posts = await getPosts();
  const latest = posts.slice(0, 8);
  const highlights = await categoryHighlights(0);
  const activity = activityStats(posts);
  const topTags = (await tagCounts()).slice(0, 12);
  const news = await getTopStories(5);

  // 해마다 서랍 하나. 최신순이 유지되도록 Map 삽입 순서를 그대로 씁니다.
  const drawers = new Map<string, typeof latest>();
  for (const p of latest) {
    const y = yearOf(p.date);
    drawers.set(y, [...(drawers.get(y) ?? []), p]);
  }

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
      <h1 className="sr-only">기록실 INDEX.</h1>
      <p className="home-intro">
        개발하면서 남긴 일지와 영상 요약, 그리고 가끔 쓰는 글을 모아 둡니다. 지금까지{" "}
        <strong>{posts.length}편</strong>
        {activity.thisMonth > 0 && <>, 이번 달에 {activity.thisMonth}편</>}을 썼습니다.
      </p>

      <nav className="drawer-tabs" aria-label="분류별 글">
        {highlights.map(({ category, total }) => (
          <Link key={category} href={archiveHref({ category })}>
            <Badge variant={category}>{CATEGORY_LABEL[category]}</Badge>
            <span className="drawer-tabs__n">{total}편</span>
          </Link>
        ))}
      </nav>

      {/* 색인 — 홈의 표제입니다. 최근 글을 해마다 서랍에 나눠 큰 활자로 늘어놓습니다 */}
      {latest.length > 0 ? (
        <div className="index">
          {[...drawers].map(([year, items]) => (
            <section key={year} aria-labelledby={`drawer-${year}`}>
              <h2 className="index__year" id={`drawer-${year}`}>
                {year}
              </h2>
              <ol className="index__list">
                {items.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/posts/${p.slug}`} className="index__row">
                      <time dateTime={p.date} className="index__date">
                        {monthDay(p.date)}
                      </time>
                      <span className="index__title">{p.title}</span>
                      <span className="index__tab">
                        <Badge variant={p.category}>
                          <span className="sr-only">분류: </span>
                          {CATEGORY_LABEL[p.category]}
                        </Badge>
                        {p.generated && (
                          <span className="index__auto">
                            자동 생성<span className="sr-only">된 요약</span>
                          </span>
                        )}
                      </span>
                      {p.summary && <span className="index__summary">{p.summary}</span>}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          <p>
            <Link href="/archive" className="section__more">
              지난 글 전부 보기
            </Link>
          </p>
        </div>
      ) : (
        <div className="empty-state">아직 글이 없습니다. 첫 글은 관리 화면에서 쓸 수 있습니다.</div>
      )}

      {/* 태그 — 책 뒤의 찾아보기처럼 이름과 개수만 */}
      {topTags.length > 0 && (
        <Section title="자주 쓰는 태그" more={{ href: "/tags", text: "태그 전부" }}>
          <ul className="tag-index">
            {topTags.map((t) => (
              <li key={t.value}>
                <Link href={`/tags/${encodeURIComponent(t.value)}`}>
                  <span>{t.value}</span>
                  <span className="tag-index__n">{t.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 진행 중 프로젝트 */}
      <Section
        title="진행 중인 프로젝트"
        more={{ href: "/projects", text: "프로젝트 전부" }}
      >
        <ul className="project-grid">
          {projects.map(({ project, devlogs }) => (
            <li key={project.slug}>
              <ProjectCard project={project} devlogs={devlogs} />
            </li>
          ))}
        </ul>
      </Section>

      {/* 요즘 보는 것 — 캐시된 정적 데이터. 방문자가 봐도 API 쿼터를 쓰지 않습니다. */}
      <Section title="요즘 보는 것">
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

      {/* 업계 소식 — Hacker News, 1시간 캐시. 실패하면 섹션째 생략합니다. */}
      {news.length > 0 && (
          <Section title="오늘 읽을 만한 바깥 글">
          <ul className="flex flex-col divide-y divide-border border-t border-border">
            {news.map((story) => (
              <li key={story.id}>
                <a
                  href={story.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-baseline justify-between gap-3 py-3 transition-colors hover:bg-bg-subtle hover:no-underline"
                >
                  <span className="min-w-0 truncate text-text">
                    {story.title}
                    {story.domain && (
                      <span className="ml-2 text-caption text-text-muted">
                        {story.domain}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-caption tabular-nums text-text-muted">
                    {story.score}점
                    <span className="sr-only">, 댓글 {story.commentCount}개</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-caption text-text-muted">
            <a
              href="https://news.ycombinator.com/"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2"
            >
              Hacker News
            </a>
            의 인기 글을 한 시간마다 가져옵니다.
          </p>
        </Section>
        )}
    </div>
  );
}
