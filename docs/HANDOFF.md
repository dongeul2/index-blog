# Handoff: 기록실(INDEX.) — 개인 개발자 블로그 디자인 시스템

## Overview
1인 운영 개인 기술 블로그의 디자인 시스템입니다. 콘텐츠는 세 종류(개발 일지 / 영상 요약 / 일반 글)이고 상당수가 자동화 파이프라인으로 생성되므로, 글의 출처를 시각적으로 구분하는 카테고리 토큰이 시스템의 축입니다. 코드 블록이 매우 빈번하므로 신택스 팔레트와 코드 블록 컴포넌트를 1급 요소로 정의했습니다.

설계 원칙 한 줄: **읽기는 극도로 조용하게, 탐색은 대담하게.** 본문은 장식 없는 타이포그래피만, 홈·아카이브·헤더는 큰 표제와 비대칭 괘선 그리드로 개성을 냅니다. 3단 사이드바·위젯·광고 슬롯·그라디언트·스톡 일러스트는 쓰지 않습니다.

v0.2에서 범위가 확장되었습니다 — **영상 라이브러리**(유튜브 API로 채널 최신 업로드를 훑고, 원할 때만 명령어로 Claude를 호출해 초안을 만드는 관리자 전용 도구)와 **프로젝트 랩**(하나의 GitHub 저장소 + 그에 속한 개발 일지들). 자세한 내용은 `DESIGN_SYSTEM.md`의 「v0.2 확장」 절에 있습니다.

이번 번들의 범위는 **디자인 시스템 전체(토큰 + 컴포넌트 명세 + 정보 구조 + 파비콘)** 입니다. 15개 화면 목업은 아직 포함되지 않았습니다(§Screens 참고).

## About the Design Files
이 번들의 HTML 파일은 **HTML로 만든 디자인 참조물**입니다 — 의도한 형태와 동작을 보여주는 프로토타입이며, 그대로 복사해 배포할 프로덕션 코드가 아닙니다. 할 일은 이 디자인을 **대상 코드베이스의 기존 환경(React/Next.js, Vue, 기타)과 기존 패턴·라이브러리로 재현**하는 것입니다. 아직 환경이 없다면 프로젝트에 가장 적합한 프레임워크를 고르고 그 위에 구현하세요. 명세가 Next.js App Router + Tailwind CSS v4를 전제로 쓰여 있지만, 토큰은 순수 CSS 커스텀 프로퍼티이므로 어떤 스택으로도 옮길 수 있습니다.

`tokens.css`는 예외입니다 — 이 파일은 그대로 가져다 쓰는 것을 의도한 산출물입니다(`app/globals.css`).

## Fidelity
**High-fidelity.** 색상은 oklch 값까지, 타이포는 size/weight/line-height/letter-spacing까지, 스페이싱은 4px 베이스 스케일로 확정되어 있습니다. 컴포넌트는 상태별(rest/hover/focus/active/error)로 명세되어 있습니다. 픽셀 단위로 재현하되, 대상 코드베이스에 이미 있는 컴포넌트 프리미티브가 있다면 그것을 이 토큰으로 스타일링하는 방향이 맞습니다.

## Screens / Views
전체 15개 화면의 정보 구조와 각 화면이 쓰는 컴포넌트는 확정되어 있습니다(`DESIGN_SYSTEM.md` §정보 구조). 픽셀 목업은 아직 없으므로, 아래 레이아웃 규칙 + 컴포넌트→토큰 매핑으로 구현하세요.

**공개 8** — 01 홈 / 02 아카이브 / 03 글 상세 / 04 검색 결과 / 05 태그 / 06 프로젝트 목록 / 07 프로젝트 상세 / 08 404
**관리자 7** `/admin` — 09 로그인 / 10 대시보드 / 11 글 작성·편집 / 12 영상 브라우즈 / 13 영상 시청 + AI 호출 / 14 채널 구독 관리 / 15 프로젝트 생성·연결

구현 순서는 03 글 상세 → 02 아카이브 → 01 홈 권장(읽기 경험이 시스템 검증의 기준). 그다음 07 → 12 → 13.

영상 라이브러리(12~14)는 **관리자 전용**입니다. 공개 영역에는 「요즘 보는 것」 블록(구독 채널 + 그 채널에서 나온 요약 글 링크, 캐시된 정적 데이터라 API 쿼터 미소모)만 노출합니다. 근거는 `DESIGN_SYSTEM.md`에 정리해 두었습니다.

