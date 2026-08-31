"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { REPO_PATTERN, SLUG_PATTERN, type ProjectStatus } from "@/lib/project-types";
import { checkSlug, deleteProject, saveProject, type ProjectInput } from "./actions";

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

export function ProjectForm({ project }: { project: FormProject }) {
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
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  async function remove() {
    dialogRef.current?.close();
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
          <div className="callout callout--warn editor__error" role="alert">
            <strong className="callout__label">저장하지 못했습니다</strong>
            <p>{error}</p>
          </div>
        )}
      </header>

      {/* 2모드 세그먼트 — 새로 만들기 / 기존 연결 */}
      {!editing && (
        <div className="segment" role="group" aria-label="만드는 방식">
          <button
            type="button"
            className="segment__option"
            aria-pressed={mode === "create"}
            onClick={() => setMode("create")}
          >
            새로 만들기
          </button>
          <button
            type="button"
            className="segment__option"
            aria-pressed={mode === "connect"}
            onClick={() => setMode("connect")}
          >
            기존 저장소 연결
          </button>
        </div>
      )}

      <div className="editor__meta">
        {/* 연결 모드에서는 저장소를 먼저 묻고, 거기서 주소를 제안합니다 */}
        {(mode === "connect" || editing) && (
          <label className="field field--wide">
            <span className="field__label">GitHub 저장소</span>
            <input
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
              className="field__input field__input--mono"
            />
            <span className="field__hint">
              {form.repo.trim() && !repoValid
                ? "owner/repo 형식이어야 합니다."
                : "적어 두기만 합니다. 실제로 읽어오는 것은 GitHub 토큰을 넣은 뒤입니다."}
            </span>
          </label>
        )}

        <label className="field field--wide">
          <span className="field__label">이름</span>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="기록실 INDEX."
            className="field__input"
          />
        </label>

        <label className="field field--wide">
          <span className="field__label">주소 (slug)</span>
          <input
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="index-blog"
            className="field__input field__input--mono"
          />
          {/* 검사중 / 사용 가능 / 이미 있음 */}
          <span className={`field__hint check--${slugState.kind}`} role="status" aria-live="polite">
            {slugState.kind === "checking" && "확인 중…"}
            {slugState.kind === "ok" && "사용 가능합니다"}
            {slugState.kind === "taken" && slugState.reason}
            {slugState.kind === "idle" && "/projects/주소 로 열립니다"}
          </span>
        </label>

        <label className="field field--wide">
          <span className="field__label">한 줄 설명</span>
          <input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="이 프로젝트가 무엇인지 한 줄로"
            className="field__input"
          />
        </label>

        <label className="field">
          <span className="field__label">상태</span>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as ProjectStatus)}
            className="field__input"
          >
            <option value="active">진행 중</option>
            <option value="archived">보관됨</option>
          </select>
        </label>
      </div>

      <div className="editor__actions">
        <p className="editor__hint">
          {mode === "connect" && !editing
            ? "저장소를 적어 두면 GitHub 연결 단계에서 바로 읽어옵니다."
            : "저장소는 나중에 연결해도 됩니다."}
        </p>
        <div className="editor__buttons">
          {editing && (
            <button
              type="button"
              className="editor__danger"
              onClick={() => dialogRef.current?.showModal()}
              disabled={busy}
            >
              지우기
            </button>
          )}
          <button
            type="button"
            className="editor__primary"
            onClick={() => void submit()}
            disabled={!canSave}
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      <dialog ref={dialogRef} className="modal elevated">
        <h2 className="modal__title">이 프로젝트를 지울까요?</h2>
        <p className="modal__body">
          <strong>{form.name || form.slug}</strong> 과(와) 그 저장소 캐시를 지웁니다. 이 프로젝트에
          묶인 개발 일지는 남지만 프로젝트 줄이 사라집니다.
        </p>
        <div className="modal__actions">
          <button type="button" autoFocus onClick={() => dialogRef.current?.close()}>
            취소
          </button>
          <button type="button" className="editor__danger" onClick={() => void remove()}>
            지우기
          </button>
        </div>
      </dialog>
    </div>
  );
}
