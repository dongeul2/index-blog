import Link from "next/link";
import { PROFILE } from "@/content/profile";
import { getExperiences, getProjects, getProjectSkills, getSkills } from "@/lib/projects";
import { getPosts } from "@/lib/posts";
import type { Project, Skill } from "@/lib/project-types";
import { Hero } from "@/components/portfolio/hero";
import { TitleBlock } from "@/components/portfolio/title-block";
import { SkillFilterProvider } from "@/components/portfolio/skill-filter";
import { SkillLegend } from "@/components/portfolio/skill-legend";
import { ProjectList } from "@/components/portfolio/project-list";
import { Career } from "@/components/portfolio/career";

/**
 * 홈 = 포트폴리오 한 장. 소개 → 역량 → 코드와 기록 → 프로젝트 → 경력.
 * 상단 메뉴의 항목이 각 섹션의 id로 이동합니다(`site-header.tsx`의 PORTFOLIO_NAV).
 * 데이터는 전부 DB(관리자 화면)에서, 인적 사항만 `content/profile.ts`에서 옵니다.
 */
export default async function PortfolioPage() {
  const [projects, skills, links, experiences, posts] = await Promise.all([
    getProjects(),
    getSkills(),
    getProjectSkills(),
    getExperiences(),
    getPosts(),
  ]);

  const skillBySlug = new Map(skills.map((s) => [s.slug, s]));
  const skillsOf = (slug: string): Skill[] =>
    links
      .filter((l) => l.projectSlug === slug)
      .map((l) => skillBySlug.get(l.skillSlug))
      .filter((s): s is Skill => Boolean(s));

  const byOrder = (a: Project, b: Project) =>
    a.sortOrder - b.sortOrder || (b.periodStart ?? "").localeCompare(a.periodStart ?? "");
  const items = [...projects].sort(byOrder).map((project) => ({ project, skills: skillsOf(project.slug) }));

  // 범례의 숫자 — 그 역량을 쓴 프로젝트 수
  const usage: Record<string, number> = {};
  for (const l of links) usage[l.skillSlug] = (usage[l.skillSlug] ?? 0) + 1;

  const entries = experiences.map((experience) => ({
    experience,
    projects: items.filter((i) => i.project.experienceId === experience.id),
  }));

  return (
    <div className="folio">
      <Hero
        name={PROFILE.name}
        nameLatin={PROFILE.nameLatin}
        role={PROFILE.role}
        intro={PROFILE.intro}
      />

      <SkillFilterProvider known={skills.map((s) => s.slug)}>
        <div className="page">
          <FolioSection id="about" title="소개">
            <TitleBlock profile={PROFILE} />
          </FolioSection>

          <FolioSection id="skills" title="역량">
            <SkillLegend skills={skills} usage={usage} />
          </FolioSection>

          <FolioSection id="archive" title="코드와 기록">
            <ul className="archive-links">
              {PROFILE.github && (
                <li>
                  <a href={`https://github.com/${PROFILE.github}`} rel="noreferrer noopener" target="_blank">
                    <span className="archive-links__name">GitHub</span>
                    <span className="archive-links__desc">
                      코드 저장소. 이 사이트의 이슈·PR·CI 기록도 공개되어 있습니다.
                    </span>
                    <span className="sr-only"> (새 창)</span>
                  </a>
                </li>
              )}
              <li>
                <Link href="/notes">
                  <span className="archive-links__name">기록</span>
                  <span className="archive-links__desc">
                    {posts.length > 0
                      ? `개발하면서 남긴 글 ${posts.length}편.`
                      : "개발하면서 남기는 글. 곧 첫 글을 올립니다."}
                  </span>
                </Link>
              </li>
            </ul>
          </FolioSection>

          <FolioSection id="projects" title="프로젝트">
            <ProjectList items={items} />
          </FolioSection>

          <FolioSection id="career" title="경력">
            {entries.length > 0 ? (
              <Career entries={entries} />
            ) : (
              <p className="empty-note">경력 정보를 정리하고 있습니다.</p>
            )}
          </FolioSection>
        </div>
      </SkillFilterProvider>
    </div>
  );
}

function FolioSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="folio-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="folio-section__title">
        {title}
      </h2>
      {children}
    </section>
  );
}
