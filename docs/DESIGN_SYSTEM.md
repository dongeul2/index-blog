# 기록실(INDEX.) — 디자인 시스템 구현 가이드

방향: **1c 제도 도면** · 다크 기본값 · 읽기는 조용하게, 탐색은 대담하게.

## 파일

| 파일 | 용도 |
| --- | --- |
| `tokens.css` | Tailwind CSS v4 `@theme` + 라이트 오버라이드 + prose/코드/칩/콜아웃 컴포넌트 레이어. `app/globals.css`로 그대로 사용 가능 |
| `favicon.svg` | 기본 파비콘 (벡터) |
| `favicon-32.png`, `favicon-48.png` | 레거시 브라우저용 |
| `apple-touch-icon-180.png` | iOS 홈 화면 |
| `icon-512.png` | PWA manifest / OG 아이콘 |
| `../Design System.dc.html` | 시각 명세 원본 (상태별 컴포넌트 렌더 확인용) |

## 폰트 설치

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

D2Coding은 폴백 전용(로컬 설치 사용자만). 한글 주석이 있는 코드 블록에서 JetBrains Mono의 빈 글리프를 D2Coding이 받으며, 폭이 2:1로 맞아 정렬이 깨지지 않습니다.

## 파비콘 삽입

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon-180.png">
<meta name="theme-color" content="#16191E">
```

마크는 길이가 줄어드는 세 개의 괘선(밝은 회색 → 중간 회색 → 액센트)입니다. 헤더 로고 `INDEX.`의 마지막 액센트 마침표와 같은 논리이고, 16px에서도 세 줄이 구분됩니다.

## 다크/라이트 전환

- 기본값은 다크. `:root`에 아무 속성이 없으면 다크.
- 라이트는 `<html data-theme="light">`. 뉴트럴·신택스·액센트 변형만 덮어쓰고 구조 값(스페이싱·타입)은 공유합니다.
- 초기값은 `prefers-color-scheme`, 이후 `localStorage.theme`. 플래시 방지용으로 `<head>` 안에서 동기 스크립트로 `data-theme`을 먼저 심을 것.

```html
<script>
  const t = localStorage.theme ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  if (t === 'light') document.documentElement.dataset.theme = 'light';
