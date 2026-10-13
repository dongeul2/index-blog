/**
 * 블로그형 에디터 문서(Tiptap JSON) — 타입, 허용 목록, 순수 헬퍼.
 * 서버(렌더·저장)와 클라이언트(에디터)가 같은 목록을 봐야 해서 한 파일에 둡니다.
 *
 * 문서는 사용자가 만든 JSON이므로 그대로 믿지 않습니다. 렌더러는 여기 정의한 노드·마크만
 * 그리고, 글꼴·크기·색은 아래 목록에 있는 값만 스타일로 옮깁니다(CSS 주입 차단).
 */

export type RichMark = { type: string; attrs?: Record<string, unknown> };
export type RichNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  text?: string;
  marks?: RichMark[];
};
export type RichDoc = RichNode & { type: "doc" };

export const EMPTY_DOC: RichDoc = { type: "doc", content: [{ type: "paragraph" }] };

/* ---------- 허용 목록 ---------- */

/**
 * 저장되는 값(value)은 CSS 일반 글꼴 이름이라 에디터 안에서도 그대로 비슷하게 보이고,
 * 공개 화면은 css의 글꼴 묶음으로 바꿔 그립니다.
 */
export const FONTS = [
  { label: "기본 (고딕)", value: "", css: "var(--font-sans)" },
  { label: "명조", value: "serif", css: 'var(--font-serif), "Nanum Myeongjo", "AppleMyungjo", serif' },
  { label: "고정폭 (코드)", value: "monospace", css: "var(--font-mono)" },
] as const;

export const SIZES = ["13px", "15px", "17px", "20px", "24px", "28px", "34px"] as const;
export const DEFAULT_SIZE = "17px";

export const COLORS = [
  { label: "기본", value: "" },
  { label: "회색", value: "#8D95A3" },
  { label: "빨강", value: "#E5484D" },
  { label: "주황", value: "#F76B15" },
  { label: "노랑", value: "#E3A72F" },
  { label: "초록", value: "#46A758" },
  { label: "청록", value: "#12A594" },
  { label: "파랑", value: "#3E63DD" },
  { label: "보라", value: "#8E4EC6" },
] as const;

const FONT_CSS = new Map<string, string>(FONTS.filter((f) => f.value).map((f) => [f.value, f.css]));
const SIZE_SET = new Set<string>(SIZES);
const COLOR_SET = new Set<string>(COLORS.map((c) => c.value.toLowerCase()).filter(Boolean));

/** textStyle 마크의 속성 중 허용된 값만 CSS로 */
export function safeTextStyle(attrs: Record<string, unknown> | undefined): Record<string, string> {
  const style: Record<string, string> = {};
  const family = attrs?.fontFamily;
  const size = attrs?.fontSize;
  const color = attrs?.color;
  if (typeof family === "string" && FONT_CSS.has(family)) style.fontFamily = FONT_CSS.get(family)!;
  if (typeof size === "string" && SIZE_SET.has(size)) style.fontSize = size;
  if (typeof color === "string" && COLOR_SET.has(color.toLowerCase())) style.color = color;
  return style;
}

/** http(s)·mailto·내부 경로만 링크로 */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const h = href.trim();
  if (/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(h)) return h;
  return null;
}

export function safeAlign(v: unknown): "left" | "center" | "right" | "justify" | undefined {
  return v === "center" || v === "right" || v === "justify" || v === "left" ? v : undefined;
}

/* ---------- 문서에서 뽑아내기 ---------- */

/** 문서 → 평문. 블록 사이는 줄바꿈 — 검색·읽는 시간·AI 요약용 */
export function richText(node: RichNode | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const inner = (node.content ?? []).map(richText).join(isBlockContainer(node) ? "\n" : "");
  return inner;
}

const isBlockContainer = (n: RichNode) =>
  ["doc", "blockquote", "bulletList", "orderedList", "listItem", "table", "tableRow"].includes(n.type);

/** 읽는 시간 — 마크다운 쪽과 같은 기준(분당 500자, 최소 1분) */
export function richReadingMinutes(doc: RichDoc | null | undefined): number {
  return Math.max(1, Math.round(richText(doc).replace(/\s+/g, "").length / 500));
}

export type RichHeading = { id: string; text: string; level: 2 | 3 };

/**
 * 소제목(h2·h3)과 그 id. 렌더러와 목차가 같은 id를 쓰도록 순서대로 계산합니다.
 * 같은 제목이 겹치면 `-2`, `-3`을 붙입니다(마크다운 쪽과 같은 규칙).
 */
export function richHeadings(doc: RichDoc | null | undefined): RichHeading[] {
  const out: RichHeading[] = [];
  const used = new Map<string, number>();
  for (const node of doc?.content ?? []) {
    if (node.type !== "heading") continue;
    const level = node.attrs?.level;
    if (level !== 2 && level !== 3) continue;
    const text = richText(node).trim();
    let id = slugifyHeading(text);
    const seen = used.get(id) ?? 0;
    used.set(id, seen + 1);
    if (seen > 0) id = `${id}-${seen + 1}`;
    out.push({ id, text, level });
  }
  return out;
}

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section"
  );
}

/** 저장 전에 모양만 확인 — 최상위가 doc인 객체 */
export function isRichDoc(v: unknown): v is RichDoc {
  return typeof v === "object" && v !== null && (v as RichNode).type === "doc";
}
