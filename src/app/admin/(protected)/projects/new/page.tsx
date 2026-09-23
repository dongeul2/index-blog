import type { Metadata } from "next";
import { ProjectForm, type FormProject } from "../project-form";

export const metadata: Metadata = {
  title: "새 프로젝트",
  robots: { index: false, follow: false },
};

const EMPTY: FormProject = {
  originalSlug: null,
  slug: "",
  name: "",
  description: "",
  repo: "",
  status: "active",
  repoPublic: false,
  imageUrl: "",
  siteUrl: "",
};

export default function NewProjectPage() {
  return (
    <div className="page admin-page">
      <ProjectForm project={EMPTY} />
    </div>
  );
}
