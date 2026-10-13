"use client";

import { useState } from "react";
import {
  SKILL_CATEGORIES,
  SKILL_CATEGORY_LABEL,
  type Experience,
  type Project,
  type Skill,
} from "@/lib/project-types";
import { deleteProject, saveProject, type ProjectInput } from "@/app/portfolio-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RichEditor } from "@/components/rich/rich-editor";
import { EditButton, EditPanel, ImageField, RowsField, useSave } from "./edit-kit";
import { useEditMode } from "./edit-mode";

/** 강조색 빠른 선택 — 흰 바탕·검은 바탕 모두에서 커버 프레임과 수치가 읽히는 색들 */
const ACCENTS = ["#E3A72F", "#4B3BFF", "#E5484D", "#12A594", "#3E63DD", "#D6409F", "#F76B15", "#46A758"];

const toForm = (p: Project | undefined, skills: Skill[]): ProjectInput => ({
  slug: p?.slug,
  name: p?.name ?? "",
  description: p?.description ?? "",
  overview: p?.overview ?? "",
  kind: p?.kind ?? "personal",
  experienceId: p?.experienceId ?? null,
  role: p?.role ?? "",
  periodStart: p?.periodStart?.slice(0, 7) ?? "",
  periodEnd: p?.periodEnd?.slice(0, 7) ?? "",
  teamSize: p?.teamSize ?? null,
  featured: p?.featured ?? false,
  confidential: p?.confidential ?? false,
  accent: p?.accent ?? "",
  imageUrl: p?.imageUrl ?? "",
  imageAlt: p?.imageAlt ?? "",
  gallery: p?.gallery ?? [],
  metrics: p?.metrics ?? [],
  decisions: p?.decisions ?? [],
  siteUrl: p?.siteUrl ?? "",
  repo: p?.repo ?? "",
  repoPublic: p?.repoPublic ?? true,
  skills: skills.map((s) => s.slug),
  story: p?.story ?? null,
});

/**
 * 프로젝트 하나의 「수정」, 또는 project 없이 쓰면 「프로젝트 추가」.
 * 주소(slug)는 묻지 않습니다 — 처음 저장할 때 이름으로 만들고 그 뒤로는 바뀌지 않습니다.
 */