### 레이아웃 규칙
| 구간 | 본문 최대 너비 | TOC |
| --- | --- | --- |
| `< 640` | 100% − 40px (여백 20) | 본문 상단 `<details>` 접이식 |
| `640–1023` | 620px (여백 32) | 접이식 유지 |
| `1024–1439` | 680px (68ch) | 우측 `sticky` 200px |
| `≥ 1440` | 720px, 페이지 max 1360px | 우측 `sticky` 240px |

- 사이드바 없음. 본문은 **뷰포트 중앙 정렬**이며 TOC 폭으로 상쇄하지 않습니다.
- TOC는 `position: sticky; top: 96px`. 1279px 이하에서 본문 상단 접이식으로 전환.
- 수직 리듬: 문단 24 / 소제목 위 48·아래 16 / 코드블록 위아래 32 / 섹션 96.
- 글 상세 본문 줄 길이 기준: 한 줄에 한글 34~38자, 영문 68~72자.

## Interactions & Behavior
- **헤더**: rest 68px, 스크롤 120px 초과 시 44px로 축소하며 글 제목을 노출하고 하단에 읽기 진행 바(`--color-accent`)를 표시. 하향 스크롤 시 숨기지 않음(읽기 중 방향 상실 방지). 전환 180ms ease.
- **다크모드 토글**: `role="switch" aria-checked`, 히트 영역 44×44, 색 전환 180ms. 초기값 `prefers-color-scheme`, 이후 `localStorage.theme`. 플래시 방지용 동기 스크립트를 `<head>`에 삽입(§Design Tokens 아래 스니펫).
- **포스트 카드**: 카드 전체가 링크 1개. hover/focus-within에서 배경 `--color-bg-subtle`, 보더 `--color-border-strong`, 제목에 액센트 밑줄. 120ms.
- **코드 블록 복사 버튼**: hover 시 노출, 클릭 후 1.5초간 "복사됨" 표시, `aria-live="polite"`.
- **코드 블록 가로 스크롤**: `white-space: pre` + `overflow-x: auto`. 줄바꿈하지 않음. 스크롤바 6px `--color-border-strong`. 모바일에서 좌우 −20px 풀블리드.
- **TOC 현재 위치**: h2·h3만 수집, `IntersectionObserver` `rootMargin: -96px 0px -70%`. 현재 항목은 `--color-accent` + 좌측 2px 바.
- **검색**: ⌘K로 열기, 250ms 디바운스, `role="combobox"` + `role="listbox"`, ↑↓ 이동 / ↵ 열기 / ESC 닫고 트리거로 포커스 복귀. 결과 없음 문구: "'{쿼리}'와 일치하는 글이 없습니다".
- **목록 더 불러오기**: 아카이브는 페이지네이션, 태그·검색 결과는 「더 보기」 버튼(무한 스크롤 미사용 — 푸터 접근성 유지).
- **로그인**: 단일 사용자. 회원가입·소셜 로그인 없음. 에러는 필드 보더 `--color-danger` + `aria-live` 메시지.
- **에디터**: 좌우 50:50 분할(마크다운 / 미리보기), 스크롤 동기화, 자동 저장 타임스탬프 표시. 미리보기는 실제 본문 토큰을 그대로 사용. 발행 버튼은 미리보기 확인 후 활성.
- `prefers-reduced-motion`에서 모든 전환·진행 바 애니메이션 제거(`tokens.css`에 포함).

## State Management
- `theme: 'dark' | 'light'` — `localStorage`에 영속, `<html data-theme>`에 반영. 기본값 다크.
- `activeHeadingId: string` — TOC 하이라이트. IntersectionObserver로 갱신.
- `scrollProgress: number` — 헤더 진행 바. rAF 스로틀.
- `searchQuery / searchResults / activeResultIndex` — 검색 드롭다운. 250ms 디바운스.
- `filters: { category, tag, year }` — 아카이브. URL 쿼리로 직렬화(공유 가능해야 함).
- `page` — 아카이브 페이지네이션. URL 경로 또는 쿼리.
- 관리자: `post: { title, category, tags[], sourceUrl, body }`, `status: 'draft' | 'published' | 'queued' | 'failed'`, `lastSavedAt`, `previewConfirmed`.
- 데이터 요구사항: 글 목록(카테고리·태그·연도 필터), 글 본문(마크다운 → HTML, 헤딩 추출), 태그 집계(개수 포함), 검색 인덱스, 자동 생성 대기 큐.

## Design Tokens
전체 토큰은 `tokens.css`가 정본입니다. 아래는 요약입니다.

