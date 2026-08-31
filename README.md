# 기록실 INDEX.

개인 기록 블로그. 디자인 핸드오프(`docs/`)를 Next.js App Router + Tailwind CSS v4로 구현하고,
게시물·인증은 Supabase에 둡니다.

```bash
npm run dev     # http://localhost:3000
npm run build
npx eslint src

node --env-file=.env.local scripts/seed-posts.mjs   # content/posts/*.md → DB (slug 기준 upsert)
node --env-file=.env.local scripts/check-rls.mjs    # 공개 키로 RLS가 실제로 막는지 확인
```

`.env.local`에 필요한 값: `NEXT_PUBLIC_SUPABASE_URL`, 공개 키(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
또는 `..._ANON_KEY`), `SUPABASE_SERVICE_ROLE_KEY`(스크립트 전용), `ADMIN_GITHUB_LOGIN`.

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
| 09~15 | 관리자 `/admin` | 미구현 |

**공개 영역 8개 화면 전부 구현했고, 전부 Supabase에서 읽습니다.** 남은 것은 관리자 영역 7개
(로그인 · 대시보드 · 작성/편집 · 영상 3종 · 프로젝트 연결)입니다.

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

`content/posts/*.md`는 이제 **앱이 읽지 않습니다.** 시드 원본이자 백업이고, 런타임 저장소는
DB입니다.

### 본문 문법

| 쓰는 법 | 결과 |
| --- | --- |
| `## 제목 {#custom-id}` | 소제목 + 앵커 지정(생략하면 제목을 슬러그로) |
| ` ```ts:toc.tsx {10,17} ` | 코드 블록 — 언어 : 파일명, 강조할 줄 |
| `> [!NOTE]` `[!TIP]` `[!WARNING]` `[!IMPORTANT]` | 콜아웃 4종 |
| GFM 표 · 목록 · 취소선 | 그대로 |

원시 HTML은 렌더하지 않습니다 — 본문 일부가 자동 생성되는 구조라 임의 HTML을 통과시키지
않는 편이 안전합니다.

## 아직 임시인 데이터

`src/lib/projects.ts`(프로젝트·커밋·PR)와 `src/lib/channels.ts`(구독 채널),
`src/content/readmes.tsx`는 아직 하드코딩입니다. GitHub / YouTube API에서 받아 캐시할 자리에
같은 모양으로 값을 넣어 두었습니다. `repo`의 `owner`도 자리표시자입니다.

DB에는 `rls-check-draft`(초안)와 `rls-check-scheduled`(예약 발행) 두 행이 검증용으로 남아
있습니다. 공개 화면에는 보이지 않고, 10 대시보드를 만들 때 상태 표시를 확인하는 데 씁니다.

## 구조

```
src/
  app/
    globals.css        핸드오프 tokens.css 원본 + 그 아래 프로젝트 레이어
    layout.tsx         폰트, 파비콘, theme-color, 플래시 방지 스크립트, 헤더/푸터
    page.tsx           01 홈 (4블록)
    archive/           02 아카이브
    posts/[slug]/      03 글 상세
    search/            04 검색 결과
    tags/              05 태그 목록 · 태그별 글
    projects/          06 프로젝트 목록
    projects/[slug]/   07 프로젝트 상세
    not-found.tsx      08 404
  components/
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
  content/readmes.tsx  프로젝트 README (임시)
  lib/
    posts.ts           posts 테이블 조회 · 필터 · 검색 — 서버 전용
    supabase/public.ts 공개 읽기 클라이언트 (쿠키 미사용 = 정적 생성 가능)
    content-types.ts   타입과 순수 헬퍼 — 클라이언트에서도 안전
    markdown.ts        소제목 id · 콜아웃 · 코드 펜스 해석
    search-index.ts    클라이언트용 검색 인덱스 타입/필터
    projects.ts  channels.ts  time.ts  highlight.ts
content/posts/         게시물 마크다운 (시드 원본 — 런타임에는 읽지 않음)
scripts/               seed-posts.mjs · check-rls.mjs
docs/                  디자인 핸드오프 원본 (DESIGN_SYSTEM.md, HANDOFF.md)
```

## 알려진 숙제

- **정적 생성과 발행 시점.** `/posts/[slug]`와 `/tags/[tag]`는 빌드 시점에 DB를 읽어 정적
  생성됩니다. 그래서 지금은 **글을 새로 넣어도 다시 빌드해야 보입니다.** 11 작성·편집 화면을
  만들 때 저장 후 `revalidatePath()`를 호출하도록 이어야 합니다.

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
