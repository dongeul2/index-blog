"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PROJECT_KIND_LABEL, type Project, type Skill } from "@/lib/project-types";
import { formatPeriod } from "@/lib/period";
import { ProjectCover } from "./project-cover";
import { useSkillFilter } from "./skill-filter";

type Item = { project: Project; skills: Skill[] };

/**
 * 프로젝트 — 대표 프로젝트는 커버가 큰 쇼케이스로, 나머지는 작은 카드로.
 * 역량 필터가 둘 다 거르고, 카드마다 view-transition-name을 줘서 필터가 바뀔 때
 * 남는 카드는 제자리로 미끄러지고 빠지는 카드는 사라집니다.
 * 프로젝트 강조색(--accent)이 커버 프레임과 수치에 번집니다.
 */
export function ProjectList({ items }: { items: Item[] }) {
  const { skill } = useSkillFilter();
  const match = (i: Item) => !skill || i.skills.some((s) => s.slug === skill);

  const featured = items.filter((i) => i.project.featured && match(i));
  const others = items.filter((i) => !i.project.featured && match(i));

  if (featured.length + others.length === 0) {
    return (
      <p className="empty-note">
        {items.length === 0
          ? "아직 등록한 프로젝트가 없습니다."
          : "이 역량을 쓴 프로젝트가 없습니다. 위에서 필터를 풀어 보세요."}
      </p>
    );
  }

  return (
    <>
      {featured.length > 0 && (
        <ol className="showcases">
          {featured.map((item) => (
            <Showcase key={item.project.slug} item={item} active={skill} />
          ))}
        </ol>
      )}

      {others.length > 0 && (
        <>
          {featured.length > 0 && <h3 className="others__title">다른 프로젝트</h3>}
          <ul className="others">
            {others.map(({ project: p, skills }) => (
              <li
                key={p.slug}
                id={`project-${p.slug}`}
                className="mini"
                style={{ viewTransitionName: `work-${p.slug}`, ...accentVar(p.accent) }}
              >
                <Link href={`/projects/${p.slug}`} className="mini__link">
                  <span className="cover cover--mini">
                    <ProjectCover name={p.name} src={p.imageUrl} alt={p.imageAlt} sizes="(min-width: 64rem) 30vw, 90vw" />
                  </span>
                  <span className="mini__meta">{formatPeriod(p.periodStart, p.periodEnd)}</span>
                  <span className="mini__name">{p.name}</span>
                  {p.description && <span className="mini__desc">{p.description}</span>}
                </Link>
                <Stack skills={skills} active={skill} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Showcase({ item: { project: p, skills }, active }: { item: Item; active: string | null }) {
  const gallery = p.gallery.slice(0, 3);
  return (
    <li
      id={`project-${p.slug}`}
      className="showcase"
      style={{ viewTransitionName: `work-${p.slug}`, ...accentVar(p.accent) }}
    >
      <div className="showcase__media">
        {/* 제목 링크와 같은 곳으로 가므로 탭 순서·보조기술에서는 빼 둡니다 */}
        <Link href={`/projects/${p.slug}`} className="frame" tabIndex={-1} aria-hidden="true">
          <span className="cover cover--drift">
            <ProjectCover name={p.name} src={p.imageUrl} alt={p.imageAlt} sizes="(min-width: 64rem) 55vw, 95vw" />
          </span>
        </Link>
        {gallery.length > 0 && (
          <ul className="showcase__gallery" aria-label="화면 더 보기">
            {gallery.map((g) => (
              <li key={g.src} className="cover cover--thumb">
                <ProjectCover name={p.name} src={g.src} alt={g.alt} sizes="12rem" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="showcase__body">
        <p className="showcase__meta">
          <span>{formatPeriod(p.periodStart, p.periodEnd)}</span>
          <span>{PROJECT_KIND_LABEL[p.kind]} 프로젝트</span>
          {p.teamSize && <span>{p.teamSize === 1 ? "1인 개발" : `${p.teamSize}인 팀`}</span>}
          {p.confidential && <span className="showcase__confidential">사내 기밀 · 공개 가능한 범위만</span>}
        </p>

        <h3 className="showcase__name">
          <Link href={`/projects/${p.slug}`}>{p.name}</Link>
        </h3>
        <p className="showcase__overview">{p.overview || p.description}</p>
        {p.role && (
          <p className="showcase__role">
            <span>맡은 일</span> {p.role}
          </p>
        )}

        {p.metrics.length > 0 && (
          <dl className="showcase__metrics">
            {p.metrics.map((m) => (
              <div key={m.label}>
                <dd>{m.value}</dd>
                <dt>{m.label}</dt>
              </div>
            ))}
          </dl>
        )}

        {p.decisions.length > 0 && (
          <ul className="showcase__points">
            {p.decisions.map((d) => (
              <li key={d.title}>{d.title}</li>
            ))}
          </ul>
        )}

        <Stack skills={skills} active={active} />

        <div className="showcase__actions">
          <Link href={`/projects/${p.slug}`} className="btn btn--solid">
            자세히 보기
          </Link>
          {p.siteUrl && (
            <a href={p.siteUrl} rel="noreferrer noopener" target="_blank" className="btn btn--ghost">
              사이트 <ArrowUpRight aria-hidden="true" size={16} />
              <span className="sr-only"> (새 창)</span>
            </a>
          )}
          {p.repo && p.repoPublic && !p.confidential && (
            <a href={`https://github.com/${p.repo}`} rel="noreferrer noopener" target="_blank" className="btn btn--ghost">
              코드 <ArrowUpRight aria-hidden="true" size={16} />
              <span className="sr-only"> (새 창)</span>
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function Stack({ skills, active }: { skills: Skill[]; active: string | null }) {
  if (skills.length === 0) return null;
  return (
    <ul className="stack" aria-label="쓴 기술">
      {skills.map((s) => (
        <li key={s.slug} data-active={s.slug === active || undefined}>
          {s.name}
        </li>
      ))}
    </ul>
  );
}

const accentVar = (accent: string | null) =>
  (accent ? { "--accent": accent } : {}) as React.CSSProperties;
