import type { Metadata } from "next";
import { Section } from "@/components/section";
import { ProjectCard } from "@/components/project-card";
import { activeProjects, archivedProjects, getProjects } from "@/lib/projects";
import { postsOfProject } from "@/lib/posts";
import type { Project } from "@/lib/projects";

export const metadata: Metadata = {
  title: "프로젝트",
  description: "하나의 프로젝트 = 하나의 저장소 + 그에 속한 개발 일지들.",
};

function Grid({
  projects,
  devlogs,
  empty,
  archived = false,
}: {
  projects: Project[];
  devlogs: Record<string, number>;
  empty: string;
  archived?: boolean;
}) {
  if (projects.length === 0) return <div className="empty-state">{empty}</div>;
  return (
    <ul className={archived ? "project-grid project-grid--archived" : "project-grid"}>
      {projects.map((project) => (
        <li key={project.slug}>
          <ProjectCard project={project} devlogs={devlogs[project.slug] ?? 0} />
        </li>
      ))}
    </ul>
  );
}

export default async function ProjectsPage() {
  const [all, active, archived] = await Promise.all([
    getProjects(),
    activeProjects(),
    archivedProjects(),
  ]);
  const counts = await Promise.all(
    all.map(async (p) => [p.slug, (await postsOfProject(p.slug)).length] as const),
  );
  const devlogs: Record<string, number> = Object.fromEntries(counts);
  const devlogTotal = counts.reduce((n, [, c]) => n + c, 0);

  return (
    <div className="page projects">
      <header className="projects-head">
        <h1 className="projects-head__title">프로젝트</h1>
        <p className="projects-head__sub">
          저장소 하나마다 프로젝트 하나를 두고, 그 저장소에서 나온 개발 일지를 함께 묶어 둡니다.
        </p>
        <p className="projects-head__count">
          진행 중 {active.length}개, 보관 {archived.length}개. 일지는 모두 {devlogTotal}편입니다.
        </p>
      </header>

      <Section title="진행 중">
        <Grid projects={active} devlogs={devlogs} empty="진행 중인 프로젝트가 없습니다." />
      </Section>

      <Section title="보관됨">
        <Grid projects={archived} devlogs={devlogs} empty="보관된 프로젝트가 없습니다." archived />
      </Section>
    </div>
  );
}
