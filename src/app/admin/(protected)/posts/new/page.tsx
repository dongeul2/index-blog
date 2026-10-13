import type { Metadata } from "next";
import { PostEditor, type EditorPost } from "../post-editor";
import { isCategory, isSource, type Category, type Source } from "@/lib/content-types";

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
  doc: null,
  publishedAt: null,
};

/**
 * 12 영상 브라우즈의 「초안 만들기」가 여기로 보냅니다.
 *
 * 값은 주소에만 있습니다 — 저장되지 않은 초안을 서버에 미리 만들지 않으므로,
 * 화면을 닫으면 아무것도 남지 않습니다.
 */
type Search = {
  source?: string;
  ref?: string;
  channel?: string;
  project?: string;
  title?: string;
  category?: string;
};

export default async function NewPostPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;

  const source: Source = sp.source && isSource(sp.source) ? sp.source : EMPTY.source;
  // 출처가 영상 요약이면 분류도 영상으로 맞춥니다 — 둘이 어긋난 글이 만들어지지 않게.
  const category: Category =
    sp.category && isCategory(sp.category)
      ? sp.category
      : source === "youtube-summary"
        ? "video"
        : EMPTY.category;

  const post: EditorPost = {
    ...EMPTY,
    source,
    category,
    title: sp.title?.slice(0, 200) ?? "",
    sourceRef: sp.ref ?? "",
    channel: sp.channel ?? "",
    project: sp.project ?? "",
  };

  return (
    <div className="page admin-page">
      <PostEditor post={post} />
    </div>
  );
}
