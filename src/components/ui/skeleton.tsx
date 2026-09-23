import { cn } from "@/lib/utils";

/**
 * 로딩 자리표시자.
 *
 * 디자인 시스템은 생성 중 화면에 스켈레톤을 쓰지 않습니다(캐럿 하나로 충분).
 * 여기서는 **목록을 기다리는 동안**에만 씁니다. `prefers-reduced-motion`에서는
 * globals.css가 애니메이션을 걷어냅니다.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-none bg-surface", className)}
      {...props}
    />
  );
}

export { Skeleton };
