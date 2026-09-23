import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn Pagination — 아카이브 전용입니다(태그·검색은 「더 보기」).
 *
 * 랜드마크는 헤더의 주 내비 하나만 남겨야 하므로 `<nav>`가 아니라 `role="group"`인
 * `<div>`로 둡니다. 현재 페이지는 색만이 아니라 `aria-current`로도 말합니다.
 */
function Pagination({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="pagination"
      role="group"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      {...props}
    />
  );
}

const paginationLinkVariants = cva(
  "inline-flex items-center justify-center rounded-none border font-mono text-xs transition-colors",
  {
    variants: {
      variant: {
        page: "size-9 border-border text-text-2 hover:border-border-strong hover:bg-surface hover:text-text hover:no-underline",
        current: "size-9 border-accent bg-accent-bg text-accent",
        step: "h-9 border-border px-3 text-text-2 hover:border-border-strong hover:bg-surface hover:text-text hover:no-underline",
      },
    },
    defaultVariants: { variant: "page" },
  },
);

function PaginationItem({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof paginationLinkVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="pagination-item"
      className={cn(paginationLinkVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Pagination, PaginationItem, paginationLinkVariants };
