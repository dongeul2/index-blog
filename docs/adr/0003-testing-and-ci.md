# 0003. 테스트 층과 CI 관문

- 상태: 채택
- 날짜: 2026-10-12

## 맥락

`main`에 직접 커밋해 왔고 자동 검증이 없었습니다. 화면 재편을 앞두고 있어, 바뀌면 안 되는
것(404가 진짜 404, 테마 유지, 접근성)을 먼저 고정해야 합니다.

## 결정

- 단위: **Vitest** — 기본 환경 node, DOM이 필요한 파일만 jsdom(실행 54초 → 3초).
  경로 별칭은 플러그인 대신 Vite 내장 `resolve.tsconfigPaths`.
- E2E: **Playwright** — CI에서는 `next build` 결과를 `next start`로 띄워 데스크톱·모바일 두 뷰포트.
- 접근성: **axe** — WCAG 2 A/AA의 critical·serious를 실패로 봅니다. 도입하자마자 홈의
  색으로만 구분되는 링크(`link-in-text-block`)를 잡아 고쳤습니다.
- 관문: `main` 보호 + 두 CI 잡 필수 + PR 제목 Conventional Commits 검사 + 스쿼시 병합.
- 릴리스: release-please가 PR 제목으로 SemVer와 CHANGELOG를 결정합니다.

## 대안

- Jest — Next 문서도 다루지만 ESM·TS 설정이 더 무겁습니다.
- Cypress — 다중 브라우저·병렬 실행에서 Playwright가 가볍습니다.
- semantic-release — 병합 즉시 배포됩니다. release-please는 릴리스 PR로 한 번 더 확인할 틈을 줍니다.

## 결과

- 좋은 점: 모든 변경이 이슈 → PR → CI → 릴리스 기록을 남깁니다 — 포트폴리오의 근거가 됩니다.
- 감수하는 점: async 서버 컴포넌트는 단위 테스트가 안 되어 E2E가 무겁습니다. E2E에는 공개 Supabase
  URL·키가 필요합니다(저장소 변수로 둠, 서비스 롤 키는 CI에 두지 않음).
