"use client";

import { useId, useState } from "react";

/**
 * 「더 보기」 — 태그·검색 결과에서 씁니다.
 * 무한 스크롤을 쓰지 않는 이유는 푸터 접근성입니다(디자인 시스템 규칙).
 * 아카이브는 페이지네이션이라 이 컴포넌트를 쓰지 않습니다.
 *
 * 목록을 직접 그립니다 — 서버 컴포넌트에서 클라이언트 컴포넌트로 함수(render prop)를
 * 넘길 수 없으므로, 바깥에서는 이미 렌더된 `<li>` 노드 배열만 건네받습니다.
 */
export function LoadMore({
  items,
  step,
  label,
  listClassName,
}: {
  /** 이미 렌더된 `<li>` 노드들 */
  items: React.ReactNode[];
  /** 처음에 보여줄 개수이자, 한 번 누를 때 늘어나는 개수 */
  step: number;
  /** "글" 처럼 세는 단위 */
  label: string;
  listClassName?: string;
}) {
  const [shown, setShown] = useState(step);
  const statusId = useId();
  const visible = items.slice(0, shown);
  const rest = items.length - visible.length;

  return (
    <>
      <ul className={listClassName}>{visible}</ul>

      {/* 늘어난 개수를 소리로도 알립니다 */}
      <p className="sr-only" id={statusId} role="status" aria-live="polite">
        {label} {visible.length}건 표시 중, 전체 {items.length}건
      </p>

      {rest > 0 && (
        <p className="load-more">
          <button
            type="button"
            className="load-more__btn"
            aria-describedby={statusId}
            onClick={() => setShown((n) => n + step)}
          >
            {label} {Math.min(step, rest)}건 더 보기
            <span className="load-more__rest">남은 {rest}건</span>
          </button>
        </p>
      )}
    </>
  );
}
