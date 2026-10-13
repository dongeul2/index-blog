"use client";

import Link from "next/link";
import { useState } from "react";
import { PROJECT_KIND_LABEL, type Project, type Skill } from "@/lib/project-types";
import { formatPeriod } from "@/lib/period";
import { useSkillFilter } from "./skill-filter";

type Item = { project: Project; skills: Skill[] };

/**
 * 프로젝트 — 「주요 프로젝트만」 토글과 역량 필터가 함께 거릅니다.
 * 카드마다 view-transition-name을 줘서, 필터가 바뀔 때 남는 카드는 제자리로 미끄러지고
 * 빠지는 카드는 사라집니다.
 */
export function ProjectList({ items }: { items: Item[] }) {
  const { skill } = useSkillFilter();
  const hasFeatured = items.some((i) => i.project.featured);
  const [featuredOnly, setFeaturedOnly] = useState(hasFeatured);

  const shown = items.filter(
    (i) =>
      (!featuredOnly || i.project.featured) &&
      (!skill || i.skills.some((s) => s.slug === skill)),
  );

  return (
    <>
      {hasFeatured && (
        <label className="switch-row">
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={(e) => setFeaturedOnly(e.target.checked)}
          />
          주요 프로젝트만 보기
        </label>
      )}

      {shown.length === 0 ? (
        <p className="empty-note">
          {items.length === 0
            ? "아직 등록한 프로젝트가 없습니다."
            : "이 조건에 맞는 프로젝트가 없습니다. 필터를 풀어 보세요."}
        </p>
      ) : (
        <ol className="work-list">
          {shown.map(({ project: p, skills }) => (
            <li key={p.slug} className="work" style={{ viewTransitionName: `work-${p.slug}` }}>
              <div className="work__meta">
                <span>{formatPeriod(p.periodStart, p.periodEnd)}</span>
                <span>{PROJECT_KIND_LABEL[p.kind]}</span>
                {p.teamSize && <span>{p.teamSize === 1 ? "1인" : `${p.teamSize}인 팀`}</span>}
                {p.confidential && <span className="work__confidential">사내 기밀 · 공개 가능한 범위만</span>}
              </div>

              <h3 className="work__name">
                <Link href={`/projects/${p.slug}`}>{p.name}</Link>
              </h3>
              {p.description && <p className="work__desc">{p.description}</p>}
              {p.role && <p className="work__role">맡은 일: {p.role}</p>}

              {p.metrics.length > 0 && (
                <dl className="work__metrics">
                  {p.metrics.map((m) => (
                    <div key={m.label}>
                      <dt>{m.label}</dt>
                      <dd>{m.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {p.decisions.length > 0 && (
                <ul className="work__points">
                  {p.decisions.map((d) => (
                    <li key={d.title}>{d.title}</li>
                  ))}
                </ul>
              )}

              {skills.length > 0 && (
                <ul className="work__stack" aria-label="쓴 기술">
                  {skills.map((s) => (
                    <li key={s.slug} data-active={s.slug === skill || undefined}>
                      {s.name}
                    </li>
                  ))}
                </ul>
              )}

              <div className="work__links">
                <Link href={`/projects/${p.slug}`}>자세히 보기</Link>
                {p.siteUrl && (
                  <a href={p.siteUrl} rel="noreferrer noopener" target="_blank">
                    사이트 열기<span className="sr-only"> (새 창)</span>
                  </a>
                )}
                {p.repo && p.repoPublic && !p.confidential && (
                  <a href={`https://github.com/${p.repo}`} rel="noreferrer noopener" target="_blank">
                    코드 보기<span className="sr-only"> (새 창)</span>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
