import Link from "next/link";
import { Paperclip } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import {
  richHeadings,
  safeAlign,
  safeHref,
  safeTextStyle,
  type RichDoc,
  type RichMark,
  type RichNode,
} from "@/lib/rich";

/**
 * 에디터 문서(Tiptap JSON) → React. 마크다운 렌더러(`markdown.tsx`)와 같은 `.prose` 모양을 냅니다.
 *
 * HTML 문자열로 바꿔 끼워 넣지 않습니다. 아는 노드·마크만 직접 그리고, 모르는 것은 버립니다.
 * 링크·이미지 주소와 글꼴·크기·색은 `lib/rich.ts`의 허용 목록을 통과한 값만 씁니다.
 */
export function RichContent({ doc }: { doc: RichDoc }) {
  // 소제목 id는 목차(richHeadings)와 같은 순서·규칙으로 매깁니다
  const ids = richHeadings(doc).map((h) => h.id);
  let h = 0;
  const nextId = () => ids[h++];

  return <div className="prose">{children(doc.content, nextId)}</div>;
}

type NextId = () => string | undefined;

function children(nodes: RichNode[] | undefined, nextId: NextId): React.ReactNode {
  return (nodes ?? []).map((n, i) => <Node key={i} node={n} nextId={nextId} />);
}

function Node({ node, nextId }: { node: RichNode; nextId: NextId }): React.ReactNode {
  const a = node.attrs ?? {};
  const align = safeAlign(a.textAlign);
  const alignStyle = align && align !== "left" ? { textAlign: align } : undefined;

  switch (node.type) {
    case "paragraph":
      return <p style={alignStyle}>{children(node.content, nextId)}</p>;

    case "heading": {
      const kids = children(node.content, nextId);
      if (a.level === 2) return <h2 id={nextId()} style={alignStyle}>{kids}</h2>;
      if (a.level === 3) return <h3 id={nextId()} style={alignStyle}>{kids}</h3>;
      return <h4 style={alignStyle}>{kids}</h4>;
    }

    case "text":
      return <Marked text={node.text ?? ""} marks={node.marks ?? []} />;

    case "hardBreak":
      return <br />;

    case "horizontalRule":
      return <hr />;

    case "blockquote":
      return <blockquote>{children(node.content, nextId)}</blockquote>;

    case "bulletList":
      return <ul>{children(node.content, nextId)}</ul>;

    case "orderedList":
      return <ol start={typeof a.start === "number" ? a.start : undefined}>{children(node.content, nextId)}</ol>;

    case "listItem":
      return <li>{children(node.content, nextId)}</li>;

    case "codeBlock": {
      const lang = typeof a.language === "string" && /^[\w+-]{1,20}$/.test(a.language) ? a.language : "text";
      const code = (node.content ?? []).map((t) => t.text ?? "").join("");
      return <CodeBlock code={code} lang={lang} filename={lang} />;
    }

    case "image": {
      const src = safeHref(a.src);
      if (!src) return null;
      return (
        <figure className="prose__figure">
          {/* eslint-disable-next-line @next/next/no-img-element -- 본문 이미지는 크기를 미리 알 수 없습니다 */}
          <img src={src} alt={typeof a.alt === "string" ? a.alt : ""} loading="lazy" />
          {typeof a.title === "string" && a.title && <figcaption>{a.title}</figcaption>}
        </figure>
      );
    }

    case "attachment": {
      const href = safeHref(a.href);
      if (!href) return null;
      const name = typeof a.name === "string" ? a.name : "첨부 파일";
      const size = typeof a.size === "number" ? formatBytes(a.size) : null;
      return (
        <p className="prose__attachment">
          <a href={href} download={name} rel="noreferrer noopener">
            <Paperclip aria-hidden="true" size={16} />
            <span>{name}</span>
            {size && <span className="prose__attachment-size">{size}</span>}
          </a>
        </p>
      );
    }

    case "table":
      return (
        <div className="prose__table-scroll">
          <table>
            <tbody>{children(node.content, nextId)}</tbody>
          </table>
        </div>
      );

    case "tableRow":
      return <tr>{children(node.content, nextId)}</tr>;

    case "tableHeader":
    case "tableCell": {
      const Tag = node.type === "tableHeader" ? "th" : "td";
      const span = (v: unknown) => (typeof v === "number" && v > 1 && v < 20 ? v : undefined);
      return (
        <Tag colSpan={span(a.colspan)} rowSpan={span(a.rowspan)}>
          {children(node.content, nextId)}
        </Tag>
      );
    }

    default:
      // 모르는 노드는 그리지 않지만, 안의 글자는 살립니다
      return node.content ? children(node.content, nextId) : null;
  }
}

/** 마크를 바깥에서 안으로 감쌉니다. 링크는 맨 바깥에 둬야 밑줄·색이 안쪽에 붙습니다 */
function Marked({ text, marks }: { text: string; marks: RichMark[] }) {
  const order = ["link", "textStyle", "bold", "italic", "underline", "strike", "code"];
  const sorted = [...marks].sort((x, y) => order.indexOf(y.type) - order.indexOf(x.type));

  let out: React.ReactNode = text;
  for (const m of sorted) {
    switch (m.type) {
      case "bold":
        out = <strong>{out}</strong>;
        break;
      case "italic":
        out = <em>{out}</em>;
        break;
      case "underline":
        out = <u>{out}</u>;
        break;
      case "strike":
        out = <del>{out}</del>;
        break;
      case "code":
        out = <code>{out}</code>;
        break;
      case "textStyle": {
        const style = safeTextStyle(m.attrs);
        if (Object.keys(style).length > 0) out = <span style={style}>{out}</span>;
        break;
      }
      case "link": {
        const href = safeHref(m.attrs?.href);
        if (!href) break;
        if (href.startsWith("/")) out = <Link href={href}>{out}</Link>;
        else if (href.startsWith("#") || href.startsWith("mailto:")) out = <a href={href}>{out}</a>;
        else
          out = (
            <a href={href} rel="noreferrer noopener" target="_blank">
              {out}
            </a>
          );
        break;
      }
    }
  }
  return <>{out}</>;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
