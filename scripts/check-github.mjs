/**
 * GITHUB_TOKEN 이 실제로 저장소를 읽을 수 있는지 확인합니다.
 *
 *   node --env-file=.env.local scripts/check-github.mjs dongeul2/index-blog
 *
 * 토큰 값은 출력하지 않습니다. 무엇을 읽을 수 있는지만 보여 줍니다.
 */
const repo = process.argv[2];
const token = process.env.GITHUB_TOKEN;

if (!repo) {
  console.error("사용법: node --env-file=.env.local scripts/check-github.mjs owner/repo");
  process.exit(1);
}
if (!token) {
  console.error("GITHUB_TOKEN 이 .env.local 에 없습니다.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

let failed = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "  OK  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

async function get(path, accept) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: accept ? { ...headers, Accept: accept } : headers,
  });
  return { status: res.status, res };
}

// 1. 저장소 접근
const meta = await get(`/repos/${repo}`);
if (meta.status === 401) {
  check("토큰 유효", false, "401 — 만료되었거나 잘못된 토큰입니다");
  process.exit(1);
}
if (meta.status === 404) {
  check("저장소 접근", false, "404 — 이름이 틀렸거나 토큰 범위에 이 저장소가 없습니다");
  process.exit(1);
}
check("저장소 접근", meta.status === 200, `HTTP ${meta.status}`);

const repoData = await meta.res.json();
console.log(
  `        ${repo} · ${repoData.private ? "비공개" : "공개"} · 기본 브랜치 ${repoData.default_branch} · ${repoData.language ?? "언어 미상"}`,
);

// 2. README
const readme = await get(`/repos/${repo}/readme`, "application/vnd.github.raw");
check(
  "README 읽기",
  readme.status === 200 || readme.status === 404,
  readme.status === 404 ? "README 없음(정상)" : `HTTP ${readme.status}`,
);

// 3. 커밋
const commits = await get(`/repos/${repo}/commits?per_page=5`);
check("커밋 읽기", commits.status === 200, `HTTP ${commits.status}`);
if (commits.status === 200) {
  const list = await commits.res.json();
  console.log(`        커밋 ${list.length}건, 최근: ${list[0]?.commit?.message?.split("\n")[0] ?? "-"}`);
}

// 4. PR
const pulls = await get(`/repos/${repo}/pulls?state=all&per_page=5`);
check("Pull Request 읽기", pulls.status === 200, `HTTP ${pulls.status}`);
if (pulls.status === 200) {
  console.log(`        PR ${(await pulls.res.json()).length}건`);
}

// 5. 쓰기 권한이 없어야 정상입니다
const rate = await get("/rate_limit");
if (rate.status === 200) {
  const core = (await rate.res.json()).resources.core;
  console.log(`        남은 호출 ${core.remaining}/${core.limit}`);
}

console.log(failed === 0 ? "\n전부 통과" : `\n${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
