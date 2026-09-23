import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectForm, type FormProject } from "../project-form";
import { getProject } from "@/lib/projects";

export const metadata: Metadata = {
  title: "프로젝트 편집",
  robots: { index: false, follow: false },
};

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const form: FormProject = {
    originalSlug: project.slug,
    slug: project.slug,
    name: project.name,
    description: project.description,
    repo: project.repo ?? "",
    status: project.status,
    repoPublic: project.repoPublic,
    imageUrl: project.imageUrl ?? "",
    siteUrl: project.siteUrl ?? "",
  };

  return (
    <div className="page admin-page">
      <ProjectForm project={form} linkState={project.linkState} syncedAt={project.syncedAt} />
    </div>
  );
}
