import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Section } from "@/components/section";
import { CATEGORY_LABEL, formatDate, postsOfProject } from "@/lib/posts";
import { parseMarkdown, prepare } from "@/lib/markdown";
import {
  PR_STATE_LABEL,
  REPO_LINK_BADGE,
  REPO_LINK_LABEL,
  getCommits,
  getProject,
  getPulls,
} from "@/lib/projects";
import { relativeTime } from "@/lib/time";

type Params = { slug: string };

/*
 * generateStaticParams를 두지 않습니다.
 * 커밋·PR을 상대 시각("3일 전")으로 보여주는데, 정적 생성하면 그 값이 빌드 시각에 얼어붙습니다.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const project = await getProject((await params).slug);
  if (!project) return {};
  return { title: project.name, description: project.description };
}

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const [devlogs, commits, pulls] = await Promise.all([
    postsOfProject(project.slug),
    getCommits(project.slug),
    getPulls(project.slug),
  ]);

  // README는 GitHub에서 받아 온 마크다운 원문입니다. 본문과 같은 파이프라인으로 그립니다.
  const readmeTree = project.readme ? parseMarkdown(project.readme) : null;
  if (readmeTree) prepare(readmeTree);

  // 상대 시각은 요청 시점을 기준으로 계산합니다(빌드 시각에 얼어붙지 않도록).
  const now = new Date();
  const repoUrl = project.repo ? `https://github.com/${project.repo}` : null;

  return (
    <div className="page project">
      <header className="project-head">
        <p className="project-head__back">
          <Link href="/projects">← 프로젝트 목록</Link>
        </p>

        <div className="project-head__title-row">
          <h1 className="project-head__name">{project.name}</h1>
          <span className={REPO_LINK_BADGE[project.linkState]}>
            {REPO_LINK_LABEL[project.linkState]}
            <span className="sr-only">저장소 연결 상태: {REPO_LINK_LABEL[project.linkState]}</span>
          </span>
          {project.status === "archived" && <span className="badge badge--draft">보관됨</span>}
        </div>

        <p className="project-head__desc">{project.description}</p>

        <dl className="repo-facts">
          <div>
            <dt>저장소</dt>
            <dd>
              {repoUrl ? (
                <a
                  href={repoUrl}
                  rel="noreferrer noopener"
                  target="_blank"
                  className="repo-facts__repo"
                >
                  {project.repo}
                </a>
              ) : (
                <span className="repo-facts__none">아직 연결 안 됨</span>
              )}
            </dd>
          </div>
          <div>
            <dt>브랜치</dt>
            <dd>{project.branch ?? "—"}</dd>
          </div>
          <div>
            <dt>언어</dt>
            <dd>{project.language ?? "—"}</dd>
          </div>
          <div>
            <dt>최근 활동</dt>
            <dd>
              {project.lastActivity ? (
                <time dateTime={project.lastActivity}>
                  {formatDate(project.lastActivity.slice(0, 10))}
                </time>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt>개발 일지</dt>
            <dd>{devlogs.length}편</dd>
          </div>
        </dl>

        {project.linkState === "unlinked" && (
          <div className="callout callout--note project-head__alert">
            <strong className="callout__label">메모</strong>
            <p>
              저장소가 아직 연결되지 않았습니다. 관리자 화면에서 연결하면 README·커밋·Pull
              Request를 가져옵니다.
            </p>
          </div>
        )}
      </header>

      <Section label="README" title="README">
        {readmeTree ? (
          <div className="readme">
            <Markdown tree={readmeTree} />
          </div>
        ) : (
          <div className="empty-state">
            {project.repo
              ? "아직 README를 가져오지 않았습니다."
              : "저장소를 연결하면 README가 여기에 표시됩니다."}
          </div>
        )}
      </Section>

      <Section
        label="COMMITS"
        title="최근 커밋"
        more={repoUrl ? { href: `${repoUrl}/commits`, text: "GitHub에서 보기" } : undefined}
      >
        {commits.length > 0 ? (
          <ol className="repo-list">
            {commits.map((c) => (
              <li className="repo-item" key={c.sha}>
                <code className="repo-item__hash" aria-hidden="true">
                  {c.sha.slice(0, 7)}
                </code>
                <span className="sr-only">커밋 {c.sha.slice(0, 7)}</span>
                <span className="repo-item__msg">{c.message}</span>
                <time className="repo-item__time" dateTime={c.at}>
                  {relativeTime(c.at, now)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state">아직 가져온 커밋이 없습니다.</div>
        )}
      </Section>

      <Section label="PULL REQUESTS" title="Pull Request">
        {pulls.length > 0 ? (
          <ol className="repo-list">
            {pulls.map((pr) => (
              <li className="repo-item" key={pr.number}>
                <span className={`repo-item__state pr-state--${pr.state}`}>
                  {PR_STATE_LABEL[pr.state]}
                </span>
                <span className="repo-item__msg">
                  <span className="repo-item__num">#{pr.number}</span> {pr.title}
                </span>
                <time className="repo-item__time" dateTime={pr.at}>
                  {relativeTime(pr.at, now)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state">아직 가져온 Pull Request가 없습니다.</div>
        )}
      </Section>

      <Section label="DEVLOG" title="개발 일지">
        {devlogs.length > 0 ? (
          <ol className="timeline">
            {devlogs.map((p) => (
              <li className="timeline__row" key={p.slug}>
                <time className="timeline__date" dateTime={p.date}>
                  {formatDate(p.date)}
                </time>
                <div className="timeline__body">
                  <Link href={`/posts/${p.slug}`} className="timeline__title">
                    {p.title}
                  </Link>
                  <p className="timeline__summary">{p.summary}</p>
                  <p className="timeline__meta">
                    {CATEGORY_LABEL[p.category]}
                    <span aria-hidden="true"> / </span>
                    읽는 시간 <time dateTime={`PT${p.readingMinutes}M`}>{p.readingMinutes}분</time>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state">이 프로젝트에 묶인 개발 일지가 아직 없습니다.</div>
        )}
      </Section>
    </div>
  );
}
