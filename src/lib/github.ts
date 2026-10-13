import "server-only";

/**
 * GitHub 읽기 클라이언트.
 *
 * 토큰은 읽기 전용(Contents · Pull requests · Metadata)입니다. 서버에서만 쓰며,
 * `NEXT_PUBLIC_` 접두사가 없으므로 브라우저 번들에 들어가지 않습니다.
 *
 * 실패를 예외로 던지지 않고 결과로 돌려줍니다 — 토큰 만료·권한 상실은 예외 상황이 아니라
 * 화면에 보여 줘야 하는 상태이기 때문입니다.
 */

const API = "https://api.github.com";

export type GitHubFailure =
  | { kind: "no-token" }
  | { kind: "unauthorized" }
  | { kind: "not-found" }
  | { kind: "rate-limited"; resetAt: string | null }
  | { kind: "error"; message: string };

export type GitHubResult<T> = { ok: true; data: T } | ({ ok: false } & GitHubFailure);

export function failureMessage(f: GitHubFailure): string {
  switch (f.kind) {
    case "no-token":
      return "GITHUB_TOKEN 이 설정되지 않았습니다.";
    case "unauthorized":
      return "토큰이 만료되었거나 유효하지 않습니다. 새 토큰을 발급해 .env.local 을 갱신하세요.";
    case "not-found":
      return "저장소를 찾을 수 없습니다. 이름이 맞는지, 토큰이 이 저장소에 접근할 수 있는지 확인하세요.";
    case "rate-limited":
      return f.resetAt
        ? `GitHub API 호출 한도를 넘었습니다. ${f.resetAt} 이후에 다시 시도하세요.`
        : "GitHub API 호출 한도를 넘었습니다.";
    case "error":
      return f.message;
  }
}

async function call<T>(path: string, accept = "application/vnd.github+json"): Promise<GitHubResult<T>> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, kind: "no-token" };

  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      // 동기화는 명시적으로 누를 때만 도는 동작이라 캐시하지 않습니다.
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, kind: "error", message: e instanceof Error ? e.message : String(e) };
  }

  if (response.status === 401) return { ok: false, kind: "unauthorized" };
  // 비공개 저장소에 권한이 없으면 GitHub은 403이 아니라 404를 돌려줍니다(존재 여부를 숨기려고).
  if (response.status === 404) return { ok: false, kind: "not-found" };
  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      const reset = response.headers.get("x-ratelimit-reset");
      return {
        ok: false,
        kind: "rate-limited",
        resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : null,
      };
    }
    return { ok: false, kind: "error", message: `GitHub이 접근을 거부했습니다 (${response.status}).` };
  }
  if (!response.ok) {
    return { ok: false, kind: "error", message: `GitHub 응답 ${response.status}` };
  }

  const data = accept.includes("raw") ? await response.text() : await response.json();
  return { ok: true, data: data as T };
}

/* ---------- 응답에서 우리가 쓰는 부분만 ---------- */

export type RepoMeta = {
  defaultBranch: string;
  language: string | null;
  pushedAt: string | null;
  private: boolean;
};

type RepoResponse = {
  default_branch: string;
  language: string | null;
  pushed_at: string | null;
  private: boolean;
};

export async function fetchRepo(repo: string): Promise<GitHubResult<RepoMeta>> {
  const result = await call<RepoResponse>(`/repos/${repo}`);
  if (!result.ok) return result;
  return {
    ok: true,
    data: {
      defaultBranch: result.data.default_branch,
      language: result.data.language,
      pushedAt: result.data.pushed_at,
      private: result.data.private,
    },
  };
}

/** README 원문. 없으면 null — 없는 것은 실패가 아닙니다. */
export async function fetchReadme(repo: string): Promise<GitHubResult<string | null>> {
  const result = await call<string>(`/repos/${repo}/readme`, "application/vnd.github.raw");
  if (!result.ok) {
    if (result.kind === "not-found") return { ok: true, data: null };
    return result;
  }
  return { ok: true, data: result.data };
}

export type CommitInfo = {
  sha: string;
  message: string;
  author: string | null;
  committedAt: string;
  url: string;
};

type CommitResponse = {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string | null; date: string } | null };
  author: { login: string } | null;
};

/**
 * 커밋 — 최신순, 최대 `limit`개. 100개씩 페이지를 넘깁니다.
 * 홈의 역할 비율 차트가 전체 기록을 보므로 넉넉히 받고, 목록 화면은 그중 몇 개만 씁니다.
 */
export async function fetchCommits(repo: string, limit = 500): Promise<GitHubResult<CommitInfo[]>> {
  const out: CommitInfo[] = [];
  for (let page = 1; out.length < limit; page++) {
    const perPage = Math.min(100, limit - out.length);
    const result = await call<CommitResponse[]>(`/repos/${repo}/commits?per_page=${perPage}&page=${page}`);
    if (!result.ok) {
      // 커밋이 하나도 없는 빈 저장소는 409를 돌려줍니다. 빈 목록으로 봅니다.
      if (result.kind === "error" && result.message.includes("409")) return { ok: true, data: out };
      return result;
    }
    out.push(
      ...result.data.map((c) => ({
        sha: c.sha,
        // 커밋 메시지의 첫 줄만 씁니다 — 목록은 한 줄로 보여 줍니다.
        message: (c.commit.message ?? "").split("\n")[0],
        author: c.author?.login ?? c.commit.author?.name ?? null,
        committedAt: c.commit.author?.date ?? new Date().toISOString(),
        url: c.html_url,
      })),
    );
    if (result.data.length < perPage) break;
  }
  return { ok: true, data: out };
}

export type PullInfo = {
  number: number;
  title: string;
  state: "open" | "merged" | "closed";
  url: string;
  at: string;
};

type PullResponse = {
  number: number;
  title: string;
  state: string;
  merged_at: string | null;
  html_url: string;
  updated_at: string;
};

export async function fetchPulls(repo: string, limit = 20): Promise<GitHubResult<PullInfo[]>> {
  const result = await call<PullResponse[]>(
    `/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=${limit}`,
  );
  if (!result.ok) return result;
  return {
    ok: true,
    data: result.data.map((p) => ({
      number: p.number,
      title: p.title,
      // GitHub의 state는 open/closed 둘뿐입니다. 머지 여부는 merged_at으로 갈립니다.
      state: p.merged_at ? "merged" : p.state === "open" ? "open" : "closed",
      url: p.html_url,
      at: p.merged_at ?? p.updated_at,
    })),
  };
}
