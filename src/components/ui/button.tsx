import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn Button — 외형은 기록실 토큰 그대로입니다.
 *
 * 디자인 시스템이 정한 것: radius 0, 터치 타겟 44px(`h-11`), 액센트는 단 하나,
 * 액센트 배경 위에서는 포커스 링을 반전(`.on-accent`). 그림자·그라디언트 없음.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-none border text-[0.9375rem] font-semibold transition-colors duration-[120ms] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** 1차 행동. 화면에 하나만 둡니다. */
        default:
          "on-accent border-accent bg-accent text-accent-on hover:border-accent-strong hover:bg-accent-strong hover:no-underline",
        /** 2차 행동. 기존 `.editor__secondary`와 같은 값입니다. */
        outline:
          "border-border-strong bg-transparent text-text hover:border-accent hover:bg-bg-subtle hover:no-underline",
        secondary:
          "border-border bg-surface text-text hover:border-border-strong hover:bg-bg-subtle hover:no-underline",
        /** 파괴적 행동은 보더 없이 글자만 — 누르기 전까지 조용합니다. */
        destructive:
          "border-transparent bg-transparent font-normal text-danger hover:border-danger hover:no-underline",
        ghost:
          "border-transparent bg-transparent text-text-2 hover:bg-bg-subtle hover:text-text hover:no-underline",
        link: "border-transparent bg-transparent font-normal text-accent underline-offset-[3px] hover:underline",
      },
      size: {
        /** 44px — 디자인 시스템의 최소 터치 타겟 */
        default: "h-11 px-5",
        sm: "h-10 px-3 text-sm",
        xs: "h-8 px-2.5 text-[0.8125rem] font-medium",
        lg: "h-12 px-6",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
