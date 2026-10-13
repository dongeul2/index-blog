# 기록실 INDEX.

개인 기록 블로그. 디자인 핸드오프(`docs/`)를 Next.js App Router + Tailwind CSS v4로 구현하고,
게시물·인증은 Supabase에 둡니다.

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint && npm run typecheck
npm test               # Vitest 단위 테스트
npm run test:e2e       # Playwright E2E (데스크톱·모바일 + axe 접근성)

node --env-file=.env.local scripts/check-rls.mjs    # 공개 키로 RLS가 실제로 막는지 확인
```

`.env.local`에 필요한 값: `NEXT_PUBLIC_SUPABASE_URL`, 공개 키(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
또는 `..._ANON_KEY`), `SUPABASE_SERVICE_ROLE_KEY`(스크립트 전용), `ADMIN_GITHUB_LOGIN`.

## 작업 방식

이슈 → 브랜치 → PR(CI) → 스쿼시 병합 → release-please 릴리스. 자세한 규칙은
[CONTRIBUTING.md](CONTRIBUTING.md), 설계 결정은 [docs/adr/](docs/adr/), 진행 계획은
[docs/ROADMAP.md](docs/ROADMAP.md)에 있습니다. GitHub 라벨·마일스톤·이슈·브랜치 보호는
`node scripts/github-bootstrap.mjs --apply`로 문서와 맞춥니다(`gh` 로그인 필요).

CI는 저장소 변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 씁니다.

## 구현 상태

핸드오프가 권하는 구현 순서는 **03 글 상세 → 02 아카이브 → 01 홈**입니다.

| # | 화면 | 상태 |
| --- | --- | --- |
| 03 | 글 상세 | **구현됨** — `/posts/toc-observer` |
| 02 | 아카이브 | **구현됨** — `/archive` (분류·태그·연도 필터 + 페이지네이션) |
| 01 | 홈 | **구현됨** — `/` (최신 글 · 분류별 · 진행 중 프로젝트 · 요즘 보는 것) |
| 07 | 프로젝트 상세 | **구현됨** — `/projects/index-blog` (저장소 · README · 커밋/PR · 일지 타임라인) |
| 06 | 프로젝트 목록 | **구현됨** — `/projects` (진행 중 / 보관됨) |
| 04 | 검색 결과 | **구현됨** — `/search?q=` (글 + 프로젝트 두 그룹, 「더 보기」) |
| 05 | 태그 | **구현됨** — `/tags`, `/tags/[tag]` (「더 보기」) |
| 08 | 404 | **구현됨** — 최근 글 3편으로 회수 |
| 09 | 로그인 | **구현됨** — `/admin/login` (GitHub 단일 사용자) |
| 10 | 대시보드 | **구현됨** — `/admin` (네 상태 필터 · 실시간 갱신) |
| 11 | 글 작성·편집 | **구현됨** — `/admin/posts/[slug]` (50:50 분할 · 발행일 편집 · AI 요약문·태그·제목 후보) |
| 15 | 프로젝트 생성·연결 | **구현됨** — `/admin/projects` (2모드 · GitHub 동기화) |
| 12 | 영상 브라우즈 | **구현됨** — `/admin/videos` (채널 칩 · 훑기 피드 · 유닛 표시) |
| 14 | 채널 구독 관리 | **구현됨** — `/admin/videos/channels` (등록/해지 · 쿼터 현황) |
| 13 | 영상 시청 + AI 호출 | **구현됨** — `/admin/videos/[videoId]` (재생 · 명령 패널 · 스트리밍 초안) |

**관리자 15개 화면 전부 구현했습니다.** 12에서 영상 카드를 누르면 13(시청 화면)으로
들어가고, 거기서 재생 + 명령(프리셋 3종 또는 직접 입력) → 스트리밍 초안 → 저장까지
한 화면에서 끝납니다.

### 영상 훑기는 유닛을 씁니다

`/admin/videos`는 열 때마다 **채널 수 + 1유닛**을 씁니다(채널별 `playlistItems.list` 1유닛 +
길이·자막을 한 번에 묻는 `videos.list` 1유닛). 13을 열 때마다 영상 하나당 **1유닛**을 더
씁니다(`videos.list`로 설명까지 받습니다). 같은 일을 `search.list`로 하면 채널당 100유닛입니다.
화면 위쪽이 이번 훑기 비용과 남은 유닛을 그대로 보여 줍니다 — 숨기면 어느 날 갑자기
"왜 안 되지"가 됩니다.

### 자막은 비공식 경로라 자주 비어 옵니다 — 그래서 설명으로 대신합니다

YouTube Data API는 임의 채널(구독한 남의 채널)의 자막 텍스트를 주지 않습니다.
`captions.download`가 유일한 다운로드 경로인데 업로더 본인의 OAuth가 있어야 합니다.
그래서 `lib/transcript.ts`는 시청 페이지가 브라우저에서 받는 `timedtext` 엔드포인트를
비공식으로 그대로 부릅니다 — 키도 쿼터도 필요 없지만, **직접 확인해 보니 서버(데이터센터)
IP에서는 서명된 요청도 자주 200 + 빈 본문으로 막힙니다.** 이건 이 저장소만의 문제가 아니라
YouTube가 2024~2025년에 걸쳐 강화한 봇 차단의 결과라, 배포 환경에 따라 아예 안 될 수도
있습니다.

그래서 13은 **자막이 안 잡히면 조용히 실패하지 않고, YouTube 공식 API가 주는 설명
(description)으로 대신 시도합니다.** 시스템 프롬프트가 "설명만으로 쓸 때는 근거가
약하니 짧게 쓰고 그 사실을 본문에 한 줄로 밝히라"고 지시하고, 화면에도(모델 출력을
믿지 않고 응답 헤더로) "자막을 받지 못해 설명만으로 작성했습니다"라고 따로 표시합니다.
자막도 설명도 없을 때만 진짜 "자막 없음" 실패로 끝납니다.

헤더의 검색 드롭다운(⌘K)은 글과 프로젝트를 함께 찾고, 마지막 줄의 「결과 n건 모두 보기」로
04 결과 페이지에 넘깁니다.

## 게시물 = Supabase의 `posts` 테이블

**공개 화면에 무엇이 보이는지는 앱이 아니라 RLS가 결정합니다** — 발행됨(`status='published'`)
+ 발행 시각이 지난 글만. 그래서 데이터 계층 질의에는 `status` 조건이 없습니다. 조건을 앱에
두면 한 곳만 빠뜨려도 초안이 새어 나갑니다.

```
public.posts     slug · title · category · status · source · source_ref · project · channel
                 summary · tags[] · body(마크다운) · is_generated · published_at
                 author_id → auth.users · created_at · updated_at
