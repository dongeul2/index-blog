import type { Metadata } from "next";
import Link from "next/link";
import { REPO_LINK_BADGE, REPO_LINK_LABEL, getProjects } from "@/lib/projects";
import { postsOfProject } from "@/lib/posts";

export const metadata: Metadata = {
  title: "프로젝트",
  robots: { index: false, follow: false },
};

export default async function AdminProjectsPage() {
  const projects = await getProjects();
  const devlogs = Object.fromEntries(
    await Promise.all(
      projects.map(async (p) => [p.slug, (await postsOfProject(p.slug)).length] as const),
    ),
  ) as Record<string, number>;

  return (
    <div className="page admin-page">
      <header className="admin-head">
        <div className="admin-head__row">
          <div>
            <p className="admin-head__label">ADMIN</p>
            <h1 className="admin-head__title">프로젝트</h1>
          </div>
          <Link href="/admin/projects/new" className="admin-head__primary">
            새 프로젝트
          </Link>
        </div>
        <p className="admin-head__who">
          {projects.length}개 · 저장소 연결{" "}
          {projects.filter((p) => p.linkState !== "unlinked").length}개
        </p>
      </header>

      {projects.length > 0 ? (
        <ul className="queue-list">
          {projects.map((p) => (
            <li className="queue-row" key={p.slug}>
              <span className="queue-row__badges">
                <span className={REPO_LINK_BADGE[p.linkState]}>
                  {REPO_LINK_LABEL[p.linkState]}
                  <span className="sr-only">저장소 연결 상태</span>
                </span>
                {p.status === "archived" && <span className="badge badge--draft">보관됨</span>}
              </span>

              <div className="queue-row__body">
                <Link href={`/admin/projects/${p.slug}`} className="queue-row__title">
                  {p.name}
                </Link>
                <p className="queue-row__meta">
                  {p.repo ?? "저장소 미연결"}
                  <span aria-hidden="true"> · </span>
                  일지 {devlogs[p.slug] ?? 0}편
                </p>
              </div>

              <p className="queue-row__updated">
                {p.syncedAt ? (
                  <time dateTime={p.syncedAt}>
                    {new Intl.DateTimeFormat("ko-KR", {
                      timeZone: "Asia/Seoul",
                      dateStyle: "medium",
                    }).format(new Date(p.syncedAt))}
                  </time>
                ) : (
                  "—"
                )}
                <span className="queue-row__updated-label">마지막 동기화</span>
              </p>

              <Link href={`/projects/${p.slug}`} className="queue-row__view">
                보기 <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state admin-empty">
          <p>아직 프로젝트가 없습니다.</p>
          <p className="admin-empty__action">
            <Link href="/admin/projects/new" className="admin-head__primary">
              첫 프로젝트 만들기
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
