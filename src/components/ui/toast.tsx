"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * 토스트 — 하단 좌측, 4초 후 자동 해제, 모바일에서는 관리자 탭바 위.
 *
 * 실행취소가 없는 알림은 `role="status"`, 있는 알림은 `role="alert"`입니다
 * (Radix의 `type`이 그대로 매핑됩니다). 포커스를 빼앗지 않으면서 키보드로 닿아야 하므로
 * 실행취소는 언제나 실제 `<button>`입니다.
 */
const ToastProvider = ToastPrimitive.Provider;

function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed bottom-0 left-0 z-[var(--z-toast)] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2 p-5 outline-none",
        "pb-[calc(1.25rem+var(--spacing-safe-bottom))] max-md:pb-[calc(1.25rem+3.5rem+var(--spacing-safe-bottom))]",
        className,
      )}
      {...props}
    />
  );
}

function Toast({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Root>) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      duration={4000}
      className={cn(
        "flex items-start gap-3 rounded-none border border-border bg-elevated p-3.5 text-sm text-text shadow-elevated",
        "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
        className,
      )}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title data-slot="toast-title" className={cn("font-semibold", className)} {...props} />
  );
}

function ToastDescription({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-caption text-text-2", className)}
      {...props}
    />
  );
}

function ToastAction({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn(
        "ml-auto shrink-0 self-center border border-border-strong px-2.5 py-1 text-xs font-semibold text-text transition-colors hover:border-accent hover:bg-bg-subtle",
        className,
      )}
      {...props}
    />
  );
}

function ToastClose({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      className={cn("shrink-0 self-start text-text-muted transition-colors hover:text-text", className)}
      {...props}
    />
  );
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
};
