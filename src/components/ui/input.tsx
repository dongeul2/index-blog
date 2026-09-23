import * as React from "react";
import { cn } from "@/lib/utils";

/** shadcn Input — 기존 `.field__input`과 같은 값(높이 40, radius 0, 포커스 시 액센트 보더). */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-none border border-border bg-bg px-2.5 py-1.5 text-sm text-text transition-colors",
        "placeholder:text-text-muted focus:border-accent focus-visible:outline-offset-[-1px]",
        "file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-text",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
