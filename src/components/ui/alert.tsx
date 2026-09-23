import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn Alert — 디자인 시스템의 콜아웃 규칙을 따릅니다.
 * **아이콘을 쓰지 않고 라벨 텍스트로 종류를 밝힙니다.**
 */
const alertVariants = cva(
  "relative w-full rounded-none border-l-2 bg-bg-subtle px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        note: "border-l-border-strong text-text-2",
        info: "border-l-accent text-text-2",
        warn: "border-l-warn text-text-2",
        danger: "border-l-danger text-text-2",
        success: "border-l-success text-text-2",
      },
    },
    defaultVariants: { variant: "note" },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-title"
      className={cn(
        "mb-1 font-mono text-[0.6875rem] tracking-[0.08em] text-current uppercase",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("leading-relaxed text-text-2 [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
