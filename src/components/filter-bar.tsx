import Link from "next/link";
import {
  CATEGORY_LABEL,
  archiveHref,
  facets,
  type Category,
  type Filters,
} from "@/lib/posts";

type Row = {
  label: string;
  /** 이 축을 비운(=전체) 링크 */
  allHref: string;
  active: boolean;
  options: { key: string; text: string; count: number; href: string; on: boolean }[];
};

/**
 * 아카이브 필터.
 *
 * 전부 링크입니다 — 상태가 URL에만 있으므로 화면을 그대로 공유할 수 있고,
 * JS 없이도 동작하며, 뒤로 가기가 필터 이력으로 자연스럽게 이어집니다.
 * 이미 켜진 값을 다시 누르면 그 축이 해제됩니다(토글).
 */
export async function FilterBar({ filters }: { filters: Filters }) {
  const f = await facets(filters);

  const rows: Row[] = [
    {
      label: "분류",
      allHref: archiveHref({ ...filters, category: undefined, page: 1 }),
      active: Boolean(filters.category),
      options: f.categories.map((o) => {
        const on = filters.category === o.value;
        return {
          key: o.value,
          text: CATEGORY_LABEL[o.value as Category],
          count: o.count,
          href: archiveHref({
            ...filters,
            category: on ? undefined : (o.value as Category),
            page: 1,
          }),
          on,
        };
      }),
    },
    {
      label: "태그",
      allHref: archiveHref({ ...filters, tag: undefined, page: 1 }),
      active: Boolean(filters.tag),
      options: f.tags.map((o) => {
        const on = filters.tag === o.value;
        return {
          key: o.value,
          text: `#${o.value}`,
          count: o.count,
          href: archiveHref({ ...filters, tag: on ? undefined : o.value, page: 1 }),
          on,
        };
      }),
    },
    {
      label: "연도",
      allHref: archiveHref({ ...filters, year: undefined, page: 1 }),
      active: Boolean(filters.year),
      options: f.years.map((o) => {
        const on = filters.year === o.value;
        return {
          key: o.value,
          text: `${o.value}년`,
          count: o.count,
          href: archiveHref({ ...filters, year: on ? undefined : o.value, page: 1 }),
          on,
        };
      }),
    },
  ];

  return (
    <div className="filters">
      {rows.map((row) => (
        <div className="filters__row" key={row.label}>
          <p className="filters__label">{row.label}</p>
          <div className="filters__chips">
            <Link
              href={row.allHref}
              className="chip"
              aria-current={row.active ? undefined : "page"}
            >
              전체
            </Link>
            {row.options.map((o) =>
              // 결과가 0인 선택지는 눌러도 빈 화면이 될 뿐이라 링크로 만들지 않습니다.
              // (pointer-events로만 막으면 키보드로는 여전히 눌려서 동작이 어긋납니다.)
              o.count === 0 && !o.on ? (
                <span key={o.key} className="chip chip--off" aria-disabled="true">
                  {o.text}
                  <span className="chip__count">{o.count}</span>
                </span>
              ) : (
                <Link
                  key={o.key}
                  href={o.href}
                  className="chip"
                  aria-current={o.on ? "page" : undefined}
                >
                  {o.text}
                  <span className="chip__count">{o.count}</span>
                </Link>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
