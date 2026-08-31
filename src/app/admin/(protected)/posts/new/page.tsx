import type { Metadata } from "next";
import { PostEditor, type EditorPost } from "../post-editor";

export const metadata: Metadata = {
  title: "새 글",
  robots: { index: false, follow: false },
};

const EMPTY: EditorPost = {
  originalSlug: null,
  slug: "",
  title: "",
  category: "devlog",
  status: "draft",
  source: "manual",
  sourceRef: "",
  project: "",
  channel: "",
  summary: "",
  tags: "",
  body: "",
  publishedAt: null,
};

export default function NewPostPage() {
  return (
    <div className="page admin-page">
      <PostEditor post={EMPTY} />
    </div>
  );
}
