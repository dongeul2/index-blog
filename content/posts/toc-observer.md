---
title: "IntersectionObserver로 목차 현재 위치 잡기"
date: 2026-08-22
category: devlog
tags: ["react", "접근성", "toc"]
source: manual
project: index-blog
summary: "rootMargin 하나로 '지금 읽는 소제목'의 판정이 완전히 달라집니다. 밴드를 어떻게 잡을지의 문제입니다."
---
글 상세 화면의 목차는 장식이 아니라 위치 표시기입니다. 지금 읽고 있는 소제목이 어디인지 틀리게 표시하면, 없느니만 못합니다. 이 글은 그 판정을 `IntersectionObserver` 하나로 처리하면서 부딪힌 것들을 정리한 기록입니다.

## 스크롤 리스너로는 왜 안 되는가 {#why-scroll-listener-fails}

처음에는 익숙한 방식으로 시작했습니다. `scroll` 이벤트에서 모든 소제목의 `getBoundingClientRect()`를 읽고, 화면 상단을 지난 마지막 항목을 현재 위치로 잡는 방식입니다.

```ts:naive-toc.ts {4}
// 이 방식은 스크롤마다 강제 레이아웃을 유발한다
window.addEventListener("scroll", () => {
  for (const h of headings) {
    const top = h.getBoundingClientRect().top; // reflow
    if (top < 100) setActiveId(h.id);
  }
});
```

동작은 합니다. 문제는 비용입니다. `getBoundingClientRect()`는 브라우저에 강제 레이아웃을 요구하고, 그걸 소제목 개수만큼 스크롤 프레임마다 반복합니다. 소제목이 스무 개쯤 되는 긴 글에서 스크롤이 눈에 띄게 끈적해졌습니다.

더 성가신 건 판정 자체였습니다. "화면 상단을 지났다"는 기준은 sticky 헤더 높이만큼 어긋나고, 소제목 바로 아래 짧은 문단이 붙어 있으면 항목이 두 번 튀는 구간이 생깁니다.

## rootMargin으로 판정 밴드를 만든다 {#root-margin}

`IntersectionObserver`로 바꾸면 두 가지가 한번에 해결됩니다. 레이아웃 읽기가 사라지고, `rootMargin`으로 **판정 밴드**를 선언적으로 정의할 수 있습니다.

> 현재 위치는 "어떤 소제목을 지났는가"가 아니라 "화면의 어느 띠 안에 어떤 소제목이 들어와 있는가"의 문제입니다.

### -96px / -70%라는 숫자 {#band-numbers}

디자인 시스템이 지정한 값은 `rootMargin: "-96px 0px -70%"`입니다. 위쪽 96px은 sticky 헤더와 소제목의 `scroll-margin-top`이 차지하는 만큼을 잘라낸 것이고, 아래쪽 −70%는 뷰포트 하단 70%를 판정에서 제외한다는 뜻입니다.

남는 띠는 화면 상단에서 시작하는 30% 남짓한 구간입니다. 소제목이 이 띠에 들어와야 비로소 "읽고 있다"고 봅니다. 아래쪽을 넉넉히 잘라내지 않으면, 화면 맨 밑에 살짝 걸친 다음 소제목이 현재 위치를 가로채 갑니다.

> [!NOTE]
> 두 값은 함께 움직입니다. 헤더 높이를 바꾸면 96px도 같이 바꿔야 하고, 그러지 않으면 첫 소제목이 영영 활성화되지 않는 구간이 생깁니다.

### 밴드가 비었을 때는 직전 값을 유지한다 {#keep-last}

긴 문단 한가운데에서는 띠 안에 소제목이 하나도 없습니다. 이때 활성 항목을 비우면 목차가 깜빡입니다. 그래서 교차 중인 항목 집합이 비면 아무것도 하지 않고 직전 값을 그대로 둡니다. 목차는 "마지막으로 지나온 구간"을 계속 가리키고 있으면 됩니다.

- 교차 중인 항목이 여럿이면 문서 순서상 가장 위를 고른다
- 비면 갱신하지 않는다
- 목차 링크를 직접 누른 경우엔 즉시 그 항목으로 확정한다

## 구현 {#implementation}

정리하면 상태는 `activeId` 하나면 충분하고, 옵저버 콜백은 집합을 갱신한 뒤 문서 순서 최솟값을 고르는 일만 합니다.

```ts:toc.tsx {10,17}
const visible = new Set<string>();
const order = new Map(headings.map((h, i) => [h.id, i]));

const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) visible.add(e.target.id);
      else visible.delete(e.target.id);
    }
    // 밴드가 비면 갱신하지 않는다 — 직전 항목을 유지한다
    if (visible.size === 0) return;

    let top = "";
    for (const id of visible) {
      if (top === "" || order.get(id) < order.get(top)) top = id;
    }
    setActiveId(top);
  },
  { rootMargin: "-96px 0px -70%", threshold: 0 },
);

nodes.forEach((n) => io.observe(n));
```

`order` 맵을 미리 만들어 두는 이유는, 교차 중인 항목들 사이에서 문서 순서를 비교할 때 DOM을 다시 뒤지지 않기 위해서입니다. 목차 데이터가 이미 순서를 알고 있으므로 그걸 재사용합니다.

참고로 이 블로그는 빌드 시점에 본문을 정적으로 뽑기 때문에, 소제목 목록은 런타임 DOM 조회 없이 데이터로 내려옵니다. CI에서 빌드가 도는 워크플로는 이렇게 단순합니다.

```yaml:build.yml
name: build
on:
  push:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
```

## 접근성: 목차는 랜드마크 하나 {#a11y}

목차는 `<aside>` 하나로 감싸고, 그 안에서 데스크톱용 sticky 목록과 모바일용 접이식 목록을 CSS로만 전환합니다. 둘 다 `<nav>`로 감싸면 화면 하나에 내비게이션 랜드마크가 여러 개 생겨 스크린 리더 사용자가 훑을 때 오히려 방해가 됩니다.

- 현재 항목에는 `aria-current="true"`를 붙인다
- 색만으로 알리지 않도록 좌측 2px 바를 함께 쓴다
- 모바일 접이식은 ESC로 닫고 포커스를 트리거로 되돌린다

> [!TIP]
> `prefers-reduced-motion`에서는 목차 강조 전환도 함께 꺼집니다. 토큰 파일에 전역 규칙이 들어 있어 컴포넌트마다 따로 챙길 필요가 없습니다.

## 정리 {#wrap-up}

코드 자체는 짧습니다. 실제로 시간을 쓴 곳은 `rootMargin` 두 숫자와, 밴드가 비었을 때 무엇을 할지 정하는 판단이었습니다. 목차의 정확도는 관측 방식이 아니라 관측 범위를 어떻게 잡느냐에서 나옵니다.
