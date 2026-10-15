# 로드맵 — 제품 서사와 트랙 분리

[ADR 0006](adr/0006-product-narrative-and-tracks.md)의 실행 계획입니다(0004의 계획은 대체됨). 이 파일이
GitHub 마일스톤·이슈의 원본입니다 — `node scripts/github-bootstrap.mjs`가 `## ` 제목을 마일스톤으로,
`- [ ]` 줄을 이슈로 만듭니다(이미 있는 제목은 건너뜀). 줄 끝의 `` `라벨` ``이 이슈 라벨이 됩니다.
기존 이슈를 옮긴 항목은 제목을 그대로 두었습니다(이슈의 마일스톤만 바꿈).

순서는 콘텐츠 → 서사 → 트랙 → 블로그입니다. 구조부터 손대면 빈 껍데기만 정교해집니다.

## M0 · 프로세스 기반

모든 이후 작업이 이슈 → PR → CI → 릴리스 기록을 남기도록 먼저 관문을 세웁니다.

- [x] CI: lint · typecheck · Vitest · build · Playwright E2E `type:chore` `area:infra`
- [x] PR·이슈 템플릿, 라벨 체계, PR 제목 Conventional Commits 검사 `type:chore` `area:infra`
- [x] release-please로 SemVer 태그·CHANGELOG 자동화 `type:chore` `area:infra`
- [x] 작업 방식(CONTRIBUTING)과 ADR 0001–0004 `type:docs` `area:planning`
- [x] main 브랜치 보호, 저장소 변수(Supabase 공개 URL·키) 설정 `type:chore` `area:infra`
- [ ] Vercel PR 미리보기 배포 연결 `type:chore` `area:infra`

## R1 · 콘텐츠

기능보다 먼저입니다. 관리자 화면(홈 편집)으로 직접 입력합니다.

- [ ] 프로필(이름·소개·연락처)과 경력 입력 `type:docs` `area:planning` `priority:high`
- [ ] 실무 프로젝트 케이스 스터디 입력: 문제 → 가설 → 결정 → 결과 `type:docs` `area:planning` `priority:high`
- [ ] 역량마다 그것으로 해결한 문제 한 줄 `type:docs` `area:planning`
- [ ] index-blog 커버를 현재 화면으로 재촬영, README에 아키텍처·설계 결정 요약 `type:docs` `area:qa`
- [ ] 코드 열람 가능한 작업 묶음(부트캠프 프로젝트 등 작은 카드) `type:feature` `area:frontend`

## R2 · 서사 전환

- [ ] 커밋 기준 역할 비율 차트 제거, 메인 프로젝트 단계 타임라인으로 교체 `type:feature` `area:frontend`
- [ ] 히어로 펜 라벨을 역할명에서 제품 단계명으로 `type:feature` `area:design`
- [ ] 스크롤 단계별 아키텍처 다이어그램 컴포넌트 `type:feature` `area:design`

## R3 · 트랙 분리

- [ ] 스키마: projects.tracks · order_fe/qa · detail_fe/qa, profile.tagline_*/intro_* `type:feature` `area:backend`
- [ ] /fe · /qa 라우팅 분기(히어로 · 프로젝트 정렬 · 강조 블록 · CTA), / 리디렉트 `type:feature` `area:frontend`
- [ ] 홈 편집에서 트랙별 문구·노출·정렬·강조 블록 편집 `type:feature` `area:frontend`
- [ ] /projects 목록 제거, 홈 프로젝트 섹션으로 일원화 `type:chore` `area:frontend`
- [ ] /admin을 글·노트·영상만 남기고 정리 `type:chore` `area:frontend`

## R4 · 블로그 분리

- [ ] 호스트명 라우팅: fe · qa · blog · vault (커스텀 도메인 연결) `type:feature` `area:infra`
- [ ] 블로그를 blog 서피스로 이전, 포트폴리오 링크 하나 · 프로젝트 상세에 관련 글 3편 `type:feature` `area:frontend`
- [ ] vault_notes 테이블·RLS, vault 서피스(로그인 필수 · noindex), 공개 글로 보내기 `type:feature` `area:backend`
- [ ] RLS 검사에 vault_notes 공개 키 차단 케이스 추가 `type:test` `area:qa`

## R5 · 증거물과 마감

- [ ] QA 트랙 증거 페이지: 테스트 전략 · CI가 잡은 버그 · 커버리지 `type:docs` `area:qa`
- [ ] 시각 회귀 테스트(Playwright 스크린샷) `type:test` `area:qa`
- [ ] Lighthouse CI 예산 `type:test` `area:qa`
- [ ] OG 이미지 · 메타데이터 · sitemap `type:feature` `area:frontend`
- [ ] /resume: 인쇄·PDF 한 장 `type:feature` `area:frontend`

## 보류

채용 담당자가 보는 것은 기능이 아니라 프로젝트 내용입니다. R1–R5가 끝난 뒤 다시 봅니다.

- Realtime Presence (#24) · 「나에 대해 묻기」 AI (#25) · /changelog (#26) · /quality (#27) · /status (#28) · 직접 구현 WebSocket 데모 (#33)
