# 작업 방식

혼자 만드는 저장소지만 팀 저장소처럼 운영합니다. 기획부터 릴리스까지의 기록이 그대로
포트폴리오의 근거가 되기 때문입니다.

## 흐름

```
이슈(기획) → 브랜치 → PR(리뷰·CI) → 미리보기 배포 → 스쿼시 병합 → release-please PR → 태그·CHANGELOG
```

1. **이슈부터.** 기능은 `기능 제안`, 결함은 `버그` 양식으로 엽니다. 완료 조건은 테스트로
   옮길 수 있는 문장으로 씁니다. 큰 묶음은 마일스톤([docs/ROADMAP.md](docs/ROADMAP.md))에 넣습니다.
2. **브랜치.** `main`에서 짧게 따고 짧게 끝냅니다(GitHub Flow).
   이름은 `<type>/<이슈번호>-<요지>` — 예: `feat/12-work-case-study`.
3. **커밋.** [Conventional Commits](https://www.conventionalcommits.org/ko/) — `feat(scope): …`.
4. **PR.** 템플릿을 채웁니다. 제목이 Conventional Commits가 아니면 `PR title` 검사가 막습니다.
   `main`은 보호 브랜치라 CI(`Lint · Typecheck · Unit`, `Build · E2E`)가 통과해야 병합됩니다.
5. **병합은 스쿼시.** PR 하나 = `main`의 커밋 하나 = CHANGELOG 한 줄.
6. **릴리스.** release-please가 릴리스 PR을 열어 두고, 그것을 병합하면 SemVer 태그와
   GitHub Release가 만들어집니다. `feat` → minor, `fix` → patch (1.0 전에는 `feat`도 minor 한 단계).
   릴리스 PR에서도 CI가 돌도록 release-please는 전용 토큰(`RELEASE_PLEASE_TOKEN` 시크릿 —
   index-blog 한 곳, Contents·Pull requests 쓰기)으로 PR을 엽니다. 만료 전에 교체합니다.

## 테스트 전략

| 층 | 도구 | 맡는 것 |
| --- | --- | --- |
| 단위 | Vitest (`src/**/*.test.ts`) | 순수 함수, 동기 컴포넌트 |
| E2E | Playwright (`e2e/`) | 실제 빌드 위의 화면 흐름 · 404 · 테마 · 데스크톱/모바일 |
| 접근성 | axe (`@axe-core/playwright`) | WCAG 2 A/AA의 critical·serious 위반 0 |
| 권한 | `scripts/check-rls.mjs` | 공개 키로 초안·예약 글이 실제로 막히는지 |

버그를 고칠 때는 **그 버그를 다시 잡는 테스트를 먼저** 씁니다.

```bash
npm run lint && npm run typecheck && npm test   # 커밋 전
npm run test:e2e                                 # 화면을 건드렸으면
```

## 결정 기록

되돌리기 어렵거나 "왜 이렇게 했지?"가 나올 결정은 [docs/adr/](docs/adr/)에 남깁니다.

## AI 하네스

에이전트(Claude Code)는 [AGENTS.md](AGENTS.md)의 규칙을 따르고, 같은 이슈 → PR → CI 흐름을
거칩니다. 사람은 이슈(문제 정의·완료 조건)와 PR 리뷰를 맡고, 에이전트가 쓴 코드도 CI를
통과하기 전에는 병합되지 않습니다. PR 템플릿의 「AI 하네스」 칸에 역할 분담을 적습니다.
