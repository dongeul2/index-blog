import Link from "next/link";

/**
 * 홈·프로젝트 상세의 섹션 머리 — 한국어 표제 하나와, 있으면 오른쪽에 「더 보기」 링크.
 * `<section>`에 접근 가능한 이름을 주면 region 랜드마크가 늘어나므로 이름은 붙이지 않고
 * 안쪽 h2가 구조를 담당하게 합니다.
 */
export function Section({
  title,
  more,
  children,
}: {
  title: string;
  more?: { href: string; text: string };
  children: React.ReactNode;
}) {
  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">{title}</h2>
        {more &&
          (more.href.startsWith("http") ? (
            <a
              href={more.href}
              className="section__more"
              rel="noreferrer noopener"
              target="_blank"
            >
              {more.text}
              <span className="sr-only"> (새 창)</span>
            </a>
          ) : (
            <Link href={more.href} className="section__more">
              {more.text}
            </Link>
          ))}
      </div>
      {children}
    </section>
  );
}
