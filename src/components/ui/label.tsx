"use client";

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * shadcn Label — 기록실의 라벨은 mono 대문자 캡션입니다(`.field__label`).
 * 아이콘 대신 텍스트 라벨을 쓰는 시스템이라 라벨 자체가 1급 요소입니다.
 */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.08em] text-text-muted select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