export function ProjectEditor({
  project,
  projectSkills = [],
  allSkills,
  experiences,
}: {
  project?: Project;
  projectSkills?: Skill[];
  allSkills: Skill[];
  experiences: Experience[];
}) {
  const { editing } = useEditMode();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProjectInput>(() => toForm(project, projectSkills));
  const { run, pending, error } = useSave();

  if (!editing) return null;
  if (!open) {
    return (
      <EditButton
        onClick={() => {
          setForm(toForm(project, projectSkills));
          setOpen(true);
        }}
      >
        {project ? "이 프로젝트 수정" : "+ 프로젝트 추가"}
      </EditButton>
    );
  }

  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => setForm({ ...form, [k]: v });
  const toggleSkill = (slug: string) =>
    set("skills", form.skills.includes(slug) ? form.skills.filter((s) => s !== slug) : [...form.skills, slug]);

  return (
    <EditPanel
      title={project ? `「${project.name}」 고치기` : "새 프로젝트"}
      pending={pending}
      error={error}
      onCancel={() => setOpen(false)}
      onSubmit={() => run(() => saveProject(form), () => setOpen(false))}
      onDelete={project ? () => run(() => deleteProject(project.slug), () => setOpen(false)) : undefined}
    >
      <div className="edit-grid">
        <Group title="기본 정보">
          <label className="edit-field">
            <span className="edit-label">이름</span>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </label>
          <label className="edit-field">
            <span className="edit-label">한 줄 설명</span>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} />
            <span className="edit-hint">작은 카드와 검색 결과에 보입니다.</span>
          </label>
          <label className="edit-field edit-field--wide">
            <span className="edit-label">소개 글</span>
            <Textarea rows={4} value={form.overview} onChange={(e) => set("overview", e.target.value)} />
            <span className="edit-hint">대표 프로젝트 블록에 크게 보입니다. 2~4문장이 알맞습니다.</span>
          </label>
          <fieldset className="edit-field">
            <legend className="edit-label">구분</legend>
            <div className="edit-radios">
              {(["personal", "work"] as const).map((k) => (
                <label key={k}>
                  <input type="radio" name="kind" checked={form.kind === k} onChange={() => set("kind", k)} />
                  {k === "personal" ? "개인 프로젝트" : "회사 프로젝트"}
                </label>
              ))}
            </div>
          </fieldset>
          {form.kind === "work" && (
            <label className="edit-field">
              <span className="edit-label">어느 경력에서</span>
              <select
                className="edit-select"
                value={form.experienceId ?? ""}
                onChange={(e) => set("experienceId", e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">고르지 않음</option>
                {experiences.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.organization}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="edit-field">
            <span className="edit-label">맡은 일</span>
            <Input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="예: 기획 · 프론트엔드 · QA" />
          </label>
          <label className="edit-field">
            <span className="edit-label">시작한 달</span>
            <Input type="month" value={form.periodStart} onChange={(e) => set("periodStart", e.target.value)} />
          </label>
          <label className="edit-field">
            <span className="edit-label">끝난 달</span>
            <Input type="month" value={form.periodEnd} onChange={(e) => set("periodEnd", e.target.value)} />
            <span className="edit-hint">비우면 「진행 중」</span>
          </label>
          <label className="edit-field">
            <span className="edit-label">인원</span>
            <Input
              type="number"
              min={1}
              value={form.teamSize ?? ""}
              onChange={(e) => set("teamSize", e.target.value ? Number(e.target.value) : null)}
            />
          </label>
          <label className="edit-check">
            <Checkbox checked={form.featured} onCheckedChange={(v) => set("featured", v === true)} />
            대표 프로젝트로 크게 보이기
          </label>
          <label className="edit-check">
            <Checkbox checked={form.confidential} onCheckedChange={(v) => set("confidential", v === true)} />
            사내 기밀 — 이미지·링크를 숨기고 배지 표시
          </label>
        </Group>

        <Group title="이미지와 색">
          <div className="edit-field">
            <ImageField label="커버 이미지" value={form.imageUrl} onChange={(url) => set("imageUrl", url)} />
          </div>
          <div className="edit-field">
            <span className="edit-label">강조색</span>
            <div className="edit-swatches">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="edit-swatch"
                  style={{ background: c }}
                  aria-label={`강조색 ${c}`}
                  aria-pressed={form.accent.toLowerCase() === c.toLowerCase()}
                  onClick={() => set("accent", c)}
                />
              ))}
              <input
                type="color"
                className="edit-swatch edit-swatch--custom"
                value={form.accent || "#4B3BFF"}
                aria-label="직접 고르기"
                onChange={(e) => set("accent", e.target.value)}
              />
            </div>
            <span className="edit-hint">커버 테두리와 성과 숫자에 쓰입니다.</span>
            <label className="edit-field">
              <span className="edit-label">커버 이미지 설명 (화면을 볼 수 없는 사람을 위한 글)</span>
              <Input value={form.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} />
            </label>
          </div>
          <div className="edit-field edit-field--wide">
            <RowsField
              label="갤러리 (커버 아래 작은 이미지, 3장까지 보입니다)"
              addLabel="이미지 칸 추가"
              rows={form.gallery}
              blank={{ src: "", alt: "" }}
              onChange={(rows) => set("gallery", rows)}
              render={(row, setRow) => (
                <div className="edit-gallery-row">
                  <ImageField label="이미지" value={row.src} onChange={(src) => setRow({ ...row, src })} />
                  <Input
                    value={row.alt}
                    placeholder="이미지 설명"
                    onChange={(e) => setRow({ ...row, alt: e.target.value })}
                  />
                </div>
              )}
            />
          </div>
        </Group>

        <Group title="성과와 결정">
          <div className="edit-field edit-field--wide">
            <RowsField
              label="성과 수치"
              addLabel="수치 추가"
              rows={form.metrics}
              blank={{ label: "", value: "" }}
              onChange={(rows) => set("metrics", rows)}
              render={(row, setRow) => (
                <div className="edit-pair">
                  <Input value={row.value} placeholder="숫자 (예: -62%)" onChange={(e) => setRow({ ...row, value: e.target.value })} />
                  <Input value={row.label} placeholder="무엇의 (예: 빌드 시간)" onChange={(e) => setRow({ ...row, label: e.target.value })} />
                </div>
              )}
            />
          </div>
          <div className="edit-field edit-field--wide">
            <RowsField
              label="핵심 결정·한 일"
              addLabel="한 줄 추가"
              rows={form.decisions}
              blank={{ title: "" }}
              onChange={(rows) => set("decisions", rows)}
              render={(row, setRow) => (
                <Input
                  value={row.title}
                  placeholder="예: 공개 범위를 앱이 아니라 DB 정책으로 결정"
                  onChange={(e) => setRow({ ...row, title: e.target.value })}
                />
              )}
            />
          </div>
        </Group>

        <Group title="쓴 기술">
          <div className="edit-field edit-field--wide">
            {allSkills.length === 0 && <span className="edit-hint">먼저 역량 섹션에서 역량을 추가하세요.</span>}
            {SKILL_CATEGORIES.map((c) => {
              const items = allSkills.filter((s) => s.category === c);
              if (items.length === 0) return null;
              return (
                <div key={c} className="edit-skillgroup">
                  <span className="edit-hint">{SKILL_CATEGORY_LABEL[c]}</span>
                  <div className="edit-chips">
                    {items.map((s) => (
                      <button
                        key={s.slug}
                        type="button"
                        className="edit-chip"
                        aria-pressed={form.skills.includes(s.slug)}
                        onClick={() => toggleSkill(s.slug)}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Group>

        <Group title="상세 소개 (프로젝트 페이지 본문)">
          <div className="edit-field edit-field--wide">
            <span className="edit-hint">
              「자세히 보기」를 누르면 나오는 페이지의 본문입니다. 블로그 글처럼 제목·이미지·표·첨부 파일을 넣을 수 있습니다.
            </span>
            <RichEditor value={form.story} onChange={(story) => set("story", story)} minHeight="16rem" />
          </div>
        </Group>

        <Group title="링크">
          <label className="edit-field">
            <span className="edit-label">사이트 주소</span>
            <Input value={form.siteUrl} placeholder="https://" onChange={(e) => set("siteUrl", e.target.value)} />
          </label>
          <label className="edit-field">
            <span className="edit-label">GitHub 저장소</span>
            <Input value={form.repo} placeholder="dongeul2/index-blog" onChange={(e) => set("repo", e.target.value)} />
          </label>
          {form.repo && (
            <label className="edit-check">
              <Checkbox checked={form.repoPublic} onCheckedChange={(v) => set("repoPublic", v === true)} />
              저장소 코드·커밋을 공개 화면에 보이기
            </label>
          )}
        </Group>
      </div>
    </EditPanel>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="edit-group">
      <legend>{title}</legend>
      <div className="edit-grid">{children}</div>
    </fieldset>
  );
}
