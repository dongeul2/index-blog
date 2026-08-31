import Link from "next/link";

/**
 * 홈·프로젝트 상세의 섹션 머리 — 몹시 큰 표제는 아니되, 괘선과 mono 라벨로 구간을 대담하게 끊습니다.
 * `<section>`에 접근 가능한 이름을 주면 region 랜드마크가 늘어나므로 이름은 붙이지 않고
 * 안쪽 h2가 구조를 담당하게 합니다.
 */
export function Section({
  label,
  title,
  more,
  children,
}: {
  label: string;
  title: string;
  more?: { href: string; text: string };
  children: React.ReactNode;
}) {
  return (
    <section className="section">
      <div className="section__head">
        <p className="section__label">{label}</p>
        <h2 className="section__title">{title}</h2>
        {more &&
          (more.href.startsWith("http") ? (
            <a
              href={more.href}
              className="section__more"
              rel="noreferrer noopener"
              target="_blank"
            >
              {more.text} <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <Link href={more.href} className="section__more">
              {more.text} <span aria-hidden="true">→</span>
            </Link>
          ))}
      </div>
      {children}
    </section>
  );
}