### 다크/라이트 전환
- 기본값은 다크. `:root`에 아무 속성이 없으면 다크.
- 라이트는 `<html data-theme="light">`. 뉴트럴·신택스·액센트 변형만 덮어쓰고 구조 값(스페이싱·타입)은 공유합니다.
- 초기값은 `prefers-color-scheme`, 이후 `localStorage.theme`. 플래시 방지용으로 `<head>` 안에서 동기 스크립트로 `data-theme`을 먼저 심을 것.

```html
<script>
  const t = localStorage.theme ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  if (t === 'light') document.documentElement.dataset.theme = 'light';
</script>
```

| 컴포넌트 | 상태 | 토큰 |
| --- | --- | --- |
| 헤더 (rest, 68px) | — | 배경 `--color-bg`, 하단 2px `--color-accent`, 활성 내비 `--color-text` + 액센트 밑줄, hover `--color-text-2` + 밑줄 |
| 헤더 (scrolled, 44px) | `> 120px` | 배경 `--color-bg-subtle`, 하단 1px `--color-border`, 진행 바 `--color-accent`. 글 제목 노출, 숨김 없음 |
| 다크모드 토글 | on / off / focus | 트랙 `--color-surface`+`--color-border`, 노브 `--color-accent`(dark) / `--color-text-muted`(light). `role="switch"`, 히트 44×44, 180ms |
| 포스트 카드 | rest | 보더 `--color-border`, 배경 `--color-bg` |
| 포스트 카드 | hover / focus-within | 배경 `--color-bg-subtle`, 보더 `--color-border-strong`, 제목 밑줄 `--color-accent`, 120ms |
| 카테고리 배지 | devlog / video / essay | `.badge--devlog|video|essay` — `--color-cat-*` + `--color-cat-*-bg`. 자동 생성 글은 캡션에 카테고리 색 텍스트로 "자동 생성" 표기(아이콘 없음) |
| 태그 칩 | 기본 / hover / active / disabled | `.chip` — active는 `--color-accent-bg` + `--color-accent` 보더. radius 0 |
| 코드 블록 | 기본 / 하이라이트 행 / 가로 스크롤 | `.code-block` — 배경 `--color-code-bg`, 좌측 2px `--color-accent`, 라인번호 `--color-code-line`, 하이라이트 `--color-accent-bg` + inset 2px. `white-space: pre` + `overflow-x: auto` |
| 복사 버튼 | rest / hover / copied | hover 시 노출, 클릭 후 1.5초 "복사됨" `aria-live="polite"` |
| 인라인 코드 | — | `.prose code` — 0.85em, 배경 `--color-surface`, 글자 `--color-accent` |
| 인용구 | — | 좌측 2px `--color-border-strong`, 글자 `--color-text-2` |
| 콜아웃 | info / note / warn / tip | `.callout--*` — 라벨 텍스트 사용, 아이콘 없음 |
| TOC | 기본 / 현재 위치 | 현재 항목 `--color-accent` + 좌측 2px 바. h2·h3만 수집, `IntersectionObserver` `rootMargin: -96px 0px -70%` |
| 페이지네이션 | 기본 / hover / 현재 | 현재 `--color-accent-bg` + `--color-accent`. 아카이브=페이지네이션, 태그·검색=「더 보기」 버튼 |
| 검색 | 닫힘 / 입력 / 결과 / 결과 없음 | 보더 `--color-accent`, 선택 항목 `--color-surface` + 좌측 액센트, 하이라이트 `mark` = `--color-accent-bg`. `role="combobox"`, 250ms 디바운스 |
| 이전/다음 글 | 기본 / hover | 2열, 보더 `--color-border`, hover 시 `--color-bg-subtle` + 제목 액센트 밑줄 |
| 푸터 | — | 상단 2px `--color-border`, 로고 800, 링크 `--color-text-2` |
| 로그인 폼 | 기본 / focus / 에러 | 필드 배경 `--color-bg`, focus 보더 `--color-accent`, 에러 보더·메시지 `--color-danger` + `aria-live` |
| 상태 배지 | 초안 / 발행됨 / 자동생성 대기 / 실패 | 초안만 점선 보더(`.badge--draft`), 나머지 `--color-cat-essay` / `--color-warn` / `--color-danger` |
| 에디터 | 분할 50:50 | 좌 마크다운(`--font-mono`), 우 미리보기는 실제 `.prose` 토큰 그대로. 스크롤 동기화, 자동 저장 타임스탬프, 발행은 미리보기 확인 후 활성 |

