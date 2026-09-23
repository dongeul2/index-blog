"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * shadcn Tabs — 「새로 만들기 / 기존 연결」 같은 세그먼트 전환에 씁니다.
 * 선택은 배경이 아니라 **밑줄 2px 액센트**로 표시합니다(헤더 내비와 같은 어휘).
 */
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />
  );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("inline-flex w-fit items-stretch gap-6 border-b border-border", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "-mb-px inline-flex h-11 items-center border-b-2 border-transparent px-1 text-sm font-semibold text-text-muted transition-colors",
        "hover:text-text-2 data-[state=active]:border-accent data-[state=active]:text-text",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content data-slot="tabs-content" className={cn("min-w-0", className)} {...props} />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
