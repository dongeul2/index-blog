import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn Badge — 기록실의 `.badge` 계열을 변형으로 옮겼습니다.
 *
 * 상태를 **색만으로 전하지 않습니다**. 색은 변형이 주고, 텍스트는 부르는 쪽이 넣습니다.
 * 점선 보더는 「아직 아닌 것」(초안 · 연결 끊김)에만 씁니다.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-none border border-transparent px-[7px] py-[3px] font-mono text-[0.625rem] tracking-[0.08em]",
  {
    variants: {
      variant: {
        neutral: "border-border text-text-2",
        /* 콘텐츠 분류 */
        devlog: "bg-cat-devlog-bg text-cat-devlog",
        video: "bg-cat-video-bg text-cat-video",
        essay: "bg-cat-essay-bg text-cat-essay",
        /* 글 상태 — 10 대시보드의 네 상태 */
        draft: "border-dashed border-border-strong text-text-2",
        published: "bg-cat-essay-bg text-cat-essay",
        queued: "border-warn text-warn",
        failed: "border-danger text-danger",
        scheduled: "border-warn text-warn",
        /* 저장소 연결 상태 */
        linked: "bg-cat-essay-bg text-cat-essay",
        generated: "bg-accent-bg text-accent",
        unlinked: "border-dashed border-danger text-danger",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