public.admins    github_login — 관리자 허용 목록 (정책이 없어 anon/authenticated는 접근 불가)
private.is_admin()  현재 사용자가 허용 목록에 있는지
```

- `is_generated`는 `source <> 'manual'`에서 파생되는 **생성 컬럼**입니다. 따로 적지 않습니다.
- `published_at`이 미래면 **예약 발행**이고, RLS가 시각이 될 때까지 가립니다.
- **읽는 시간과 소제목은 본문에서 계산합니다.** 컬럼으로 두면 본문과 어긋납니다.
- `status`는 `draft / published / queued / failed` — 10 대시보드의 네 상태와 같습니다.

글의 유일한 저장소는 DB입니다. 2026-10-12 포트폴리오 재편(#8) 때 초기 글과 마크다운 시드
(`content/posts/`, `scripts/seed-posts.mjs`)를 모두 걷어냈고, 지운 행은 git 밖 로컬 백업으로만 남겼습니다.

### 본문 문법

| 쓰는 법 | 결과 |
| --- | --- |
| `## 제목 {#custom-id}` | 소제목 + 앵커 지정(생략하면 제목을 슬러그로) |
| ` ```ts:toc.tsx {10,17} ` | 코드 블록 — 언어 : 파일명, 강조할 줄 |
| `> [!NOTE]` `[!TIP]` `[!WARNING]` `[!IMPORTANT]` | 콜아웃 4종 |
| GFM 표 · 목록 · 취소선 | 그대로 |

원시 HTML은 렌더하지 않습니다 — 본문 일부가 자동 생성되는 구조라 임의 HTML을 통과시키지
않는 편이 안전합니다.

## 캐시되는 데이터

프로젝트의 저장소 정보(커밋·PR·README)와 구독 채널은 더는 하드코딩이 아닙니다 —
`src/lib/github.ts`(GitHub API)와 `src/lib/youtube.ts`(YouTube Data API)가 각각 실제로
불러오고, `projects/[slug]/sync.ts`(15 화면의 「지금 가져오기」)와 `videos/channels/actions.ts`
(14 화면의 채널 등록)가 그 결과를 `repo_commits` · `repo_pulls` · `repo_readmes` ·
`channels` 테이블에 캐시합니다. 공개 화면은 캐시만 읽고 API를 직접 부르지 않습니다.

DB에는 `rls-check-draft`(초안)와 `rls-check-scheduled`(예약 발행) 두 행이 검증용으로 남아
있습니다. 공개 화면에는 보이지 않고, 10 대시보드의 상태 표시를 확인하는 데 씁니다.

## 구조

```
src/
  app/
    globals.css        핸드오프 tokens.css 원본 + 그 아래 프로젝트 레이어
    fonts.css          Pretendard 동적 서브셋 92조각 + JetBrains Mono @font-face
    layout.tsx         폰트, 파비콘, theme-color, 플래시 방지 스크립트, 헤더/푸터
    page.tsx           01 홈 (4블록)
    archive/           02 아카이브
    posts/[slug]/      03 글 상세
    search/            04 검색 결과
    tags/              05 태그 목록 · 태그별 글
    projects/          06 프로젝트 목록
    projects/[slug]/   07 프로젝트 상세
    not-found.tsx      08 404
    admin/login/       09 로그인 (GitHub 단일 사용자)
    admin/(protected)/
      page.tsx                       10 대시보드 (네 상태 필터 · 실시간 갱신)
      posts/[slug]/, posts/new/      11 글 작성·편집 (50:50 분할)
      videos/page.tsx                12 영상 브라우즈 (채널 칩 · 훑기 피드)
      videos/[videoId]/              13 영상 시청 + AI 호출 (재생 · 명령 패널 · 스트리밍)
      videos/channels/               14 채널 구독 관리 (등록/해지 · 쿼터)
      projects/                      15 프로젝트 생성·연결 (2모드 · GitHub 동기화)
    api/summarize/       개발 일지 초안 — 스트리밍 (라우트 핸들러)
    api/summarize-video/ 영상 요약 초안 — 스트리밍
  components/
    ui/                shadcn 컴포넌트 (Radix + cva). 외형은 기록실 토큰 그대로
    quota-meter.tsx    남은 여유 하나 — 숫자가 먼저, 막대는 거듭 말하는 것
    video-card.tsx     미디어 프레임 · 길이 라벨 · 「이미 글로 정리함」 표시
    post-card.tsx      카드 전체가 링크 1개, 비대칭 2열
    project-card.tsx   이름 · 설명 · owner/repo · 최근 활동 · 일지 n편 + 연결 배지
    section.tsx        섹션 머리 (mono 라벨 · 표제 · 더보기) — 홈·프로젝트 상세 공용
    filter-bar.tsx     분류·태그·연도 칩 (전부 링크 = URL이 곧 상태)
    pagination.tsx     아카이브 전용 (무한 스크롤 아님)
    load-more.tsx      「더 보기」 — 검색·태그 전용
    highlighted.tsx    검색어 일치 구간을 <mark>로
    site-header.tsx    68px ↔ 44px 축소, 진행 바, 글 제목 노출
    site-search.tsx    ⌘K, 250ms 디바운스, combobox/listbox
    theme-toggle.tsx   role="switch", data-theme 구독
    toc.tsx            IntersectionObserver, 모바일 접이식
    code-block.tsx     줄 번호, 강조 행, 복사 버튼
    markdown.tsx       mdast → React
    callout.tsx  post-nav.tsx  site-footer.tsx
  lib/
    posts.ts             posts 테이블 조회 · 필터 · 검색 — 서버 전용
    supabase/public.ts   공개 읽기 클라이언트 (쿠키 미사용 = 정적 생성 가능)
    content-types.ts     타입과 순수 헬퍼 — 클라이언트에서도 안전
    project-types.ts     프로젝트·채널 타입 — 클라이언트에서도 안전
    duration.ts          영상 길이 포맷 — 클라이언트에서도 안전
    markdown.ts           소제목 id · 콜아웃 · 코드 펜스 해석
    search-index.ts       클라이언트용 검색 인덱스 타입/필터
    projects.ts            프로젝트·커밋·PR·README·채널 — DB 조회, 서버 전용
    github.ts               GitHub API 클라이언트 — 서버 전용
    youtube.ts               YouTube Data API 클라이언트 — 서버 전용
    videos.ts                 12 브라우즈 조립 (채널 수 + 1유닛) — 서버 전용
    transcript.ts              영상 자막 — 비공식, 서버 전용(§자막은 비공식 경로)
    ai/                          Gemini 어댑터 · 프롬프트 · 사용량 · 쿼터
    time.ts  highlight.ts
