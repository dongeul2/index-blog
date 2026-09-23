"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * shadcn Switch — 디자인 시스템의 다크모드 토글 명세를 그대로 씁니다.
 * 트랙 `--surface` + `--border`, 노브는 켜짐이 액센트, 전환 180ms, 히트 영역 44×44.
 */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-none border border-border bg-surface transition-colors duration-[180ms]",
        "data-[state=checked]:border-border-strong",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-3.5 rounded-none bg-text-muted transition-[transform,background-color] duration-[180ms]",
          "translate-x-[2px] data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
