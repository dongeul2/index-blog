"use client";

import Link from "next/link";
import type { Experience, Project, Skill } from "@/lib/project-types";
import { formatPeriod, periodLength } from "@/lib/period";
import { useSkillFilter } from "./skill-filter";
import { ExperienceEditor } from "./edit/experience-editor";

type Entry = { experience: Experience; projects: { project: Project; skills: Skill[] }[] };

/**
 * 경력 — 세로선이 스크롤을 따라 채워지는 타임라인(CSS scroll-driven, `.career__rail`).
 * 역량 필터가 걸리면 그 역량을 쓰지 않은 회사 프로젝트는 흐리게 남깁니다 — 경력 자체는
 * 지우지 않습니다. 어느 회사에서 그 역량을 썼는지가 보여야 하기 때문입니다.
 */
export function Career({ entries }: { entries: Entry[] }) {
  const { skill } = useSkillFilter();

  return (
    <ol className="career">
      <span className="career__rail" aria-hidden="true" />
      {entries.map(({ experience: e, projects }) => {
        const matched = !skill || projects.some((p) => p.skills.some((s) => s.slug === skill));
        return (
          <li key={e.id} className="career__item" data-dim={!matched || undefined}>
            <div className="career__when">
              <span>{formatPeriod(e.periodStart, e.periodEnd, "재직 중")}</span>
              <span className="career__len">{periodLength(e.periodStart, e.periodEnd)}</span>
            </div>
            <div className="career__body">
              <h3 className="career__org">{e.organization}</h3>
              <ExperienceEditor experience={e} />
              <p className="career__title">{e.title}</p>
              {e.summary && <p className="career__summary">{e.summary}</p>}
              {e.highlights.length > 0 && (
                <ul className="career__highlights">
                  {e.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              )}
              {projects.length > 0 && (
                <ul className="career__projects" aria-label="이 회사에서 한 프로젝트">
                  {projects.map(({ project: p, skills }) => (
                    <li
                      key={p.slug}
                      data-dim={(skill && !skills.some((s) => s.slug === skill)) || undefined}
                    >
                      <Link href={`/projects/${p.slug}`}>{p.name}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
