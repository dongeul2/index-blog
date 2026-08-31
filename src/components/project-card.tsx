import Link from "next/link";
import { REPO_LINK_BADGE, REPO_LINK_LABEL, type Project } from "@/lib/project-types";
import { formatDate } from "@/lib/content-types";

export function ProjectCard({ project, devlogs }: { project: Project; devlogs: number }) {
  return (
    <Link href={`/projects/${project.slug}`} className="project-card">
      <div className="project-card__top">
        <h3 className="project-card__name">{project.name}</h3>
        <span className={REPO_LINK_BADGE[project.linkState]}>
          {REPO_LINK_LABEL[project.linkState]}
          <span className="sr-only">저장소 연결 상태: {REPO_LINK_LABEL[project.linkState]}</span>
        </span>
      </div>

      <p className="project-card__desc">{project.description}</p>
      <p className="project-card__repo">{project.repo ?? "저장소 미연결"}</p>

      <p className="project-card__foot">
        {project.lastActivity ? (
          <span>
            최근 활동{" "}
            <time dateTime={project.lastActivity}>
              {formatDate(project.lastActivity.slice(0, 10))}
            </time>
          </span>
        ) : (
          <span>활동 기록 없음</span>
        )}
        <span className="project-card__sep" aria-hidden="true">/</span>
        <span>일지 {devlogs}편</span>
      </p>
    </Link>
  );
}
