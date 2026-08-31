import Link from "next/link";
import type { Root, RootContent } from "mdast";

import { CodeBlock } from "./code-block";
import { Callout } from "./callout";
import { parseCodeInfo, type WithCallout, type WithId } from "@/lib/markdown";

/**
 * mdast → React.
 *
 * hast로 한 번 더 변환하지 않고 mdast를 직접 그립니다. 코드 펜스의 `meta`(강조 행)와
 * 소제목에 확정해 둔 id를 그대로 쓸 수 있고, 코드 블록·콜아웃을 이미 있는 컴포넌트로
 * 바로 이어붙일 수 있기 때문입니다.
 *
 * 원시 HTML(`node.type === "html"`)은 렌더하지 않습니다. 본문 일부가 자동 생성되는
 * 구조라 임의 HTML을 통과시키지 않는 편이 안전합니다.
 */
export function Markdown({ tree }: { tree: Root }) {
  return <div className="prose">{render(tree.children)}</div>;
}

function render(nodes: RootContent[]): React.ReactNode {
  return nodes.map((node, i) => <Node key={i} node={node} />);
}

function Node({ node }: { node: RootContent }): React.ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p>{render(node.children)}</p>;

    case "heading": {
      const id = (node as WithId).headingId;
      const kids = render(node.children);
      if (node.depth === 2) return <h2 id={id}>{kids}</h2>;
      if (node.depth === 3) return <h3 id={id}>{kids}</h3>;
      return <h4>{kids}</h4>;
    }

    case "text":
      return node.value;

    case "strong":
      return <strong>{render(node.children)}</strong>;

    case "emphasis":
      return <em>{render(node.children)}</em>;

    case "delete":
      return <del>{render(node.children)}</del>;

    case "inlineCode":
      return <code>{node.value}</code>;

    case "break":
      return <br />;

    case "thematicBreak":
      return <hr />;

    case "code": {
      const { lang, filename, highlight } = parseCodeInfo(node.lang, node.meta);
      return <CodeBlock code={node.value} lang={lang} filename={filename} highlight={highlight} />;
    }

    case "blockquote": {
      // 로딩 시점에 표시해 둔 값을 읽기만 합니다
      const kind = (node as unknown as WithCallout).calloutKind;
      if (kind) return <Callout kind={kind}>{render(node.children)}</Callout>;
      return <blockquote>{render(node.children)}</blockquote>;
    }

    case "list":
      return node.ordered ? (
        <ol start={node.start ?? undefined}>{render(node.children)}</ol>
      ) : (
        <ul>{render(node.children)}</ul>
      );

    case "listItem":
      return <li>{render(node.children)}</li>;

    case "link": {
      const href = node.url;
      // 내부 링크는 Link로 — 클라이언트 전환과 프리페치를 얻습니다
      if (href.startsWith("/")) return <Link href={href}>{render(node.children)}</Link>;
      if (href.startsWith("#")) return <a href={href}>{render(node.children)}</a>;
      return (
        <a href={href} rel="noreferrer noopener" target="_blank">
          {render(node.children)}
        </a>
      );
    }

    case "image":
      // eslint-disable-next-line @next/next/no-img-element -- 본문 이미지는 크기를 미리 알 수 없습니다
      return <img src={node.url} alt={node.alt ?? ""} title={node.title ?? undefined} />;

    case "table": {
      const [head, ...body] = node.children;
      return (
        <div className="prose__table-scroll">
          <table>
            {head && (
              <thead>
                <tr>
                  {head.children.map((cell, i) => (
                    <th key={i}>{render(cell.children)}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>{render(body)}</tbody>
          </table>
        </div>
      );
    }

    case "tableRow":
      return <tr>{render(node.children)}</tr>;

    case "tableCell":
      return <td>{render(node.children)}</td>;

    default:
      return null;
  }
}
