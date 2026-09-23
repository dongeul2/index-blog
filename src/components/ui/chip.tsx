import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * 태그 칩 — shadcn에는 없지만 이 시스템의 1급 컴포넌트라 같은 규약(cva + asChild)으로 둡니다.
 *
 * 필터 칩은 **거의 언제나 링크**입니다(상태가 URL에만 있어야 화면을 공유할 수 있습니다).
 * 그래서 기본 요소를 `<span>`으로 두고 `asChild`로 `<a>`·`<button>`을 받습니다.
 * 개수가 0인 선택지는 `aria-disabled`가 아니라 아예 링크가 아니어야 합니다 —
 * `pointer-events`로만 막으면 키보드로는 여전히 눌립니다.
 */
const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-none border px-2.5 font-mono text-xs transition-colors max-md:h-8 md:h-7",
  {
    variants: {
      variant: {
        default:
          "border-border text-text-2 hover:border-border-strong hover:bg-surface hover:text-text hover:no-underline",
        active: "border-accent bg-accent-bg text-accent hover:no-underline",
        off: "border-border text-text-2 opacity-45",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Chip({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof chipVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return <Comp data-slot="chip" className={cn(chipVariants({ variant }), className)} {...props} />;
}

/** 칩 안의 개수. 칩의 글자색을 물려받으므로 선택된 칩에서는 액센트가 됩니다. */
function ChipCount({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="chip-count"
      className={cn("text-[0.6875rem] text-current opacity-70", className)}
      {...props}
    />
  );
}

export { Chip, ChipCount, chipVariants };