</script>
```

## 레이아웃 규칙

| 구간 | 본문 최대 너비 | TOC |
| --- | --- | --- |
| `< 640` | 100% − 40px | 본문 상단 `<details>` 접이식 |
| `640–1023` | 620px | 접이식 유지 |
| `1024–1439` | 680px (68ch) | 우측 `sticky` 200px |
| `≥ 1440` | 720px | 우측 `sticky` 240px, 페이지 max 1360px |

- 3단 사이드바 없음. 본문은 뷰포트 중앙 정렬이며 TOC 폭으로 상쇄하지 않습니다.
- TOC는 `position: sticky; top: 96px`.
- 리듬: 문단 24 / 소제목 위 48·아래 16 / 코드블록 위아래 32 / 섹션 96.

## 컴포넌트 → 토큰 매핑

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

## 접근성 체크리스트

- 모든 본문 조합 WCAG AA 이상: 다크 `--color-text` 14.6:1, `--color-text-2` 8.4:1, `--color-text-muted` 5.1:1 / 라이트 15.8 · 9.1 · 5.3:1. 라이트 코드 주석 4.6:1.
- 포커스 링: `outline: 2px solid var(--color-accent)`, offset 2px. 액센트 배경 위에서는 `--color-text`로 반전. 어디서도 `outline: none` 금지.
- 키보드 순서: 본문 바로가기 → 로고 → 주 내비 → 검색(⌘K) → 다크모드 토글 → 본문 → TOC → 이전/다음 → 푸터. 양수 `tabindex` 사용 안 함.
- 드롭다운·모바일 TOC는 ESC로 닫고 트리거로 포커스 복귀.
- 랜드마크는 `header`/`nav`/`main`/`aside`(TOC)/`footer` 각 1회.
- 카테고리 배지에 `sr-only` "분류: 개발일지", 자동 생성 글에 `sr-only` "자동 생성된 요약".
- 코드 블록은 `<pre tabindex="0" role="region" aria-label="코드: review.yml">`로 가로 스크롤 키보드 접근 보장.
- 날짜·읽는 시간은 `<time datetime>`.
- `prefers-reduced-motion`에서 전환·진행 바 애니메이션 제거 (tokens.css에 포함).


---

# v0.2 확장 — 영상 라이브러리 · 프로젝트 랩

기존 시스템은 **변경·대체 없이 그대로 유지**됩니다. 컬러 램프, 타입 스케일, 스페이싱, `.prose`, `.code-block`, `.callout`, `.chip`, `.badge`는 v0.1 그대로이고 아래 내용이 얹힙니다. 설계 원칙도 동일합니다 — 읽기는 극도로 조용하게, 탐색은 대담하게 / 3단 사이드바 없음 / 본문 중앙 정렬 + 우측 sticky TOC / 아이콘 대신 텍스트 라벨 / 그라디언트·스톡 일러스트 없음.

## 추가된 프로젝트 범위

**영상 라이브러리** — 유튜브 API로 등록 채널의 최신 업로드를 훑고, 필요할 때만 명령어로 Claude를 호출해 초안 게시물을 만드는 개인 큐레이션 도구. 글쓰기는 **완전히 선택적인 행동**이므로 AI 호출 UI는 화면을 지배하지 않고, 필요할 때 손 뻗으면 닿는 위치에 조용히 있습니다.

**프로젝트 랩** — 하나의 프로젝트 = 하나의 GitHub 저장소 + 그에 속한 개발 일지들. README 렌더링, 최근 커밋·PR 읽기 전용 표시, 일지 타임라인. 코드 편집은 하지 않는 기록·쇼케이스 레이어.

기존 콘텐츠 3종(devlog / video-summary / essay)과 카테고리 토큰은 그대로입니다.

## 결정: 영상 라이브러리는 관리자 전용

**관리자 전용(12~14번)** 으로 두고, 공개 영역에는 「요즘 보는 것」 블록 하나만 둡니다 — 구독 채널 목록 + 그 채널에서 나온 영상 요약 글 링크. 캐시된 정적 데이터이므로 API 쿼터를 소모하지 않습니다.

근거:
1. 쿼터 100회/일은 공개 방문자 트래픽과 구조적으로 맞지 않습니다.
2. 브라우즈는 도구이고 블로그는 읽기 매체입니다. 독자에게는 정리되지 않은 시청 목록일 뿐이며, 브라우즈 UI가 「탐색은 대담하게」의 대담함을 읽을 것이 아닌 데 써버립니다.
3. 영상 임베드 목록은 저작권·품질 통제 밖에 있습니다.
4. 게시물이 없는 영상 카드가 목록의 대부분을 차지합니다.

결과적으로 **도구는 감추고 결과만 공개**합니다. 개성은 「요즘 보는 것」이 담당하고, 클릭하면 읽을 글로 이어집니다.

## 정보 구조 (15개 화면)

### 공개 영역 — 하단 내비 없음, 축소 헤더 유지
| # | 화면 | 비고 |
| --- | --- | --- |
| 01 | 홈 | 최신 글 + 카테고리 하이라이트 + **진행 중 프로젝트** + **요즘 보는 것** |
| 02 | 아카이브 | 카테고리·태그·연도 필터, 페이지네이션 |
| 03 | 글 상세 | devlog면 상단에 **소속 프로젝트 링크 줄** 추가 |
| 04 | 검색 결과 | 글 + 프로젝트 두 그룹 |
| 05 | 태그 페이지 | v0.1 그대로 |
| 06 | **프로젝트 목록** | 진행 중 / 보관됨 — 신규 |
| 07 | **프로젝트 상세** | 저장소 · README · 커밋/PR · 일지 타임라인 — 신규 |
| 08 | 404 | 최근 글 3개로 회수 |

### 관리자 영역 `/admin` — 모바일 하단 내비 4탭
| # | 화면 | 비고 |
| --- | --- | --- |
| 09 | 로그인 | 하단 내비 없는 단독 화면, 단일 사용자 |
| 10 | 대시보드 | 초안 / 발행됨 / 자동생성 대기 / 실패 · 실시간 갱신 |
| 11 | 글 작성·편집 | 50:50 분할 + **발행일 편집** |
| 12 | **영상 브라우즈** | 채널 최신 업로드 훑기 — 신규 |
| 13 | **영상 시청 + AI 호출** | 재생 + 명령어 → 초안 — 신규 |
| 14 | **채널 구독 관리** | 등록/삭제 · 쿼터 현황 — 신규 |
| 15 | **프로젝트 생성·연결** | 새로 만들기 / 기존 연결 2모드 — 신규 |

### 모바일 하단 내비 (관리자만)
`.tabbar` — 대시보드 / 영상 / 프로젝트 / 새 글 4탭. 텍스트 라벨만(아이콘 없음), 탭 높이 56 + safe-area, 활성 표시는 상단 2px 액센트 + 글자색, 히트 44×44 확보.

공개 영역은 읽기 매체이므로 하단 내비를 두지 않고 v0.1의 축소 헤더를 유지합니다. 관리자 헤더는 「나가기 / 사이트 보기」만 남긴 축소형으로 분기합니다.

### 주 사용 시나리오 (모바일)
영상 탭 → 세로로 훑기 → 탭해서 재생 → **하단 시트에서 명령어** → 초안 저장

AI 호출은 기본 상태에서 접혀 있는 하단 시트입니다. 닫힌 상태에서는 한 줄 높이(48px)의 「기록하기」 바만 보이고, 열면 프리셋 + textarea가 나타납니다. 영상 위에 겹치지 않고 아래로 밀어냅니다.

## 추가 토큰 (7종만, 기존 값 변경 없음)

| 토큰 | 값 | 왜 필요한가 |
| --- | --- | --- |
| `--color-scrim` | `oklch(0.12 0.01 265 / 0.72)` | 모달·하단 시트 뒤 어둡게. 기존 램프에 반투명 값이 없음 |
| `--color-elevated` | `oklch(0.31 0.013 265)` | 모달·토스트·시트 표면. `--surface`는 인라인 코드·칩 배경으로 이미 쓰여 겹침 |
| `--color-media` | `oklch(0 0 0)` | 플레이어·썸네일 배경. 라이트 모드에서도 검정을 유지해야 하므로 뉴트럴 램프 밖 |
| `--color-on-media` | `oklch(0.97 0 0)` | 썸네일 위 길이 라벨. 이미지 위 대비는 모드와 무관하게 고정 |
| `--shadow-elevated` | `0 8px 32px …` | 시스템 첫 그림자. 다크는 보더로 층을 세우지만 라이트 모달은 그림자 없이 분리되지 않음 |
| `--spacing-safe-top/-bottom` | `env(safe-area-inset-*)` | iOS 노치·홈 인디케이터. 하단 내비·시트·토스트가 같은 값을 참조 |
| `--z-sheet / -modal / -toast` | `40 / 50 / 60` | 겹치는 층이 처음 생김. 임의 z-index 난립 방지 |

라이트 모드에서는 `--color-elevated`, `--color-scrim`, `--shadow-elevated` 세 개만 오버라이드합니다(`tokens.css` 하단).

**새 색을 만들지 않은 것들** — PR 상태·저장소 연결 상태는 기존 토큰에 매핑했습니다: `--color-cat-essay`(머지됨 / 연결됨) · `--color-accent`(열림 / 자동생성됨) · `--color-text-muted`(닫힘) · `--color-danger`(연결 끊김) · `--color-warn`(쿼터 경고, 예약 발행).

## 새 컴포넌트 → 토큰 매핑

### 영상 계열
| 컴포넌트 | 클래스 / 상태 | 토큰 |
| --- | --- | --- |
| 미디어 프레임 | `.media-frame` | `aspect-ratio: 16/9`, 배경 `--color-media`, 보더 `--color-border`. 플레이어(iframe)와 썸네일이 공유 |
| 썸네일 밝기 | rest / hover | `filter: brightness(0.92)` → hover·focus에서 `1`. 통제 밖의 이미지 색을 시스템 안으로 가두는 장치 |
| 길이 라벨 | `.media-frame__label` | 우하단, 배경 `oklch(0 0 0 / .78)`, 글자 `--color-on-media`, mono 11px |
| 영상 카드 | `.video-card` rest | 보더 투명, 배경 없음 |
| 영상 카드 | hover / focus-within | 배경 `--color-bg-subtle`, 보더 `--color-border` |
| 영상 카드 | 이미 글로 만든 영상 | `.video-card--written` — 좌측 inset 2px `--color-cat-video` |
| 훑기 피드 | `.video-feed` | 데스크톱 3열 / 태블릿 2열 / 모바일 1열 + `scroll-snap-type: y proximity`. 세로로 가볍게 넘겨보는 밀도(쇼츠 모방 아님) |
| 채널 필터 칩 | **기존 `.chip` 그대로** | 채널 아바타 없이 이름 + 개수만 → 이미지 로딩·정렬 문제 없음. active는 `--color-accent-bg` |
| 검색 + 쿼터 | 기존 검색 확장 | 우측에 「남은 조회 37/100」 캡션(`--color-text-muted`). 20 이하 `--color-warn`, 0이면 입력 `disabled` + 사유 문구 |
| 자막 없음 / 요약 불가 | **기존 `.callout--note`** | 새 컴포넌트 불필요 |

### AI 호출 계열
| 컴포넌트 | 상태 | 토큰 / 배치 |
| --- | --- | --- |
| 명령 패널 | 닫힘 / 열림 / 입력중 / 전송가능 | 데스크톱은 영상 우측 컬럼(고정), 모바일은 `.sheet` + `.elevated`. 닫힘 = 48px 「기록하기」 바 |
| 프리셋 버튼 | **기존 `.chip`** | 「핵심 3줄」 「실무 적용 아이디어」 「코드 예제 위주로」. 선택 시 `.chip--active` |
| 생성 중 | 스트리밍 | `.prose`에 `.streaming-caret`(액센트, 1s steps 블링크) 1개. 우상단 「중단」 텍스트 버튼. 스피너·스켈레톤 없음 |
| 생성 완료 | 3분기 | 초안 저장(1차 = `--color-accent` 배경) / 다시 생성(보더) / 버리기(`--color-danger` 텍스트 → 확인 모달) |
| 초안 미리보기 | — | **기존 `.prose` 그대로.** 발행 본문과 같은 토큰이라 미리보기가 곧 결과 |
| 생성 실패 | 원인별 4종 | **기존 `.callout--warn`** + 재시도 링크. 자막 없음 / API 오류 / 토큰 초과 / 쿼터 소진 각각 다른 문구 |

### 프로젝트 계열
| 컴포넌트 | 상태 | 토큰 |
| --- | --- | --- |
| 프로젝트 카드 | rest / hover | 이름(h3) · 한 줄 설명 · `owner/repo`(mono, `--color-text-muted`) · 최근 활동 · 일지 n편. hover는 포스트 카드와 동일 규칙 |
| 저장소 연결 배지 | 연결됨 / 자동생성됨 / 연결 끊김 | `.badge--linked` / `.badge--generated` / `.badge--unlinked`(점선 `--color-danger`) |
| 커밋 아이템 | — | `.repo-item` — mono 해시 7자 + 메시지 1줄 truncate + 상대 시각 |
| PR 아이템 | 열림 / 머지됨 / 닫힘 | `.repo-item` + `.pr-state--open|merged|closed`. 색과 텍스트를 동시에 표기 |
| README | — | **기존 `.prose` 그대로** + 접이식 「전체 보기」. 외부 배지 이미지는 `max-width`만 제한 |
| 일지 타임라인 | — | `.timeline` — 좌측 1px 괘선 + 날짜 눈금. 카드가 아닌 행 단위(목록 밀도 유지) |
| 저장소 생성/연결 폼 | 2모드 | 세그먼트로 「새로 만들기 / 기존 연결」 전환. 이름 중복 검사 상태(검사중 / 사용 가능 / 이미 있음) |

### 관리자 공통
| 컴포넌트 | 상태 | 토큰 |
| --- | --- | --- |
| 발행일 편집 | 기본 / 미래 날짜 | date + time 입력, 「지금으로 설정」 퀵 버튼. 미래면 `.badge--scheduled`「예약 발행」(`--color-warn`) |
| 실시간 큐 아이템 | 대기 → 처리중 → 완료 / 실패 | 상태를 **색 + 텍스트 동시 표기**, 전환은 배지 교체로만(애니메이션 없이도 명확). `aria-live="polite"` |
| 토스트 | 기본 / 실행취소 | `.toast` + `.elevated`. 하단 좌측, 모바일은 `.tabbar` 위. 4초 후 자동 해제 |
| 빈 상태 | 영상 없음 / 프로젝트 없음 / 초안 없음 | `.empty-state` — 점선 괘선 + 다음 행동 문구 + 1차 버튼. 일러스트 없음 |
| 확인 모달 | — | `.scrim` + `.modal.elevated`. 파괴적 액션은 `--color-danger`. 포커스 트랩, ESC 취소 |
| 오프라인 표시 | 오프라인 / 저장 보류 | `.offline-bar` — 헤더 아래 1줄, `--color-warn`. 관리자에선 「저장 보류 중 2건」 병기 |

## PWA / WebView 대비

- `--spacing-safe-top/-bottom`을 하단 내비·시트·토스트에 일괄 적용. 하드코딩된 `env()` 호출 금지.
- 모든 터치 타겟 44×44 이상(`.tabbar a`에 `min-height: 2.75rem` 명시).
- 모바일에서 관리자 전체 작업(영상 시청 → 명령어 입력 → 초안 생성 → 저장)이 가능해야 합니다. 이것이 실제 주 사용 시나리오입니다.
- 오프라인: `.offline-bar`로 상태 표시, 관리자 초안은 로컬 큐에 보관 후 복구 시 동기화.
- 앱 아이콘·스플래시는 기존 파비콘 마크(세 개의 괘선)를 확장합니다. `icon-512.png`가 maskable 기준을 만족하도록 여백 20%를 두고, 스플래시는 `--color-bg`(#16191E) 배경 + 중앙 마크.
- `theme-color: #16191E`(다크) / `#FCFCFB`(라이트) 두 개를 `prefers-color-scheme` 미디어로 분기.

