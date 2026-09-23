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
  getReadme,
} from "@/lib/projects";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

  const [devlogs, commits, pulls, readme] = await Promise.all([
    postsOfProject(project.slug),
    getCommits(project.slug),
    getPulls(project.slug),
    getReadme(project.slug),
  ]);

  // README는 GitHub에서 받아 온 마크다운 원문입니다. 본문과 같은 파이프라인으로 그립니다.
  const readmeTree = readme ? parseMarkdown(readme) : null;
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

        {/* 관리자가 URL을 적어 넣은 프로젝트만 — 없으면 지금과 같이 이미지 없이 보입니다.
            .media-frame은 hover로 밝아지는 카드용이라(이 히어로는 링크가 아니라 항상 어둡게
            남음), 여기서도 영상 임베드와 같은 이유로 처음부터 정상 밝기로 둡니다. */}
        {project.imageUrl && (
          <div className="relative mt-4 aspect-[21/9] w-full overflow-hidden border border-border bg-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.imageUrl} alt="" className="size-full object-cover" />
          </div>
        )}

        <div className="project-head__title-row">
          <h1 className="project-head__name">{project.name}</h1>
          <Badge variant={REPO_LINK_BADGE[project.linkState]}>
            {REPO_LINK_LABEL[project.linkState]}
            <span className="sr-only">저장소 연결 상태: {REPO_LINK_LABEL[project.linkState]}</span>
          </Badge>
          {project.status === "archived" && <Badge variant="draft">보관됨</Badge>}
        </div>

        <p className="project-head__desc">{project.description}</p>

        <dl className="repo-facts">
          {project.siteUrl && (
            <div>
              <dt>사이트</dt>
              <dd>
                <a
                  href={project.siteUrl}
                  rel="noreferrer noopener"
                  target="_blank"
                  className="repo-facts__repo"
                >
                  바로가기 <span aria-hidden="true">↗</span>
                </a>
              </dd>
            </div>
          )}
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
          <Alert variant="note" className="project-head__alert">
            <AlertTitle>메모</AlertTitle>
            <AlertDescription>
              저장소가 아직 연결되지 않았습니다. 관리자 화면에서 연결하면 README·커밋·Pull
              Request를 가져옵니다.
            </AlertDescription>
          </Alert>
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
