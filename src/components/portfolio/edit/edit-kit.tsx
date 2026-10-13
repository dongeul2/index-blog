"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/app/portfolio-actions";
import { Button } from "@/components/ui/button";

/**
 * 홈 편집 도구의 공통 조각 — 패널, 저장 흐름, 이미지 올리기.
 */

/** 저장 → 성공하면 서버 데이터를 다시 받아 화면을 갱신 → onDone */
export function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = <T,>(action: () => Promise<ActionResult<T>>, onDone?: (data?: T) => void) => {
    setError(null);
    start(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      onDone?.(res.data);
    });
  };

  return { run, pending, error };
}

export function EditPanel({
  title,
  children,
  onSubmit,
  onCancel,
  onDelete,
  pending,
  error,
  submitLabel = "저장",
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  pending: boolean;
  error: string | null;
  submitLabel?: string;
}) {
  return (
    <form
      className="edit-panel"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <p className="edit-panel__title">{title}</p>
      <div className="edit-panel__body">{children}</div>
      {error && (
        <p className="edit-panel__error" role="alert">
          {error}
        </p>
      )}
      <div className="edit-panel__actions">
        <Button type="submit" disabled={pending}>
          {pending ? "저장하는 중…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          취소
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            className="ml-auto"
            disabled={pending}
            onClick={() => {
              if (confirm("정말 삭제할까요? 되돌릴 수 없습니다.")) onDelete();
            }}
          >
            삭제
          </Button>
        )}
      </div>
    </form>
  );
}

/** 섹션·항목 옆에 붙는 「수정」 버튼 */
export function EditButton({ onClick, children = "수정" }: { onClick: () => void; children?: React.ReactNode }) {
  return (
    <button type="button" className="edit-btn" onClick={onClick}>
      {children}
    </button>
  );
}

/* ---------- 파일 올리기 ---------- */

const MAX_BYTES = 10 * 1024 * 1024;

/** 브라우저에서 Storage로 바로 올립니다(서버 액션은 요청 크기 제한이 1MB라). 권한은 Storage RLS가 봅니다. */
export async function uploadMedia(file: File, folder: "images" | "files"): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("10MB보다 큰 파일은 올릴 수 없습니다.");
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
  const path = `${folder}/${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from("media").upload(path, file, {
    contentType: file.type || undefined,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`올리지 못했습니다: ${error.message}`);
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

/** 이미지 하나 — 미리보기 + 바꾸기/지우기. 끌어다 놓아도 됩니다 */
export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const take = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있습니다.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadMedia(file, "images"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="image-field">
      <span className="edit-label" id={`${id}-label`}>
        {label}
      </span>
      <div
        className="image-field__drop"
        data-busy={busy || undefined}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          take(e.dataTransfer.files[0]);
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- 편집 미리보기라 최적화가 필요 없습니다
          <img src={value} alt="" />
        ) : (
          <span className="image-field__empty">이미지를 끌어다 놓거나 아래 버튼으로 고르세요</span>
        )}
      </div>
      <div className="image-field__actions">
        <Button type="button" variant="outline" size="xs" disabled={busy} onClick={() => input.current?.click()}>
          <ImagePlus aria-hidden="true" />
          {busy ? "올리는 중…" : value ? "바꾸기" : "이미지 올리기"}
        </Button>
        {value && (
          <Button type="button" variant="destructive" size="xs" onClick={() => onChange("")}>
            <Trash2 aria-hidden="true" />
            빼기
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        hidden
        aria-labelledby={`${id}-label`}
        onChange={(e) => take(e.target.files?.[0])}
      />
      {error && <p className="edit-panel__error">{error}</p>}
    </div>
  );
}

/** 텍스트 줄 목록(성과, 핵심 결정 등) — 행 추가/삭제 */
export function RowsField<T>({
  label,
  rows,
  onChange,
  blank,
  render,
  addLabel,
}: {
  label: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  blank: T;
  render: (row: T, set: (next: T) => void) => React.ReactNode;
  addLabel: string;
}) {
  return (
    <fieldset className="rows-field">
      <legend className="edit-label">{label}</legend>
      {rows.map((row, i) => (
        <div key={i} className="rows-field__row">
          {render(row, (next) => onChange(rows.map((r, j) => (j === i ? next : r))))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${i + 1}번째 줄 지우기`}
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="xs" onClick={() => onChange([...rows, blank])}>
        + {addLabel}
      </Button>
    </fieldset>
  );
}
