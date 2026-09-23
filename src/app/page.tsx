import Link from "next/link";
import { Section } from "@/components/section";
import { ProjectCard } from "@/components/project-card";
import { ActivitySpark } from "@/components/activity-spark";
import { TagRhythm } from "@/components/tag-rhythm";
import { Reveal } from "@/components/reveal";
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
  formatDate,
} from "@/lib/posts";
import { Badge } from "@/components/ui/badge";

export default async function Home() {
  const posts = await getPosts();
  const latest = posts.slice(0, 5);
  const [feature, ...rest] = latest;
  const highlights = await categoryHighlights(3);
  const activity = activityStats(posts);
  const topTags = (await tagCounts()).slice(0, 8);
  const news = await getTopStories(5);

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
      <Reveal as="header" className="home-hero">
        <h1 className="home-hero__title">
          읽기는 조용하게,
          <br />
          탐색은 대담하게<span className="home-hero__dot">.</span>
        </h1>
        <p className="home-hero__sub">
          개발 일지 · 영상 요약 · 일반 글 {posts.length}편. 상당수는 자동화 파이프라인이 먼저 초안을
          만들고, 손으로 다듬어 올립니다.
        </p>

        {/* 활동 리듬 — 장식이 아니라 정보입니다. 숫자가 먼저, 막대는 거듭 말하는 것 */}
        {activity.weeks.some((n) => n > 0) && (
          <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-3">
            <p className="font-mono text-[0.75rem] tracking-[0.02em] text-text-muted">
              이번 달 {activity.thisMonth}편 · 올해 {activity.thisYear}편
              {activity.streakWeeks > 1 && ` · 연속 ${activity.streakWeeks}주 발행`}
            </p>
            <ActivitySpark activity={activity} />
          </div>
        )}
      </Reveal>

      {/* 1. 최신 글 — 가장 최근 1편은 크게, 나머지는 목록으로 */}
      <Reveal>
      <Section
        label="LATEST"
        title="최신 글"
        more={{ href: "/archive", text: "아카이브 전체 보기" }}
      >
        {feature ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-stretch">
            <Link
              href={`/posts/${feature.slug}`}
              className="group flex flex-col gap-3 border border-border p-6 transition-[background-color,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:bg-bg-subtle hover:no-underline"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant={feature.category}>
                  {CATEGORY_LABEL[feature.category]}
                  <span className="sr-only">분류: {CATEGORY_LABEL[feature.category]}</span>
                </Badge>
                <time dateTime={feature.date} className="font-mono text-caption text-text-muted">
                  {formatDate(feature.date)}
                </time>
                {feature.generated && (
                  <span
                    className="font-mono text-caption"
                    style={{ color: `var(--color-cat-${feature.category})` }}
                  >
                    자동 생성
                    <span className="sr-only">된 요약</span>
                  </span>
                )}
              </div>
              <h3 className="text-h3 leading-snug font-bold text-text transition-colors group-hover:text-accent lg:text-h2">
                {feature.title}
              </h3>
              <p className="text-text-2 leading-relaxed">{feature.summary}</p>
            </Link>

            {rest.length > 0 && (
              <ul className="flex flex-col divide-y divide-border border-y border-border lg:border-y-0 lg:border-t">
                {rest.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/posts/${p.slug}`}
                      className="flex items-baseline justify-between gap-3 py-3 transition-colors hover:bg-bg-subtle hover:no-underline"
                    >
                      <span className="min-w-0 truncate font-medium text-text">{p.title}</span>
                      <time
                        dateTime={p.date}
                        className="shrink-0 font-mono text-[0.6875rem] text-text-muted"
                      >
                        {formatDate(p.date)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="empty-state">아직 글이 없습니다.</div>
        )}
      </Section>
      </Reveal>

      {/* 2. 카테고리 하이라이트 */}
      <Reveal>
      <Section label="BY CATEGORY" title="분류별로 보기">
        <div className="cat-grid">
          {highlights.map(({ category, total, posts }) => (
            <div className="cat-col" key={category}>
              <div className="cat-col__head">
                <Badge variant={category}>
                  {CATEGORY_LABEL[category]}
                  <span className="sr-only">분류: {CATEGORY_LABEL[category]}</span>
                </Badge>
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
      </Reveal>

      {/* 3. 태그 리듬 — 빈도를 괘선 길이로. 05 태그 페이지의 축소판 */}
      {topTags.length > 0 && (
        <Reveal>
        <Section
          label="BY TAG"
          title="요즘 많이 쓰는 태그"
          more={{ href: "/tags", text: "태그 전체 보기" }}
        >
          <TagRhythm tags={topTags} />
        </Section>
        </Reveal>
      )}

      {/* 4. 진행 중 프로젝트 */}
      <Reveal>
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
      </Reveal>

      {/* 5. 요즘 보는 것 — 캐시된 정적 데이터. 방문자가 봐도 API 쿼터를 쓰지 않습니다. */}
      <Reveal>
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
      </Reveal>

      {/* 6. 업계 소식 — Hacker News, 1시간 캐시. 실패하면 섹션째 생략합니다. */}
      {news.length > 0 && (
        <Reveal>
        <Section label="DEV NEWS" title="업계에서 화제인 글">
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
                      <span className="ml-2 font-mono text-[0.6875rem] text-text-muted">
                        {story.domain}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[0.6875rem] text-text-muted">
                    {story.score}pt
                    <span className="sr-only">, 댓글 {story.commentCount}개</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[0.6875rem] text-text-muted">
            <a href="https://news.ycombinator.com/" target="_blank" rel="noreferrer noopener">
              Hacker News
            </a>
            에서 가져옵니다. 1시간마다 갱신.
          </p>
        </Section>
        </Reveal>
      )}
    </div>
  );
}
