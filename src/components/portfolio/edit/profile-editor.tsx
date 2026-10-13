"use client";

import { useState } from "react";
import type { Profile } from "@/lib/project-types";
import { saveProfile } from "@/app/portfolio-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EditButton, EditPanel, useSave } from "./edit-kit";
import { useEditMode } from "./edit-mode";

const FIELDS: { key: keyof Profile; label: string; hint?: string; long?: boolean }[] = [
  { key: "name", label: "이름" },
  { key: "nameLatin", label: "첫 화면에 그릴 이름", hint: "비우면 위의 이름을 씁니다. 영문이 선으로 그리기 가장 보기 좋습니다." },
  { key: "tagline", label: "하는 일 한 줄", hint: "예: 기획 · 개발 · QA · 운영" },
  { key: "intro", label: "소개 문장", long: true },
  { key: "birth", label: "생년월일", hint: "비우면 표시하지 않습니다" },
  { key: "location", label: "위치" },
  { key: "education", label: "학력" },
  { key: "email", label: "이메일" },
  { key: "github", label: "GitHub 아이디" },
];

/** 소개 섹션 머리의 「수정」 — 첫 화면과 표제란에 쓰이는 값을 한 번에 고칩니다 */
export function ProfileEditor({ profile }: { profile: Profile }) {
  const { editing } = useEditMode();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(profile);
  const { run, pending, error } = useSave();

  if (!editing) return null;
  if (!open) {
    return (
      <EditButton
        onClick={() => {
          setForm(profile);
          setOpen(true);
        }}
      >
        인적 사항 수정
      </EditButton>
    );
  }

  return (
    <EditPanel
      title="인적 사항"
      pending={pending}
      error={error}
      onCancel={() => setOpen(false)}
      onSubmit={() => run(() => saveProfile(form), () => setOpen(false))}
    >
      <div className="edit-grid">
        {FIELDS.map((f) => (
          <label key={f.key} className={f.long ? "edit-field edit-field--wide" : "edit-field"}>
            <span className="edit-label">{f.label}</span>
            {f.long ? (
              <Textarea
                rows={3}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            ) : (
              <Input value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            )}
            {f.hint && <span className="edit-hint">{f.hint}</span>}
          </label>
        ))}
      </div>
    </EditPanel>
  );
}
