import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * shadcn Field — 라벨 · 컨트롤 · 설명(또는 오류)을 한 덩어리로 묶습니다.
 *
 * 오류는 색만으로 전하지 않습니다. `FieldError`는 보더를 빨갛게 하는 것과 **별개로**
 * `aria-live`로 문구를 읽어 줍니다(디자인 시스템 §로그인 폼).
 */
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      /* 브레이크포인트는 토큰이 정한 md(640)가 아니라 768입니다 —
         640에서 4열이면 폼 칸이 너무 좁아집니다. */
      className={cn("grid grid-cols-1 gap-5 min-[48rem]:grid-cols-4", className)}
      {...props}
    />
  );
}

function Field({
  className,
  wide = false,
  ...props
}: React.ComponentProps<"div"> & { wide?: boolean }) {
  return (
    <div
      data-slot="field"
      className={cn("flex min-w-0 flex-col gap-1.5", wide && "min-[48rem]:col-span-2", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={className} {...props} />;
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-[0.6875rem] leading-normal text-text-muted", className)}
      {...props}
    />
  );
}

function FieldError({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-error"
      role="status"
      aria-live="polite"
      className={cn("text-[0.6875rem] leading-normal text-danger", className)}
      {...props}
    />
  );
}

/** 체크박스·스위치처럼 컨트롤이 글자 왼쪽에 서는 줄. */
function FieldRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-row"
      className={cn("flex items-center gap-2.5 text-sm text-text-2", className)}
      {...props}
    />
  );
}

export { Field, FieldGroup, FieldLabel, FieldDescription, FieldError, FieldRow };
