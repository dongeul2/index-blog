"use client";

import { useState } from "react";
import type { Experience } from "@/lib/project-types";
import { deleteExperience, saveExperience, type ExperienceInput } from "@/app/portfolio-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { EditButton, EditPanel, RowsField, useSave } from "./edit-kit";
import { useEditMode } from "./edit-mode";

const toForm = (e?: Experience): ExperienceInput => ({
  id: e?.id,
  organization: e?.organization ?? "",
  title: e?.title ?? "",
  periodStart: e?.periodStart.slice(0, 7) ?? "",
  periodEnd: e?.periodEnd?.slice(0, 7) ?? "",
  summary: e?.summary ?? "",
  highlights: e?.highlights ?? [],
  confidential: e?.confidential ?? false,
});

/** 경력 항목 하나의 「수정」, 또는 experience 없이 쓰면 「경력 추가」 */
export function ExperienceEditor({ experience }: { experience?: Experience }) {
  const { editing } = useEditMode();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExperienceInput>(toForm(experience));
  const { run, pending, error } = useSave();

  if (!editing) return null;
  if (!open) {
    return (
      <EditButton
        onClick={() => {
          setForm(toForm(experience));
          setOpen(true);
        }}
      >
        {experience ? "수정" : "+ 경력 추가"}
      </EditButton>
    );
  }

  const set = <K extends keyof ExperienceInput>(k: K, v: ExperienceInput[K]) => setForm({ ...form, [k]: v });

  return (
    <EditPanel
      title={experience ? `「${experience.organization}」 고치기` : "새 경력"}
      pending={pending}
      error={error}
      onCancel={() => setOpen(false)}
      onSubmit={() => run(() => saveExperience(form), () => setOpen(false))}
      onDelete={experience ? () => run(() => deleteExperience(experience.id), () => setOpen(false)) : undefined}
    >
      <div className="edit-grid">
        <label className="edit-field">
          <span className="edit-label">회사</span>
          <Input value={form.organization} onChange={(e) => set("organization", e.target.value)} />
          <span className="edit-hint">공개하기 어려우면 「핀테크 스타트업」처럼 적으세요.</span>
        </label>
        <label className="edit-field">
          <span className="edit-label">직함·역할</span>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
        </label>
        <label className="edit-field">
          <span className="edit-label">시작한 달</span>
          <Input type="month" value={form.periodStart} onChange={(e) => set("periodStart", e.target.value)} />
        </label>
        <label className="edit-field">
          <span className="edit-label">끝난 달</span>
          <Input type="month" value={form.periodEnd} onChange={(e) => set("periodEnd", e.target.value)} />
          <span className="edit-hint">비우면 「재직 중」으로 표시됩니다.</span>
        </label>
        <label className="edit-field edit-field--wide">
          <span className="edit-label">한두 문장 요약</span>
          <Textarea rows={3} value={form.summary} onChange={(e) => set("summary", e.target.value)} />
        </label>
        <div className="edit-field edit-field--wide">
          <RowsField
            label="주요 성과"
            addLabel="성과 추가"
            rows={form.highlights}
            blank=""
            onChange={(rows) => set("highlights", rows)}
            render={(row, setRow) => (
              <Input value={row} onChange={(e) => setRow(e.target.value)} placeholder="예: 결제 전환율 18% 개선" />
            )}
          />
        </div>
        <label className="edit-check">
          <Checkbox checked={form.confidential} onCheckedChange={(v) => set("confidential", v === true)} />
          사내 기밀 — 공개 가능한 범위만 적었다고 표시
        </label>
      </div>
    </EditPanel>
  );
}
