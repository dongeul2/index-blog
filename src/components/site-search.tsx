"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Highlighted } from "./highlighted";
import { KIND_LABEL, searchIndex, type SearchItem } from "@/lib/search-index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** 마지막 줄은 결과 페이지로 넘어가는 동작입니다. */
type Row = (SearchItem & { all?: false }) | { all: true; href: string; title: string };

const MAX_PER_KIND = 4;

export function SiteSearch({ index }: { index: SearchItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // 250ms 디바운스
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 바깥 클릭으로 닫기
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const posts = searchIndex(index, debounced, "post");
  const projects = searchIndex(index, debounced, "project");
  const totalHits = posts.length + projects.length;

  const rows: Row[] = [
    ...posts.slice(0, MAX_PER_KIND),
    ...projects.slice(0, MAX_PER_KIND),
  ];

  if (totalHits > 0) {
    rows.push({
      all: true,
      href: `/search?q=${encodeURIComponent(debounced)}`,
      title: `결과 ${totalHits}건 모두 보기`,
    });
  }

  const clamped = Math.min(active, Math.max(rows.length - 1, 0));

  function close() {
    setOpen(false);
    triggerRef.current?.focus(); // ESC는 트리거로 포커스 복귀
  }

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (rows.length ? (a + 1) % rows.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (rows.length ? (a - 1 + rows.length) % rows.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // 결과가 없어도 ↵는 결과 페이지로 보냅니다 — 거기서 검색어를 고칠 수 있습니다.
      if (rows[clamped]) go(rows[clamped].href);
      else if (debounced) go(`/search?q=${encodeURIComponent(debounced)}`);
    }
  }

  return (
    <div className="search" ref={rootRef}>
      <Button
        type="button"
        ref={triggerRef}
        variant="ghost"
        size="xs"
        className="gap-2 border-border text-text-2 hover:border-border-strong"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        검색 <span aria-hidden="true">⌘K</span>
        <span className="sr-only">, 단축키 커맨드 K</span>
      </Button>

      {open && (
        <div className="search__panel">
          <Input
            ref={inputRef}
            className="h-11 border-accent text-base"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={rows[clamped] ? `${listId}-${clamped}` : undefined}
            aria-label="글과 프로젝트 검색"
            placeholder="글 제목, 태그, 프로젝트"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
          />

          <ul className="search__list" id={listId} role="listbox" aria-label="검색 결과">
            {rows.map((row, i) => (
              <li
                key={row.href}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === clamped}
                className={row.all ? "search__option search__option--all" : "search__option"}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(row.href)}
              >
                <span className="search__option__title">
                  <Highlighted text={row.title} query={row.all ? "" : debounced} />
                </span>
                {!row.all && (
                  <span className="search__option__note">
                    <span className="sr-only">, 종류: {KIND_LABEL[row.kind]}, </span>
                    {row.note}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {debounced && totalHits === 0 && (
            <p className="search__empty" role="status">
              &lsquo;{debounced}&rsquo;와 일치하는 글이 없습니다
            </p>
          )}
        </div>
      )}
    </div>
  );
}
