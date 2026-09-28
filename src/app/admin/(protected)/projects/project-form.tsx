"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { REPO_PATTERN, SLUG_PATTERN, type ProjectStatus } from "@/lib/project-types";
import { checkSlug, deleteProject, saveProject, type ProjectInput } from "./actions";
import { syncProject } from "./sync";
import { REPO_LINK_BADGE, REPO_LINK_LABEL, type RepoLink } from "@/lib/project-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldRow,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type FormProject = ProjectInput;

/** 「새로 만들기 / 기존 연결」 — 명세의 2모드 세그먼트 */
type Mode = "create" | "connect";

type SlugState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok" }
  | { kind: "taken"; reason: string };

/** owner/repo 에서 저장소 이름만 뽑아 주소 후보로 씁니다. */
function slugFromRepo(repo: string): string {
  const name = repo.split("/")[1] ?? "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProjectForm({
  project,
  linkState,
  syncedAt,
}: {
  project: FormProject;
  linkState?: RepoLink;
  syncedAt?: string | null;
}) {
  const router = useRouter();
  const editing = project.originalSlug !== null;

  const [mode, setMode] = useState<Mode>(project.repo ? "connect" : "create");
  const [form, setForm] = useState(project);
  // 서버에 물어본 결과. 검사한 값을 함께 들고 있어야 입력이 바뀌었을 때 낡은 답을 안 씁니다.
  const [checked, setChecked] = useState<{ slug: string; available: boolean; reason?: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const set = <K extends keyof FormProject>(key: K, value: FormProject[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const slug = form.slug.trim();
  const slugWellFormed = SLUG_PATTERN.test(slug);

  // 주소 중복 검사 — 500ms 쉬면 물어봅니다.
  // 상태는 타임아웃 콜백에서만 바꿉니다(렌더 중 setState 금지).
  useEffect(() => {
    if (!slugWellFormed) return;
    const t = setTimeout(async () => {
      const result = await checkSlug(slug, form.originalSlug);
      setChecked({ slug, ...result });
    }, 500);
    return () => clearTimeout(t);
  }, [slug, slugWellFormed, form.originalSlug]);

  // 표시 상태는 렌더 중에 유도합니다 — 검사한 값과 지금 값이 다르면 아직 "확인 중"입니다.
  const slugState: SlugState = !slug
    ? { kind: "idle" }
    : !slugWellFormed
      ? { kind: "taken", reason: "영소문자·숫자·하이픈만 쓸 수 있습니다." }
      : checked?.slug !== slug
        ? { kind: "checking" }
        : checked.available
          ? { kind: "ok" }
          : { kind: "taken", reason: checked.reason ?? "이미 쓰이고 있는 주소입니다." };

  const repoValid = !form.repo.trim() || REPO_PATTERN.test(form.repo.trim());
  const canSave = Boolean(form.name.trim()) && slugState.kind === "ok" && repoValid && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await saveProject(form);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/admin/projects");
  }

  async function sync() {
    if (!form.originalSlug) return;
    setSyncing(true);
    setSyncNote(null);
    setError(null);
    const result = await syncProject(form.originalSlug);
    setSyncing(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSyncNote(
      `커밋 ${result.commits}건 · PR ${result.pulls}건${result.readme ? " · README" : ""} 가져왔습니다.` +
        (result.private && !form.repoPublic
          ? " 비공개 저장소라 공개 화면에는 보이지 않습니다."
          : ""),
    );
    router.refresh();
  }

  async function remove() {
    setConfirmOpen(false);
    if (!form.originalSlug) return;
    setBusy(true);
    const result = await deleteProject(form.originalSlug);
    setBusy(false);
    if (result.ok) router.push("/admin/projects");
    else setError(result.error ?? "지우지 못했습니다.");
  }

  return (
    <div className="editor">
      <header className="editor__head">
        <div className="editor__head-row">
          <p className="editor__crumb">
            <Link href="/admin/projects">← 프로젝트</Link>
          </p>
        </div>
        <h1 className="admin-head__title">{editing ? "프로젝트 편집" : "새 프로젝트"}</h1>

        {error && (
          <Alert variant="danger" className="mt-4 max-w-(--container-prose)">
            <AlertTitle>저장하지 못했습니다</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </header>

      {/* 2모드 세그먼트 — 새로 만들기 / 기존 연결 */}
      {!editing && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-6">
          <TabsList aria-label="만드는 방식">
            <TabsTrigger value="create">새로 만들기</TabsTrigger>
            <TabsTrigger value="connect">기존 저장소 연결</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <FieldGroup className="mt-6">
        {/* 연결 모드에서는 저장소를 먼저 묻고, 거기서 주소를 제안합니다 */}
        {(mode === "connect" || editing) && (
          <Field wide>
            <FieldLabel htmlFor="project-repo">GitHub 저장소</FieldLabel>
            <Input
              id="project-repo"
              value={form.repo}
              onChange={(e) => {
                const repo = e.target.value;
                set("repo", repo);
                // 아직 주소를 안 정했으면 저장소 이름에서 제안합니다
                if (!editing && !form.slug) {
                  const suggested = slugFromRepo(repo);
                  if (suggested) set("slug", suggested);
                }
              }}
              placeholder="owner/repo"
              aria-invalid={Boolean(form.repo.trim()) && !repoValid}
              className="font-mono text-[0.8125rem]"
            />
            {form.repo.trim() && !repoValid ? (
              <FieldError>owner/repo 형식이어야 합니다.</FieldError>
            ) : (
              <FieldDescription>
                적어 두기만 합니다. 실제로 읽어오는 것은 편집 화면의 「지금 가져오기」입니다.
              </FieldDescription>
            )}
          </Field>
        )}

        <Field wide>
          <FieldLabel htmlFor="project-name">이름</FieldLabel>
          <Input
            id="project-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="기록실 INDEX."
          />
        </Field>

        <Field wide>
          <FieldLabel htmlFor="project-slug">주소 (slug)</FieldLabel>
          <Input
            id="project-slug"
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="index-blog"
            aria-invalid={slugState.kind === "taken"}
            className="font-mono text-[0.8125rem]"
          />
          {/* 검사중 / 사용 가능 / 이미 있음 */}
          {slugState.kind === "taken" ? (
            <FieldError>{slugState.reason}</FieldError>
          ) : (
            <FieldDescription role="status" aria-live="polite">
              {slugState.kind === "checking" && "확인 중…"}
              {slugState.kind === "ok" && "사용 가능합니다"}
              {slugState.kind === "idle" && "/projects/주소 로 열립니다"}
            </FieldDescription>
          )}
        </Field>

        <Field wide>
          <FieldLabel htmlFor="project-description">한 줄 설명</FieldLabel>
          <Input
            id="project-description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="이 프로젝트가 무엇인지 한 줄로"
          />
        </Field>

        {/* 업로드 없이 참조만 — 이미 어딘가에 있는 이미지의 URL을 적습니다 */}
        <Field wide>
          <FieldLabel htmlFor="project-image">커버 이미지 URL</FieldLabel>
          <Input
            id="project-image"
            value={form.imageUrl}
            onChange={(e) => set("imageUrl", e.target.value)}
            placeholder="https://…"
            className="font-mono text-[0.8125rem]"
          />
          <FieldDescription>
            비워 두면 이미지 없이(지금과 같이) 보입니다. 16:9로 잘려 보이니 가로로 넉넉한 스크린샷이
            좋습니다.
          </FieldDescription>
        </Field>

        <Field wide>
          <FieldLabel htmlFor="project-site">사이트 링크</FieldLabel>
          <Input
            id="project-site"
            value={form.siteUrl}
            onChange={(e) => set("siteUrl", e.target.value)}
            placeholder="https://…"
            className="font-mono text-[0.8125rem]"
          />
          <FieldDescription>
            라이브 데모 등. 카드 우상단에 별도 바로가기로 뜹니다 — GitHub 저장소 링크와는
            다릅니다.
          </FieldDescription>
        </Field>

        {/* 비공개 저장소를 연결했을 때의 안전장치 */}
        <Field wide>
          <FieldLabel htmlFor="project-repo-public">저장소 내용 공개</FieldLabel>
          <FieldRow>
            <Checkbox
              id="project-repo-public"
              checked={form.repoPublic}
              onCheckedChange={(v) => set("repoPublic", v === true)}
            />
            <FieldLabel
              htmlFor="project-repo-public"
              className="font-sans text-sm tracking-normal text-text-2"
            >
              README·커밋·Pull Request를 공개 화면에 보입니다
            </FieldLabel>
          </FieldRow>
          <FieldDescription>
            {form.repoPublic
              ? "누구나 이 저장소의 README와 커밋 메시지를 봅니다."
              : "관리자에게만 보입니다. 비공개 저장소라면 이대로 두세요."}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="project-status">상태</FieldLabel>
          <Select value={form.status} onValueChange={(v) => set("status", v as ProjectStatus)}>
            <SelectTrigger id="project-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">진행 중</SelectItem>
              <SelectItem value="archived">보관됨</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      {/* 연결 확인 — 실패하면 상태가 「연결 안 됨」으로 내려가 눈에 보입니다 */}
      {editing && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-border bg-bg-subtle px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {linkState && (
              <Badge variant={REPO_LINK_BADGE[linkState]}>{REPO_LINK_LABEL[linkState]}</Badge>
            )}
            <span className="text-caption tabular-nums text-text-muted">
              {syncedAt
                ? `마지막 동기화 ${new Intl.DateTimeFormat("ko-KR", {
                    timeZone: "Asia/Seoul",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(syncedAt))}`
                : "아직 가져온 적 없음"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/projects/${form.originalSlug}/summarize`}>작업 요약</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void sync()}
              disabled={syncing || !form.repo.trim()}
            >
              {syncing ? "가져오는 중…" : "지금 가져오기"}
            </Button>
          </div>
        </div>
      )}

      {syncNote && (
        <p className="mt-3 text-sm text-text-2" role="status" aria-live="polite">
          {syncNote}
        </p>
      )}

      <div className="editor__actions">
        <p className="editor__hint">
          {mode === "connect" && !editing
            ? "저장소를 적어 두면 편집 화면의 「지금 가져오기」로 바로 읽어옵니다."
            : "저장소는 나중에 연결해도 됩니다."}
        </p>
        <div className="flex flex-wrap gap-2">
          {editing && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
            >
              지우기
            </Button>
          )}
          <Button type="button" onClick={() => void submit()} disabled={!canSave}>
            {busy ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>

      {/* 파괴적 액션이 기본값이 되지 않도록, 열릴 때 포커스는 「취소」에 둡니다 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>이 프로젝트를 지울까요?</DialogTitle>
            <DialogDescription>
              <strong className="font-semibold text-text">{form.name || form.slug}</strong> 과(와) 그
              저장소 캐시를 지웁니다. 이 프로젝트에 묶인 개발 일지는 남지만 프로젝트 줄이 사라집니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" autoFocus onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button type="button" variant="destructive" onClick={() => void remove()}>
              지우기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
