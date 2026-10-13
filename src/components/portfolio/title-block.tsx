import type { Profile } from "@/lib/project-types";

/**
 * 소개 — 도면 오른쪽 아래의 표제란처럼 칸을 나눈 인적 사항.
 * 값이 비어 있는 칸은 그리지 않습니다(빈 칸에 "—"를 채우면 미완성처럼 읽힙니다).
 */
export function TitleBlock({ profile }: { profile: Profile }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "이름", value: profile.name },
    { label: "생년월일", value: profile.birth },
    { label: "위치", value: profile.location },
    { label: "학력", value: profile.education },
    {
      label: "이메일",
      value: profile.email && <a href={`mailto:${profile.email}`}>{profile.email}</a>,
    },
    {
      label: "GitHub",
      value: profile.github && (
        <a href={`https://github.com/${profile.github}`} rel="noreferrer noopener" target="_blank">
          github.com/{profile.github}
          <span className="sr-only"> (새 창)</span>
        </a>
      ),
    },
  ].filter((r) => Boolean(r.value));

  return (
    <dl className="title-block">
      {rows.map((r) => (
        <div key={r.label} className="title-block__cell">
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
