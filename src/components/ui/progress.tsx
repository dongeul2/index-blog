"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * shadcn Progress — 쿼터 소진 막대에 씁니다.
 *
 * **색만으로 전하지 않습니다.** 막대 옆에는 언제나 숫자 텍스트가 함께 있어야 합니다.
 * `tone`은 여유 단계(ok / warn / empty)를 그대로 받습니다.
 */
function Progress({
  className,
  value,
  tone = "ok",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { tone?: "ok" | "warn" | "empty" }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-tone={tone}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-none bg-surface", className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 transition-transform",
          tone === "ok" && "bg-accent",
          tone === "warn" && "bg-warn",
          tone === "empty" && "bg-danger",
        )}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