## 새 컴포넌트 접근성

| 컴포넌트 | ARIA / 포커스 |
| --- | --- |
| 훑기 피드 | 카드 전체가 링크 1개(`<a>`). 피드는 `<ul>`/`<li>`. 포커스 순서는 시각 순서와 동일 |
| 미디어 프레임 | 썸네일 `<img alt="{영상 제목} 썸네일">`. 플레이어 iframe에 `title="{영상 제목}"` 필수 |
| 길이 라벨 | 시각 표기 + `sr-only` "재생 시간 18분 42초" |
| 이미 글로 만든 영상 | 색 표시 + `sr-only` "이미 글로 정리한 영상" |
| 채널 필터 칩 | `<a aria-current="page">` 또는 `role="switch"`. 필터 변경 시 결과 개수를 `aria-live="polite"`로 알림 |
| 쿼터 표시 | `<output aria-live="polite">`. 0이 되면 입력 `disabled` + `aria-describedby`로 사유 연결 |
| 명령 패널 (시트) | `role="dialog" aria-modal="false"` (영상 재생을 막지 않음). 열기 시 textarea로 포커스, ESC로 닫고 트리거 복귀 |
| 프리셋 버튼 | 실제 `<button>`. 누르면 textarea 내용이 바뀌므로 `aria-live`로 삽입 사실을 알림 |
| 생성 중 | `aria-live="polite" aria-busy="true"`인 영역. 「중단」 버튼이 첫 탭 대상 |
| 3분기 액션 | 「초안 저장」이 첫 탭. 「버리기」는 확인 모달 경유 |
| 확인 모달 | `role="dialog" aria-modal="true"`. 포커스 트랩, 열기 시 취소 버튼에 포커스(파괴적 액션이 기본값이 되지 않게), ESC 취소, 닫으면 트리거 복귀 |
| 토스트 | `role="status"`. 실행취소가 있으면 `role="alert"` + 포커스 이동 없이 키보드 도달 가능 |
| 큐 아이템 | `<ul aria-live="polite">`. 상태 전환을 색만으로 전하지 않고 텍스트를 함께 교체 |
| 하단 내비 | `<nav aria-label="관리자">` + `aria-current="page"`. 랜드마크는 공개 헤더 nav와 중복되지 않게 각 화면에서 하나만 |
| 커밋 / PR 목록 | `<ol>`. 시각·상태는 `<time datetime>`과 텍스트로. 해시는 `sr-only` "커밋 3f9a2c1" |
| 발행일 편집 | `<input type="date">` + `<input type="time">`에 각각 `<label>`. 예약 발행 전환 시 `aria-live` 알림 |
| 빈 상태 | 장식 요소에 `aria-hidden`. 다음 행동 버튼이 포커스 가능한 첫 요소 |
| 오프라인 바 | `role="status"`. 색만으로 전하지 않고 문구 명시 |

## v0.2 전개 상태

**완료** — 정보 구조, 컴포넌트 계열 구조, 추가 토큰 7종(`tokens.css` 반영 완료), 새 컴포넌트 CSS 레이어, 접근성 명세.

**남은 작업** — 15개 화면 목업(데스크톱 + 모바일 각각). 합의된 전개 순서: 12(영상 브라우즈) → 13(영상 시청 + AI) → 07(프로젝트 상세) → 06 · 15 · 14 → 01 · 02 · 03 · 10 · 11 → 04 · 05 · 08 · 09.

구현을 먼저 시작하는 경우 03(글 상세) → 02(아카이브) → 01(홈) 순서를 권합니다. 읽기 경험이 시스템 검증의 기준입니다.
