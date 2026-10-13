"use client";

import {
  SKILL_CATEGORIES,
  SKILL_CATEGORY_LABEL,
  type Skill,
} from "@/lib/project-types";
import { useSkillFilter } from "./skill-filter";

/**
 * 역량 — 도면의 범례. 분류별 한 줄씩, 누르면 그 역량을 쓴 프로젝트·경력만 남습니다.
 * 버튼이 토글이므로 `aria-pressed`로 상태를 알립니다.
 */
export function SkillLegend({ skills, usage }: { skills: Skill[]; usage: Record<string, number> }) {
  const { skill, select } = useSkillFilter();

  if (skills.length === 0) {
    return <p className="empty-note">아직 등록한 역량이 없습니다.</p>;
  }

  return (
    <div className="legend">
      {SKILL_CATEGORIES.map((category) => {
        const items = skills.filter((s) => s.category === category);
        if (items.length === 0) return null;
        return (
          <div key={category} className="legend__row">
            <h3 className="legend__label">{SKILL_CATEGORY_LABEL[category]}</h3>
            <ul className="legend__items">
              {items.map((s) => (
                <li key={s.slug}>
                  <button
                    type="button"
                    className="legend__chip"
                    aria-pressed={skill === s.slug}
                    title={s.description || undefined}
                    onClick={() => select(skill === s.slug ? null : s.slug)}
                  >
                    {s.name}
                    {usage[s.slug] ? <span className="legend__count">{usage[s.slug]}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <p className="legend__status" aria-live="polite">
        {skill ? (
          <>
            <strong>{skills.find((s) => s.slug === skill)?.name}</strong>을(를) 쓴 프로젝트와 경력만
            보고 있습니다.{" "}
            <button type="button" className="legend__clear" onClick={() => select(null)}>
              전체 보기
            </button>
          </>
        ) : (
          "역량을 누르면 그 역량을 쓴 프로젝트와 경력만 남습니다."
        )}
      </p>
    </div>
  );
}
