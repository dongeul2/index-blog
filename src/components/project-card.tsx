import Link from "next/link";
import { REPO_LINK_BADGE, REPO_LINK_LABEL, type Project } from "@/lib/project-types";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/content-types";

/**
 * 프로젝트 카드.
 *
 * 카드 전체가 링크 하나(`/projects/[slug]`)입니다. 사이트 링크(라이브 데모)는 외부
 * 주소라 그 안에 중첩할 수 없어서, 카드를 감싸는 바깥 래퍼에 별도 오버레이 칩으로
 * 둡니다 — 링크 중첩 없이 두 목적지를 나란히 둘 수 있는 유일한 방법입니다.
 *
 * 커버 이미지는 있을 때만 그립니다. 없으면 이 시스템의 원래 모습(이미지 없이) 그대로
 * 입니다 — 관리자가 URL을 적어 넣은 프로젝트만 예외로 보입니다.
 */
export function ProjectCard({ project, devlogs }: { project: Project; devlogs: number }) {
  return (
    <div className="relative h-full">
      <Link href={`/projects/${project.slug}`} className="project-card">
        {project.imageUrl && (
          <div className="project-card__cover media-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.imageUrl} alt="" loading="lazy" />
          </div>
        )}

        <div className="project-card__top">
          <h3 className="project-card__name">{project.name}</h3>
          <Badge variant={REPO_LINK_BADGE[project.linkState]}>
            {REPO_LINK_LABEL[project.linkState]}
            <span className="sr-only">저장소 연결 상태: {REPO_LINK_LABEL[project.linkState]}</span>
          </Badge>
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

      {project.siteUrl && (
        <a
          href={project.siteUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="absolute top-3 right-3 z-10 border border-border-strong bg-elevated px-2 py-1 text-caption tabular-nums text-text-2 shadow-elevated transition-colors hover:border-accent hover:text-accent hover:no-underline"
        >
          사이트 <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  );
}