public/fonts/          셀프 호스팅 폰트 (Pretendard OFL · JetBrains Mono OFL)
scripts/               check-rls.mjs · check-github.mjs · github-bootstrap.mjs
supabase/migrations/   스키마 · RLS 정책
docs/                  디자인 핸드오프 원본 (DESIGN_SYSTEM.md, HANDOFF.md)
```

## UI 컴포넌트 = shadcn, 외형 = 기록실 토큰

버튼·입력·선택·모달·시트·탭·토스트는 `src/components/ui`의 shadcn 컴포넌트입니다
(Radix UI + class-variance-authority + tailwind-merge). **고른 것은 동작이지 외형이
아닙니다** — 포커스 트랩, ESC, 타입어헤드, `aria-*` 연결처럼 직접 쓰면 반드시 한두 개
빠뜨리는 것들을 Radix에 맡기고, 색·타이포·radius 0·괘선은 `@theme` 토큰 그대로 둡니다.
그래서 `bg-accent` · `border-border-strong` 같은 유틸리티가 곧 디자인 시스템 토큰입니다.

`globals.css`의 `.badge` · `.chip` · `.field__input` 계열은 **더는 쓰이지 않지만 남겨
두었습니다.** 위쪽 절반은 핸드오프의 `tokens.css` 원본이고, 그 파일은 한 줄도 고치지 않는
것이 이 저장소의 약속입니다. 새 화면에서는 `components/ui`를 쓰세요.

## 폰트는 셀프 호스팅입니다

Pretendard를 jsDelivr CDN에서 받아 쓰던 것을 `public/fonts`로 옮겼습니다. 동적 서브셋
92조각을 그대로 가져왔으므로 브라우저는 **지금 화면에 쓰인 글자가 든 조각만** 받습니다
(보통 3~5개, 100KB 안쪽). 첫 화면의 기본 라틴 + 최빈 한글이 든 91번 조각만
`<link rel="preload">`로 미리 받아 FOUT을 줄입니다.

JetBrains Mono도 같은 방식으로 라틴·라틴확장 두 조각만 받습니다. 한글 주석은
D2Coding 등 뒤쪽 폴백이 받는다는 핸드오프 규칙 그대로입니다.

## 알려진 숙제

- **`supabase/migrations/`가 원격 DB의 마이그레이션 이력을 전부 담고 있지 않습니다.**
  원격에는 `create_posts_table` · `projects_and_channels_rls` · `repo_visibility_and_readme_table`
  등 초기 12건이 적용돼 있는데, 이 디렉터리에는 `20260920…` 이후 3건만 파일로 있습니다.
  그래서 **파일만 보고 "이 정책이 없구나"라고 판단하면 틀립니다** — 실제로 14 채널 구독 관리에
  필요한 `channels_admin_all`(ALL, `private.is_admin()`)과 `channels_public_read`는 이미
  `20260831023756_projects_and_channels_rls`에 들어 있습니다. 스키마를 확인할 때는 파일이 아니라
  DB(`list_migrations` / `pg_policies`)를 보세요.
- **정적 생성과 발행 시점.** `/posts/[slug]`와 `/tags/[tag]`는 빌드 시점에 DB를 읽어 정적
  생성됩니다. 11 에디터의 `savePost`/`deletePost`가 저장·삭제 시 `revalidatePath()`를
  부르므로 배포된 사이트에서는 바로 반영됩니다 — 다만 **로컬 `npm run dev`에서도 아니고
  `npm run build` 직후의 정적 HTML만 보는 상황이라면**, 그 스냅샷은 다시 빌드하기 전까지
  그대로입니다.
- **13(영상 시청)의 자막은 비공식 경로라 서버 환경에서 자주 비어 옵니다.** 자세한 내용과
  대응(설명으로 폴백)은 아래 「자막은 비공식 경로라 자주 비어 옵니다」 절에 있습니다.

## 판단이 필요했던 곳

- **공개 화면의 필터는 RLS가 겁니다.** 데이터 계층 질의에 `status = 'published'`를 쓰지
  않습니다 — 앱 조건은 빠뜨릴 수 있지만 정책은 모든 경로에 걸립니다.
- **`private.is_admin()`은 `auth.identities`를 봅니다.** `raw_user_meta_data`는 사용자가
  `updateUser()`로 직접 고칠 수 있어, 허용 목록과 대조하는 값으로 쓰면 아무나 자기
  `user_name`을 바꿔 관리자가 됩니다. 공급자가 채우는 `identity_data`만 신뢰합니다.
- **공개 읽기는 쿠키를 건드리지 않습니다.** 세션을 읽는 순간 그 페이지는 동적이 되어 정적
  생성이 불가능해집니다. 공개 화면은 anon 클라이언트로 읽고 경계는 RLS가 지킵니다.
- **날짜는 항상 서울 시간대로 변환합니다.** KST 자정에 저장된 값을 UTC로 자르면 하루 전날이
  됩니다.
- **목록에서도 본문을 함께 받아 옵니다.** 읽는 시간을 목록과 상세가 다른 방식으로 세면 같은
  글에 다른 숫자가 붙습니다. 글이 많아지면 저장 시점에 계산해 컬럼으로 두는 쪽으로 옮깁니다.
- **TOC 전환 폭**: 레이아웃 표는 `1024–1439`에서 우측 sticky 200px이라 하고, 인터랙션 절은
  `1279px 이하 접이식`이라고 합니다. 본문을 뷰포트 중앙에 두면서(= TOC 폭으로 상쇄하지 않으면서)
  200px TOC가 겹치지 않고 들어가려면 최소 1184px이 필요하므로, **1280px**을 전환점으로 잡았습니다.
  표의 200 / 240px 폭은 그대로 따릅니다.
- **신택스 하이라이터**: 토큰이 `--color-code-*` 8종을 정의하므로 외부 라이브러리 대신 그 개수에
  맞춘 규칙 기반 토크나이저를 넣었습니다. 정확한 파서가 아니라 색을 입히는 용도입니다.
- **랜드마크 1회 규칙**: 목차 안쪽, 이전/다음 글, 페이지네이션은 `<nav>` 대신 `<div>`로 두어
  내비게이션 랜드마크가 헤더 주 메뉴 하나만 남게 했습니다.
- **아카이브 필터는 전부 링크**입니다. 상태가 URL에만 있어야 화면을 그대로 공유할 수 있고
  (핸드오프 명시 요구), 뒤로 가기가 필터 이력이 되며, JS 없이도 동작합니다.
- **칩의 개수는 자기 축을 뺀 나머지 필터 기준**으로 셉니다. 분류를 고른 뒤에도 태그 개수가
  "지금 누르면 몇 개 남는지"를 정직하게 보여주기 위해서입니다. 0인 선택지는 링크가 아니라
  비활성 텍스트로 렌더합니다 — `pointer-events`로만 막으면 키보드로는 여전히 눌립니다.
- **「요즘 보는 것」은 정적 데이터**입니다. 공개 영역에서 유튜브 API를 호출하지 않는 것이
  핸드오프의 결정 사항(쿼터 100회/일)이라, 채널 목록과 요약 글 연결을 미리 굳혀 두고
  방문자 요청으로는 API를 건드리지 않습니다. 채널 아바타도 두지 않습니다.
- **프로젝트 상세는 정적 생성하지 않습니다.** 커밋·PR을 상대 시각("3일 전")으로 보여주는데
  정적 생성하면 그 값이 빌드 시각에 얼어붙습니다. `<time datetime>`에는 언제나 정확한 ISO를
  남겨 두어 보조기술은 어림값이 아닌 실제 시각을 얻습니다.
- **「더 보기」는 목록을 직접 그립니다.** 서버 컴포넌트에서 클라이언트 컴포넌트로 함수(render
  prop)를 넘길 수 없어서, 바깥에서는 이미 렌더된 `<li>` 노드 배열만 건네줍니다.
- **마크다운을 mdast에서 바로 React로 그립니다.** hast로 한 번 더 변환하면 코드 펜스의
  `meta`(강조 행)가 사라지고, 코드 블록·콜아웃을 이미 있는 컴포넌트로 잇기도 번거로워집니다.
- **소제목 id와 콜아웃 표식은 로딩 때 한 번만 정규화합니다.** 렌더할 때마다 하면, 파싱한
  트리를 캐시해 재사용하므로 두 번째 렌더에서는 표식이 이미 지워져 콜아웃 판정이 실패합니다.
- **검색 인덱스는 루트 레이아웃이 만들어 헤더로 내려보냅니다.** 드롭다운은 클라이언트
  컴포넌트라 DB에 직접 붙을 수 없습니다. 글이 수천 개가 되면 검색 API로 옮겨야 합니다.
- **404의 초기 HTML은 비어 있습니다.** `notFound()`를 쓰면 실제 404 상태 코드가 나가지만,
  이 Next 버전에서는 스트리밍 전에 throw되어 not-found UI가 클라이언트에서 렌더됩니다
  (`noindex`는 함께 붙습니다). 주소가 아예 매칭되지 않는 경우는 서버에서 정상 렌더됩니다.
  상태 코드를 200으로 내리고 Suspense 안에서 검사하면 서버 렌더가 되지만, 블로그에서는
  올바른 404 상태가 더 중요하다고 보고 그대로 두었습니다.
- `tokens.css`는 한 줄도 고치지 않고 `globals.css` 위쪽에 그대로 두었고, 화면 구현용 클래스는
  파일 아래쪽 "프로젝트 레이어"에 분리해 두었습니다.
