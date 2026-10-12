# 로드맵 — 포트폴리오 재편

[ADR 0004](adr/0004-portfolio-restructure.md)의 실행 계획입니다. 이 파일이 GitHub 마일스톤·이슈의
원본입니다 — `node scripts/github-bootstrap.mjs`가 `## ` 제목을 마일스톤으로, `- [ ]` 줄을 이슈로
만듭니다(이미 있는 제목은 건너뜀). 줄 끝의 `` `라벨` ``이 이슈 라벨이 됩니다.

## M0 · 프로세스 기반

모든 이후 작업이 이슈 → PR → CI → 릴리스 기록을 남기도록 먼저 관문을 세웁니다.

- [x] CI: lint · typecheck · Vitest · build · Playwright E2E `type:chore` `area:infra`
- [x] PR·이슈 템플릿, 라벨 체계, PR 제목 Conventional Commits 검사 `type:chore` `area:infra`
- [x] release-please로 SemVer 태그·CHANGELOG 자동화 `type:chore` `area:infra`
- [x] 작업 방식(CONTRIBUTING)과 ADR 0001–0004 `type:docs` `area:planning`
- [x] main 브랜치 보호, 저장소 변수(Supabase 공개 URL·키) 설정 `type:chore` `area:infra`
- [ ] Vercel PR 미리보기 배포 연결 `type:chore` `area:infra`

## M1 · 정리와 데이터 구조

- [ ] 기존 글 삭제(DB·content/posts, RLS 검증 행 유지) `type:chore` `area:backend`
- [ ] 요구사항(PRD)·IA·와이어프레임 문서 `type:docs` `area:planning`
- [ ] projects 확장: kind · role · period · team_size · stack · metrics · decisions · confidential · featured `type:feature` `area:backend`
- [ ] experiences(경력) · skills(역량) 테이블과 RLS, RLS 검증을 테스트로 승격 `type:feature` `area:backend` `area:qa`
- [ ] 태그를 역량 축으로 승격(프로젝트·글·데모 공통) `type:feature` `area:backend`

## M2 · 사이트 뼈대

- [ ] 새 내비게이션과 라우트: /about /work /projects /process /lab /notes `type:feature` `area:frontend`
- [ ] 케이스 스터디 템플릿(기획·설계·구현·QA·운영·회고 탭) `type:feature` `area:frontend`
- [ ] /about: 소개 · 경력 타임라인 · 역량 지도 `type:feature` `area:frontend`
- [ ] /process: 일하는 방식 · 브랜치 전략 · 테스트 전략 · AI 하네스 `type:feature` `area:frontend`
- [ ] 관리자: 프로젝트·경력·역량 편집 화면 `type:feature` `area:frontend`

## M3 · 모션 시스템

- [ ] 모션 토큰과 prefers-reduced-motion 정책 `type:feature` `area:design`
- [ ] 히어로: 도면 그리드 위 선 그리기 · 포인터 반응 `type:feature` `area:design`
- [ ] 스크롤 연출(CSS scroll-driven) · 수치 카운트업 · 타임라인 채움 `type:feature` `area:design`
- [ ] 카드 → 상세 View Transitions `type:feature` `area:design`
- [ ] 스크롤 단계별 아키텍처 다이어그램 컴포넌트 `type:feature` `area:design`
- [ ] 시각 회귀 테스트(Playwright 스크린샷) `type:test` `area:qa`

## M4 · 라이브 기능과 지표

- [ ] Realtime Presence: 지금 보는 사람 · 실시간 리액션 `type:feature` `area:realtime`
- [ ] "나에 대해 묻기" AI 에이전트(근거 링크 · 사용량 공개) `type:feature` `area:ai`
- [ ] /changelog: 릴리스·PR 타임라인(GitHub 캐시 확장) `type:feature` `area:frontend`
- [ ] /quality: 테스트 통과율 · 커버리지 · Lighthouse 추이 `type:feature` `area:qa`
- [ ] /status: 배포 · 상태 · 에러율(Sentry) `type:feature` `area:infra`
- [ ] Lighthouse CI 예산 `type:test` `area:qa`

## M5 · 마감과 v1.0.0

- [ ] /resume: 인쇄·PDF 한 장 `type:feature` `area:frontend`
- [ ] OG 이미지 · 메타데이터 · sitemap `type:feature` `area:frontend`
- [ ] /how-built: 이 사이트의 제작기(케이스 스터디 1호) `type:docs` `area:ai`
- [ ] 직접 구현한 WebSocket 서버 데모(재연결 · 하트비트 · 백프레셔) `type:feature` `area:realtime`