## 타입 스케일

| 토큰 | 데스크톱 | 모바일 |
| --- | --- | --- |
| `--text-h1` | 48 / 800 / 1.1 / −0.035em | 32 / 1.18 |
| `--text-h2` | 32 / 700 / 1.25 / −0.025em | 25 |
| `--text-h3` | 23 / 600 / 1.35 / −0.015em | 20 |
| `--text-h4` | 17 / 600 / 1.45 / 0.01em | 16 |
| `--text-body` | 17 / 400 / 1.85 | 16 / 1.8 |
| `--text-caption` | 13 / 400 / 1.6 | 12.5 |
| 인라인 코드 | 0.85em / 1.4 | 동일 |
| `--text-code` | 13.5 / 400 / 1.75 | 13 / 1.7 |

굵기는 400 / 600 / 800 세 종만 사용합니다.

## Assets
- `favicon.svg` / `favicon-32.png` / `favicon-48.png` / `apple-touch-icon-180.png` / `icon-512.png` — 이 프로젝트에서 만든 벡터 마크(길이가 줄어드는 세 개의 괘선: `--color-text` → `--color-text-2` → `--color-accent`). 외부 소스 없음, 저작권 제약 없음.
- 사진·일러스트 에셋 없음. 시스템은 이미지 없이 성립하도록 설계했습니다.
- 폰트: Pretendard(오픈소스, jsDelivr CDN), JetBrains Mono(Google Fonts). D2Coding은 로컬 폴백 전용.

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon-180.png">
<meta name="theme-color" content="#16191E">
```

## Accessibility
- 모든 본문 조합 WCAG AA 이상: 다크 `--color-text` 14.6:1, `--color-text-2` 8.4:1, `--color-text-muted` 5.1:1 / 라이트 15.8 · 9.1 · 5.3:1. 라이트 코드 주석 4.6:1.
- 포커스 링: `outline: 2px solid var(--color-accent)`, offset 2px. 액센트 배경 위에서는 `--color-text`로 반전. 어디서도 `outline: none` 금지.
- 키보드 순서: 본문 바로가기 → 로고 → 주 내비 → 검색(⌘K) → 다크모드 토글 → 본문 → TOC → 이전/다음 → 푸터. 양수 `tabindex` 사용 안 함.
- 드롭다운·모바일 TOC는 ESC로 닫고 트리거로 포커스 복귀.
- 랜드마크는 `header`/`nav`/`main`/`aside`(TOC)/`footer` 각 1회.
- 카테고리 배지에 `sr-only` "분류: 개발일지", 자동 생성 글에 `sr-only` "자동 생성된 요약".
- 코드 블록은 `<pre tabindex="0" role="region" aria-label="코드: review.yml">`로 가로 스크롤 키보드 접근 보장.
- 날짜·읽는 시간은 `<time datetime>`.
- `prefers-reduced-motion`에서 전환·진행 바 애니메이션 제거 (tokens.css에 포함).

## Files
| 파일 | 내용 |
| --- | --- |
| `tokens.css` | **그대로 사용할 산출물.** Tailwind v4 `@theme` + 라이트 오버라이드 + `.prose`/`.code-block`/`.callout`/`.chip`/`.badge`/skip-link 레이어 |
| `DESIGN_SYSTEM.md` | **디자인 시스템 정본.** v0.1 전체 + v0.2 확장(정보 구조 15화면, 새 컴포넌트 매핑, PWA, 접근성) |
| `Design System.dc.html` | v0.1 시각 명세 원본(디자인 참조). 컬러 램프, 타입 스케일, 컴포넌트 상태 전부를 렌더 |
| `Extension Sketch.dc.html` | v0.2 확장 구조 스케치(디자인 참조). 정보 구조, 컴포넌트 계열, 추가 토큰의 근거 |
| `Favicon.dc.html` | 파비콘 마크와 크기별 렌더(디자인 참조) |
| `support.js` | 위 두 HTML 참조 파일이 브라우저에서 열리기 위한 런타임. 구현에는 사용하지 않음 |
| `기록실 디자인 시스템.html` | 시각 명세의 오프라인 단일 파일 버전. 브라우저로 바로 열어 확인 |
| `favicon.svg`, `favicon-*.png`, `apple-touch-icon-180.png`, `icon-512.png` | 아이콘 에셋 |

시각 명세를 볼 때는 `기록실 디자인 시스템.html`을 브라우저로 여는 것이 가장 빠릅니다.
