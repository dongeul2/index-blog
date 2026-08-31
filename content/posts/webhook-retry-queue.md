---
title: "실패한 게시를 다시 태우는 큐"
date: 2026-07-08
category: devlog
tags: ["자동화", "큐", "에러처리"]
source: manual
project: autopost
summary: "자동 게시가 실패하는 경우는 생각보다 다양합니다. 실패 사유를 상태로 남겨야 재시도가 의미를 가집니다."
---
자동 게시를 붙이고 일주일 만에 알게 된 건, 실패가 예외가 아니라 일상이라는 것이었습니다.

## 실패의 종류 {#failure-kinds}

- 모델 호출이 타임아웃
- 생성된 마크다운의 프론트매터가 깨짐
- 같은 slug의 파일이 이미 있음
- 커밋 푸시가 원격과 충돌
- 쿼터 소진

이걸 전부 `status: "failed"` 하나로 적으면, 대시보드에서 볼 수 있는 건 "몇 건 실패"뿐입니다. 무엇을 고쳐야 하는지는 로그를 뒤져야 알 수 있습니다.

## 사유를 함께 저장한다 {#store-reason}

```ts:queue.ts {6}
type QueueItem = {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  // 실패 사유가 없으면 재시도는 그냥 주사위 굴리기입니다
  reason?: "timeout" | "bad-frontmatter" | "slug-conflict" | "push-conflict" | "quota";
  attempts: number;
  lastTriedAt: string;
};
```

사유가 있으면 재시도 정책을 사유별로 나눌 수 있습니다. 타임아웃과 푸시 충돌은 그냥 다시 태우면 되고, 프론트매터가 깨진 건 다시 태워도 똑같이 깨집니다. 후자는 사람이 봐야 하는 항목으로 분리합니다.

> [!WARNING]
> 무한 재시도는 쿼터를 태웁니다. 시도 횟수를 세고, 사유가 `quota`면 다음 창까지 아예 멈추세요.

## 화면에서는 색만으로 알리지 않는다 {#ui}

대기 → 처리중 → 완료 / 실패 전환은 배지 교체로만 표현하고, 색과 텍스트를 동시에 바꿉니다. `aria-live="polite"`를 걸어 두면 화면을 보고 있지 않아도 상태 변화가 전해집니다. 애니메이션은 넣지 않았습니다 — 상태가 명확하면 움직임이 없어도 읽힙니다.
