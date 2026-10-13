"use client";

import { useState } from "react";
import {
  SKILL_CATEGORIES,
  SKILL_CATEGORY_LABEL,
  type Skill,
  type SkillCategory,
} from "@/lib/project-types";
import { deleteSkill, saveSkill } from "@/app/portfolio-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EditPanel, useSave } from "./edit-kit";
import { useEditMode } from "./edit-mode";

/**
 * 역량 편집 — 편집 모드에서 범례 아래에 붙습니다.
 * 추가는 이름과 분류만 고르면 끝(주소용 슬러그는 서버가 이름으로 만듭니다).
 * 기존 역량은 목록에서 눌러 이름·분류·설명을 고치거나 지웁니다.
 */
export function SkillsEditor({ skills }: { skills: Skill[] }) {
  const { editing } = useEditMode();
  const [selected, setSelected] = useState<Skill | null>(null);
  const [draft, setDraft] = useState({ name: "", category: "frontend" as SkillCategory });
  const add = useSave();

  if (!editing) return null;

  return (
    <div className="skills-editor">
      <form
        className="skills-editor__add"
        onSubmit={(e) => {
          e.preventDefault();
          add.run(
            () => saveSkill({ name: draft.name, category: draft.category, description: "" }),
            () => setDraft({ ...draft, name: "" }),
          );
        }}
      >
        <span className="edit-label">역량 추가</span>
        <Input
          placeholder="예: React Query"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          aria-label="새 역량 이름"
        />
        <CategorySelect value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
        <Button type="submit" disabled={add.pending || !draft.name.trim()}>
          {add.pending ? "추가하는 중…" : "추가"}
        </Button>
        {add.error && <p className="edit-panel__error">{add.error}</p>}
      </form>

      <div className="skills-editor__list">
        <span className="edit-label">고치거나 지울 역량을 누르세요</span>
        <ul>
          {skills.map((s) => (
            <li key={s.slug}>
              <button
                type="button"
                className="edit-chip"
                aria-pressed={selected?.slug === s.slug}
                onClick={() => setSelected(s)}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected && <SkillForm key={selected.slug} skill={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SkillForm({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  const [form, setForm] = useState(skill);
  const { run, pending, error } = useSave();
  return (
    <EditPanel
      title={`「${skill.name}」 고치기`}
      pending={pending}
      error={error}
      onCancel={onClose}
      onSubmit={() => run(() => saveSkill(form), onClose)}
      onDelete={() => run(() => deleteSkill(skill.slug), onClose)}
    >
      <div className="edit-grid">
        <label className="edit-field">
          <span className="edit-label">이름</span>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="edit-field">
          <span className="edit-label">분류</span>
          <CategorySelect value={form.category} onChange={(category) => setForm({ ...form, category })} />
        </label>
        <label className="edit-field edit-field--wide">
          <span className="edit-label">설명 (마우스를 올리면 보이는 한 줄)</span>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
      </div>
    </EditPanel>
  );
}

/** 네이티브 select — 목록이 짧고, 모바일에서 OS 선택기가 가장 편합니다 */
export function CategorySelect({
  value,
  onChange,
}: {
  value: SkillCategory;
  onChange: (v: SkillCategory) => void;
}) {
  return (
    <select
      className="edit-select"
      value={value}
      aria-label="분류"
      onChange={(e) => onChange(e.target.value as SkillCategory)}
    >
      {SKILL_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {SKILL_CATEGORY_LABEL[c]}
        </option>
      ))}
    </select>
  );
}
