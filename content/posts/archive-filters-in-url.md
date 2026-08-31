---
title: "아카이브 필터를 URL에 넣기로 한 이유"
date: 2026-08-27
category: devlog
tags: ["nextjs", "라우팅", "접근성"]
source: manual
project: index-blog
summary: "필터가 컴포넌트 상태에만 있으면 그 화면은 공유할 수 없습니다. 쿼리 문자열이 곧 화면입니다."
---
아카이브에는 축이 셋 있습니다. 분류, 태그, 연도. 처음에는 익숙한 대로 `useState` 세 개를 두고 클릭할 때마다 목록을 다시 거르려 했습니다. 그러다 멈춘 건 핸드오프 문서의 한 줄 때문이었습니다 — "URL 쿼리로 직렬화(공유 가능해야 함)".

## 상태를 어디에 둘 것인가 {#where-state-lives}

컴포넌트 상태에 두면 화면은 잘 돕니다. 대신 세 가지를 잃습니다.

- 지금 보고 있는 화면을 남에게 보낼 수 없습니다. 주소는 언제나 `/archive`입니다.
- 뒤로 가기가 필터 이력이 되지 못합니다. 세 번 좁힌 뒤 한 단계만 되돌릴 방법이 없습니다.
- JS가 아직 안 왔거나 실패한 상태에서는 아무것도 고를 수 없습니다.

세 번째는 사소해 보이지만, 필터가 링크라면 애초에 문제가 되지 않습니다.

## 그래서 전부 링크로 {#links-only}

칩을 버튼이 아니라 `<a>`로 만들면 상태 관리 코드가 통째로 사라집니다. 서버는 쿼리를 읽어 거른 결과를 그리면 되고, 화면이 곧 주소입니다.

```ts:archive-href.ts {5,9}
export function archiveHref(filters: Filters & { page?: number }): string {
  const q = new URLSearchParams();
  if (filters.category) q.set("category", filters.category);
  if (filters.tag) q.set("tag", filters.tag);
  if (filters.year) q.set("year", filters.year);
  // 1페이지는 굳이 붙이지 않습니다 — URL을 짧게 유지합니다
  if (filters.page && filters.page > 1) q.set("page", String(filters.page));
  const s = q.toString();
  return s ? `/archive?${s}` : "/archive";
}
```

값이 없는 축은 아예 빼는 게 중요합니다. `?category=&tag=&year=` 같은 주소는 공유했을 때 지저분하고, 빈 문자열과 미지정을 구분하느라 읽는 쪽 코드도 늘어납니다.

## 켜진 칩을 다시 누르면 {#toggle-off}

각 칩의 `href`는 "이걸 눌렀을 때의 상태"를 미리 계산해 둔 것입니다. 이미 켜진 값이면 그 축을 `undefined`로 만들어 해제 링크가 됩니다. 상태 전이가 링크 하나하나에 박혀 있으니 따로 토글 로직이 필요 없습니다.

> [!TIP]
> 쿼리 문자열은 사용자가 손으로 고칠 수 있습니다. 읽는 쪽에서 값을 신뢰하지 말고 정규화하세요. 없는 분류는 무시하고, 범위를 벗어난 페이지 번호는 마지막 페이지로 보정합니다.

## 개수는 자기 축을 빼고 센다 {#facet-counts}

칩 옆의 숫자를 그냥 전체 기준으로 세면 거짓말이 됩니다. 「개발일지」를 고른 상태에서 `#nextjs 3`이라고 적혀 있는데 눌렀더니 2건이 나오는 식입니다.

각 축의 개수는 **그 축을 뺀 나머지 필터**를 적용한 결과에서 세야 합니다. 그래야 숫자가 "지금 이걸 누르면 몇 개가 남는지"를 정직하게 가리킵니다. 결과가 0인 선택지는 링크로 만들지 않았습니다 — `pointer-events`로만 막으면 키보드로는 여전히 눌리니까요.
