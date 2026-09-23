"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * shadcn Sheet — 모바일 하단 시트입니다.
 *
 * 영상 화면의 「기록하기」처럼 **재생을 막지 않아야 하는** 시트는 `modal={false}`로 열고
 * `aria-modal="false"`를 넘깁니다(디자인 시스템 §새 컴포넌트 접근성).
 * 하단 여백은 `--spacing-safe-bottom`을 참조합니다 — `env()`를 직접 부르지 않습니다.
 */
function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn("fixed inset-0 z-[var(--z-sheet)] bg-scrim", className)}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "bottom",
  showOverlay = true,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  showOverlay?: boolean;
  showCloseButton?: boolean;
}) {
  return (
    <SheetPrimitive.Portal>
      {showOverlay && <SheetOverlay />}
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-[var(--z-sheet)] flex flex-col gap-4 border-border bg-elevated p-5 text-text shadow-elevated",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto border-t pb-[calc(1.25rem+var(--spacing-safe-bottom))]",
          side === "top" &&
            "inset-x-0 top-0 max-h-[85dvh] overflow-y-auto border-b pt-[calc(1.25rem+var(--spacing-safe-top))]",
          side === "right" && "inset-y-0 right-0 w-[min(24rem,90vw)] overflow-y-auto border-l",
          side === "left" && "inset-y-0 left-0 w-[min(24rem,90vw)] overflow-y-auto border-r",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className="absolute top-3 right-3 inline-flex size-8 items-center justify-center text-text-muted transition-colors hover:text-text">
            <XIcon className="size-4" />
            <span className="sr-only">닫기</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 pr-8", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("flex flex-wrap gap-2", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-h4 font-semibold text-text", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm leading-relaxed text-text-2", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetTitle,
  SheetTrigger,
};
