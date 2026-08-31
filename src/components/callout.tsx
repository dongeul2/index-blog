type Kind = "info" | "note" | "warn" | "tip";

/** 아이콘 없이 라벨 텍스트만 씁니다(디자인 시스템 규칙). */
const LABEL: Record<Kind, string> = {
  info: "참고",
  note: "메모",
  warn: "주의",
  tip: "팁",
};

export function Callout({
  kind = "info",
  label,
  children,
}: {
  kind?: Kind;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    /* 랜드마크는 header/nav/main/aside(TOC)/footer 각 1회 규칙이 있으므로 div로 둡니다 */
    <div className={`callout callout--${kind}`}>
      <strong className="callout__label">{label ?? LABEL[kind]}</strong>
      {children}
    </div>
  );
}
