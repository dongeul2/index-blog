import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-none border border-border bg-bg px-2.5 py-2 text-sm leading-relaxed text-text transition-colors",
        "placeholder:text-text-muted focus:border-accent focus-visible:outline-offset-[-1px]",
        "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
