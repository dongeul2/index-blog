import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn 규약의 `cn`.
 *
 * 뒤에 오는 클래스가 앞의 같은 축(예: `px-*`)을 이기게 합니다 —
 * 그래서 컴포넌트 기본값을 부르는 쪽에서 `className` 하나로 덮을 수 있습니다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
