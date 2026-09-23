import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Kind = "info" | "note" | "warn" | "tip";

/** 아이콘 없이 라벨 텍스트만 씁니다(디자인 시스템 규칙). */
const LABEL: Record<Kind, string> = {
  info: "참고",
  note: "메모",
  warn: "주의",
  tip: "팁",
};

/** 네 종류를 Alert의 색 변형으로 옮깁니다. 「팁」은 액센트를 쓰지 않습니다 — 액센트는 1개뿐입니다. */
const VARIANT: Record<Kind, "info" | "note" | "warn" | "success"> = {
  info: "info",
  note: "note",
  warn: "warn",
  tip: "success",
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
    /* 랜드마크는 header/nav/main/aside(TOC)/footer 각 1회 규칙이 있으므로 role은 주지 않습니다 */
    <Alert variant={VARIANT[kind]} role={undefined} className="my-6">
      <AlertTitle>{label ?? LABEL[kind]}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
