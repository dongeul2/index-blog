import type { Heading as MdHeading, Root, RootContent } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

import type { Heading } from "./content-types";

/** 소제목 노드에 붙여 두는 확정된 id — 렌더러와 목차가 같은 값을 씁니다. */
export type WithId = MdHeading & { headingId?: string };

const processor = unified().use(remarkParse).use(remarkGfm);

export function parseMarkdown(source: string): Root {
  return processor.parse(source) as Root;
}

/** 노드 아래의 텍스트만 이어 붙입니다. */
export function toText(node: RootContent | Root): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  if ("children" in node && Array.isArray(node.children)) {
    return node.children.map((c) => toText(c as RootContent)).join("");
  }
  return "";
}

/**
 * GitHub 스타일 슬러그.
 * 한글은 그대로 두고 문장부호만 털어냅니다 — 한글 앵커도 브라우저가 잘 처리합니다.
 */
function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section"
  );
}

/** `## 제목 {#custom-id}` 문법. 없으면 제목 텍스트를 슬러그로 씁니다. */
const EXPLICIT_ID = /\s*\{#([\w-]+)\}\s*$/;

/**
 * 트리를 한 번 훑으면서 h2·h3에 id를 확정하고 목차 항목을 뽑습니다.
 * 명시된 `{#id}` 표기는 본문에 보이면 안 되므로 텍스트에서 제거합니다.
 * 같은 슬러그가 겹치면 `-2`, `-3`을 붙입니다.
 */
export function collectHeadings(tree: Root): Heading[] {
  const out: Heading[] = [];
  const used = new Map<string, number>();

  for (const node of tree.children) {
    if (node.type !== "heading") continue;
    if (node.depth !== 2 && node.depth !== 3) continue;

    const heading = node as WithId;
    const raw = toText(heading);
    const explicit = raw.match(EXPLICIT_ID);
    let text = raw;

    if (explicit) {
      text = raw.replace(EXPLICIT_ID, "");
      // 표기가 들어 있는 마지막 텍스트 노드에서 실제로 걷어냅니다
      const last = heading.children[heading.children.length - 1];
      if (last && last.type === "text") last.value = last.value.replace(EXPLICIT_ID, "");
    }

    let id = explicit ? explicit[1] : slugify(text);
    const seen = used.get(id) ?? 0;
    used.set(id, seen + 1);
    if (seen > 0) id = `${id}-${seen + 1}`;

    heading.headingId = id;
    out.push({ id, text: text.trim(), level: heading.depth as 2 | 3 });
  }

  return out;
}

/**
 * 읽는 시간. 한글 기준 분당 500자로 잡습니다.
 * 코드 블록은 훑고 지나가는 경우가 많아 절반만 셉니다.
 */
export function readingMinutes(tree: Root): number {
  let chars = 0;
  const walk = (nodes: RootContent[]) => {
    for (const n of nodes) {
      if (n.type === "code") chars += n.value.length / 2;
      else if ("value" in n && typeof n.value === "string") chars += n.value.length;
      else if ("children" in n && Array.isArray(n.children)) walk(n.children as RootContent[]);
    }
  };
  walk(tree.children);
  return Math.max(1, Math.round(chars / 500));
}

/* ---------- 코드 펜스 정보 ---------- */

export type CodeInfo = { lang: string; filename: string; highlight: number[] };

/**
 * ```` ```ts:toc.tsx {10,17} ```` 를 해석합니다.
 * 파일명이 없으면 언어 이름을 그대로 헤드에 씁니다.
 */
export function parseCodeInfo(lang: string | null | undefined, meta: string | null | undefined): CodeInfo {
  const [language = "text", filename] = (lang ?? "text").split(":");
  const highlight: number[] = [];

  const found = (meta ?? "").match(/\{([\d,\s-]+)\}/);
  if (found) {
    for (const part of found[1].split(",")) {
      const range = part.trim().split("-").map(Number);
      if (range.length === 2 && Number.isFinite(range[0]) && Number.isFinite(range[1])) {
        for (let i = range[0]; i <= range[1]; i++) highlight.push(i);
      } else if (Number.isFinite(range[0])) {
        highlight.push(range[0]);
      }
    }
  }

  return { lang: language, filename: filename || language, highlight };
}

/* ---------- GitHub 스타일 콜아웃 ---------- */

export type CalloutKind = "info" | "note" | "warn" | "tip";

const ALERT = /^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*/;

const ALERT_KIND: Record<string, CalloutKind> = {
  NOTE: "note",
  TIP: "tip",
  WARNING: "warn",
  CAUTION: "warn",
  IMPORTANT: "info",
};

export type WithCallout = { calloutKind?: CalloutKind };

/**
 * `> [!NOTE]` 로 시작하는 인용구를 콜아웃으로 표시해 둡니다.
 * 표식은 화면에 나오면 안 되므로 텍스트에서 걷어냅니다.
 *
 * 트리를 **한 번만** 고치기 위해 로딩 시점에 돌립니다. 렌더할 때마다 하면, 같은 트리를
 * 캐시해 재사용하므로 두 번째 렌더에서는 이미 표식이 없어 콜아웃 판정이 실패합니다.
 */
function markAlerts(nodes: RootContent[]): void {
  for (const node of nodes) {
    if (node.type === "blockquote") {
      const first = node.children[0];
      const lead = first?.type === "paragraph" ? first.children[0] : undefined;
      const hit = lead?.type === "text" ? lead.value.match(ALERT) : null;

      if (hit && lead?.type === "text" && first?.type === "paragraph") {
        lead.value = lead.value.replace(ALERT, "").replace(/^\n/, "");
        // 표식만 있던 줄이면 빈 텍스트 노드가 남으므로 걷어냅니다
        if (lead.value === "") first.children.shift();
        if (first.children.length === 0) node.children.shift();
        (node as unknown as WithCallout).calloutKind = ALERT_KIND[hit[1]];
      }
    }
    if ("children" in node && Array.isArray(node.children)) {
      markAlerts(node.children as RootContent[]);
    }
  }
}

/**
 * 로딩 시점에 트리를 한 번 정규화합니다 — 소제목 id 확정, 콜아웃 표시.
 * 이후 렌더러는 트리를 읽기만 합니다.
 */
export function prepare(tree: Root): Heading[] {
  const headings = collectHeadings(tree);
  markAlerts(tree.children);
  return headings;
}
