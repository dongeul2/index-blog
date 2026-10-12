/**
 * GitHub 저장소를 문서대로 맞춥니다 — 라벨(.github/labels.yml), 마일스톤·이슈(docs/ROADMAP.md),
 * main 브랜치 보호, 병합 방식, Actions 권한. `gh` CLI 인증을 그대로 씁니다.
 *
 *   node scripts/github-bootstrap.mjs           # 무엇을 할지 출력만 (기본)
 *   node scripts/github-bootstrap.mjs --apply   # 실제로 반영
 *   node scripts/github-bootstrap.mjs --apply --pr 1   # 완료 항목을 닫을 때 그 PR을 언급
 *
 * 여러 번 돌려도 안전합니다 — 이미 있는 라벨은 갱신, 같은 제목의 마일스톤·이슈는 건너뜁니다.
 * 완료(`- [x]`) 항목은 이슈를 만든 뒤 바로 닫아 기록만 남깁니다.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const PR = process.argv.includes("--pr") ? process.argv[process.argv.indexOf("--pr") + 1] : undefined;
const REQUIRED_CHECKS = ["Lint · Typecheck · Unit", "Build · E2E"];

const gh = (args, input) =>
  execFileSync("gh", args, { encoding: "utf8", input, stdio: ["pipe", "pipe", "inherit"] }).trim();
const ghJson = (args) => JSON.parse(gh(args) || "null");
const act = (label, fn) => {
  console.log(`${APPLY ? "→" : "(dry)"} ${label}`);
  if (APPLY) return fn();
};

const repo = ghJson(["repo", "view", "--json", "nameWithOwner"]).nameWithOwner;
console.log(`저장소: ${repo}${APPLY ? "" : "  — 미리보기 모드, --apply로 반영"}\n`);

/* ---------- 라벨 ---------- */
const labels = [...readFileSync(".github/labels.yml", "utf8").matchAll(
  /name:\s*"([^"]+)",\s*color:\s*"([0-9a-f]{6})",\s*description:\s*"([^"]*)"/g,
)].map(([, name, color, description]) => ({ name, color, description }));

const existingLabels = new Set(ghJson(["label", "list", "--limit", "200", "--json", "name"]).map((l) => l.name));
for (const l of labels) {
  act(`라벨 ${existingLabels.has(l.name) ? "갱신" : "생성"}: ${l.name}`, () =>
    gh(["label", "create", l.name, "--color", l.color, "--description", l.description, "--force"]),
  );
}

/* ---------- 마일스톤 · 이슈 ---------- */
const milestones = [];
for (const line of readFileSync("docs/ROADMAP.md", "utf8").split(/\r?\n/)) {
  const m = line.match(/^## (.+)$/);
  if (m) {
    milestones.push({ title: m[1].trim(), description: "", items: [] });
    continue;
  }
  const cur = milestones.at(-1);
  if (!cur) continue;
  const item = line.match(/^- \[( |x)\] (.+?)((?:\s+`[^`]+`)*)\s*$/);
  if (item) {
    const labelNames = [...item[3].matchAll(/`([^`]+)`/g)].map((x) => x[1]);
    cur.items.push({ done: item[1] === "x", title: item[2].trim(), labels: labelNames });
  } else if (line.trim() && !cur.items.length && !cur.description) {
    cur.description = line.trim();
  }
}

const existingMs = new Map(
  ghJson(["api", `repos/${repo}/milestones?state=all&per_page=100`]).map((m) => [m.title, m.number]),
);
const existingIssues = new Set(
  ghJson(["issue", "list", "--state", "all", "--limit", "500", "--json", "title"]).map((i) => i.title),
);

for (const ms of milestones) {
  if (!existingMs.has(ms.title)) {
    act(`마일스톤 생성: ${ms.title}`, () =>
      gh(["api", `repos/${repo}/milestones`, "-f", `title=${ms.title}`, "-f", `description=${ms.description}`]),
    );
  }
  for (const it of ms.items) {
    if (existingIssues.has(it.title)) continue;
    act(`  이슈${it.done ? "(완료)" : ""}: ${it.title}  [${it.labels.join(", ")}]`, () => {
      const url = gh([
        "issue", "create",
        "--title", it.title,
        "--body", `[docs/ROADMAP.md](../blob/main/docs/ROADMAP.md) · ${ms.title}`,
        "--milestone", ms.title,
        ...it.labels.flatMap((l) => ["--label", l]),
      ]);
      if (it.done) gh(["issue", "close", url, "--reason", "completed", "--comment", PR ? `#${PR}에서 완료` : "완료"]);
    });
  }
}

/* ---------- main 보호 ---------- */
const protection = {
  required_status_checks: { strict: true, contexts: REQUIRED_CHECKS },
  enforce_admins: false, // 혼자 운영 — 긴급 수정 때 관리자 우회를 남겨 둡니다
  required_pull_request_reviews: null,
  restrictions: null,
  required_linear_history: true,
  allow_force_pushes: false,
  allow_deletions: false,
};
act(`main 보호: 필수 검사 ${REQUIRED_CHECKS.join(", ")} · 선형 이력 · 강제 푸시 금지`, () => {
  try {
    gh(["api", "-X", "PUT", `repos/${repo}/branches/main/protection`, "--input", "-"], JSON.stringify(protection));
  } catch {
    // 무료 플랜의 비공개 저장소는 브랜치 보호를 쓸 수 없습니다(403). 나머지 단계는 계속합니다.
    console.warn("  ! main 보호 실패 — 비공개 저장소라면 공개로 바꾸거나 Pro 플랜이 필요합니다");
  }
});
act("병합 방식: 스쿼시만 · PR 제목을 커밋 제목으로 · 병합 후 브랜치 삭제", () =>
  gh([
    "api", "-X", "PATCH", `repos/${repo}`,
    "-F", "allow_squash_merge=true", "-F", "allow_merge_commit=false", "-F", "allow_rebase_merge=false",
    "-f", "squash_merge_commit_title=PR_TITLE", "-f", "squash_merge_commit_message=PR_BODY",
    "-F", "delete_branch_on_merge=true",
  ]),
);
act("Actions 권한: 기본 토큰은 읽기 전용 · 워크플로가 PR을 열 수 있게(release-please)", () =>
  gh([
    "api", "-X", "PUT", `repos/${repo}/actions/permissions/workflow`,
    "-f", "default_workflow_permissions=read", "-F", "can_approve_pull_request_reviews=true",
  ]),
);
