"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, mergeAttributes, Node, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { DropdownMenu, Popover } from "radix-ui";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Paperclip,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
} from "lucide-react";
import { COLORS, DEFAULT_SIZE, FONTS, SIZES, type RichDoc } from "@/lib/rich";
import { uploadMedia } from "@/components/portfolio/edit/edit-kit";

/**
 * 블로그형 에디터 — 쓰는 화면이 곧 결과 화면(.prose)입니다.
 *
 * 글꼴·크기·색은 자유 입력이 아니라 목록에서 고릅니다. 공개 화면 렌더러가 같은 목록
 * (`lib/rich.ts`)에 있는 값만 그리므로, 고를 수 있는 것과 보이는 것이 언제나 같습니다.
 * 이미지는 버튼·끌어다 놓기·붙여넣기 모두 Storage에 올린 뒤 주소를 넣습니다.
 */

/** 첨부 파일 — 본문 안의 다운로드 카드 한 줄 */
const Attachment = Node.create({
  name: "attachment",
  group: "block",
  atom: true,
  addAttributes() {
    return { href: { default: null }, name: { default: "첨부 파일" }, size: { default: null } };
  },
  parseHTML() {
    return [{ tag: "p[data-attachment]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      { "data-attachment": "", class: "prose__attachment" },
      ["a", mergeAttributes({ href: HTMLAttributes.href, download: HTMLAttributes.name }), `📎 ${HTMLAttributes.name}`],
    ];
  },
});

export function RichEditor({
  value,
  onChange,
  placeholder = "여기에 내용을 쓰세요. 이미지는 끌어다 놓거나 붙여넣어도 됩니다.",
  minHeight = "24rem",
}: {
  value: RichDoc | null;
  onChange: (doc: RichDoc) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (editor: Editor, files: File[]) => {
    for (const file of files) {
      setUploading((n) => n + 1);
      setError(null);
      try {
        if (file.type.startsWith("image/")) {
          const src = await uploadMedia(file, "images");
          editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, "") }).run();
        } else {
          const href = await uploadMedia(file, "files");
          editor
            .chain()
            .focus()
            .insertContent({ type: "attachment", attrs: { href, name: file.name, size: file.size } })
            .run();
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const editorRef = useRef<Editor | null>(null);
  const editor = useEditor({
    // 서버 렌더와 첫 렌더가 어긋나지 않게(Next.js) 마운트 뒤에 그립니다
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noreferrer noopener" } },
      }),
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder }),
      Attachment,
    ],
    content: value ?? undefined,
    editorProps: {
      attributes: { class: "prose rich-editor__content", style: `min-height:${minHeight}` },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.length === 0 || !editorRef.current) return false;
        event.preventDefault();
        void upload(editorRef.current, files);
        return true;
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length === 0 || !editorRef.current) return false;
        void upload(editorRef.current, files);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichDoc),
  });
  // 끌어다 놓기·붙여넣기 처리기(editorProps)가 만들어진 뒤의 에디터를 쓰도록 effect에서 넣어 둡니다
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  if (!editor) return <div className="rich-editor rich-editor--loading" style={{ minHeight }} />;

  return (
    <div className="rich-editor">
      <Toolbar editor={editor} onFiles={(files) => upload(editor, files)} uploading={uploading > 0} />
      {error && (
        <p className="rich-editor__error" role="alert">
          {error}
        </p>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

/* ---------- 도구 모음 ---------- */

function Toolbar({
  editor,
  onFiles,
  uploading,
}: {
  editor: Editor;
  onFiles: (files: File[]) => void;
  uploading: boolean;
}) {
  // 커서가 움직일 때마다 버튼의 켜짐 상태를 다시 읽습니다
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      code: e.isActive("codeBlock"),
      link: e.isActive("link"),
      table: e.isActive("table"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      h4: e.isActive("heading", { level: 4 }),
      align: (["center", "right"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
      font: (e.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
      size: (e.getAttributes("textStyle").fontSize as string | undefined) ?? "",
      color: (e.getAttributes("textStyle").color as string | undefined) ?? "",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const block = s.h2 ? "제목 1" : s.h3 ? "제목 2" : s.h4 ? "작은 제목" : "본문";
  const fontLabel = FONTS.find((f) => f.value === s.font)?.label ?? "기본 (고딕)";

  return (
    <div className="rich-toolbar" role="toolbar" aria-label="서식">
      <Group>
        <Btn label="실행 취소" onClick={() => chain().undo().run()} disabled={!s.canUndo}>
          <Undo2 />
        </Btn>
        <Btn label="다시 실행" onClick={() => chain().redo().run()} disabled={!s.canRedo}>
          <Redo2 />
        </Btn>
      </Group>

      <Group>
        <Menu label="문단 스타일" value={block} wide>
          <Item onSelect={() => chain().setParagraph().run()} active={block === "본문"}>
            <span style={{ fontSize: 15 }}>본문</span>
          </Item>
          <Item onSelect={() => chain().setHeading({ level: 2 }).run()} active={s.h2}>
            <span style={{ fontSize: 22, fontWeight: 700 }}>제목 1</span>
          </Item>
          <Item onSelect={() => chain().setHeading({ level: 3 }).run()} active={s.h3}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>제목 2</span>
          </Item>
          <Item onSelect={() => chain().setHeading({ level: 4 }).run()} active={s.h4}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>작은 제목</span>
          </Item>
        </Menu>

        <Menu label="글꼴" value={fontLabel} wide>
          {FONTS.map((f) => (
            <Item
              key={f.label}
              active={s.font === f.value}
              onSelect={() => (f.value ? chain().setFontFamily(f.value).run() : chain().unsetFontFamily().run())}
            >
              <span style={{ fontFamily: f.css }}>{f.label}</span>
            </Item>
          ))}
        </Menu>

        <Menu label="글자 크기" value={(s.size || DEFAULT_SIZE).replace("px", "")}>
          {SIZES.map((size) => (
            <Item
              key={size}
              active={(s.size || DEFAULT_SIZE) === size}
              onSelect={() =>
                size === DEFAULT_SIZE ? chain().unsetFontSize().run() : chain().setFontSize(size).run()
              }
            >
              <span style={{ fontSize: size, lineHeight: 1.2 }}>{size.replace("px", "")}</span>
            </Item>
          ))}
        </Menu>
      </Group>

      <Group>
        <Btn label="굵게 (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
          <Bold />
        </Btn>
        <Btn label="기울임 (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
          <Italic />
        </Btn>
        <Btn label="밑줄 (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
          <Underline />
        </Btn>
        <Btn label="취소선" active={s.strike} onClick={() => chain().toggleStrike().run()}>
          <Strikethrough />
        </Btn>
        <Menu
          label="글자색"
          value={<span className="rich-toolbar__swatch" style={{ background: s.color || "currentColor" }} />}
        >
          <div className="rich-toolbar__palette">
            {COLORS.map((c) => (
              <DropdownMenu.Item
                key={c.label}
                className="rich-toolbar__color"
                style={{ background: c.value || "var(--color-text)" }}
                aria-label={c.label}
                data-active={(s.color || "") === c.value || undefined}
                onSelect={() => (c.value ? chain().setColor(c.value).run() : chain().unsetColor().run())}
              />
            ))}
          </div>
        </Menu>
      </Group>

      <Group>
        <Menu
          label="정렬"
          value={s.align === "center" ? <AlignCenter /> : s.align === "right" ? <AlignRight /> : <AlignLeft />}
        >
          <Item active={s.align === "left"} onSelect={() => chain().setTextAlign("left").run()}>
            <AlignLeft size={16} /> 왼쪽
          </Item>
          <Item active={s.align === "center"} onSelect={() => chain().setTextAlign("center").run()}>
            <AlignCenter size={16} /> 가운데
          </Item>
          <Item active={s.align === "right"} onSelect={() => chain().setTextAlign("right").run()}>
            <AlignRight size={16} /> 오른쪽
          </Item>
        </Menu>
        <Btn label="글머리 목록" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
          <List />
        </Btn>
        <Btn label="번호 목록" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
          <ListOrdered />
        </Btn>
        <Btn label="인용" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
          <Quote />
        </Btn>
        <Btn label="코드 블록" active={s.code} onClick={() => chain().toggleCodeBlock().run()}>
          <Code2 />
        </Btn>
        <Btn label="구분선" onClick={() => chain().setHorizontalRule().run()}>
          <Minus />
        </Btn>
      </Group>

      <Group>
        <LinkButton editor={editor} active={s.link} />
        <Btn label={uploading ? "올리는 중…" : "이미지 넣기"} onClick={() => imageInput.current?.click()} disabled={uploading}>
          <ImagePlus />
        </Btn>
        <Btn label="파일 첨부" onClick={() => fileInput.current?.click()} disabled={uploading}>
          <Paperclip />
        </Btn>
        <Menu label="표" value={<Table2 />}>
          <Item onSelect={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            3 × 3 표 넣기
          </Item>
          {s.table && (
            <>
              <Item onSelect={() => chain().addRowAfter().run()}>아래에 행 추가</Item>
              <Item onSelect={() => chain().addColumnAfter().run()}>오른쪽에 열 추가</Item>
              <Item onSelect={() => chain().deleteRow().run()}>이 행 지우기</Item>
              <Item onSelect={() => chain().deleteColumn().run()}>이 열 지우기</Item>
              <Item onSelect={() => chain().deleteTable().run()}>표 지우기</Item>
            </>
          )}
        </Menu>
        {uploading && <span className="rich-toolbar__status">올리는 중…</span>}
      </Group>

      <input
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        multiple
        hidden
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.zip,.txt,.md,.docx,.xlsx,.pptx"
        multiple
        hidden
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="rich-toolbar__group">{children}</div>;
}

function Btn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="rich-toolbar__btn"
      aria-label={label}
      title={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      // 버튼을 눌러도 본문 선택이 풀리지 않게
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** 목록에서 고르는 메뉴 — 선택지가 실제 모양(글꼴·크기·색)대로 보입니다 */
function Menu({
  label,
  value,
  wide,
  children,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className={wide ? "rich-toolbar__menu rich-toolbar__menu--wide" : "rich-toolbar__menu"}
        aria-label={label}
        title={label}
      >
        <span className="rich-toolbar__menu-value">{value}</span>
        <ChevronDown aria-hidden="true" size={14} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="rich-menu"
          align="start"
          sideOffset={4}
          // 메뉴를 닫을 때 포커스를 버튼이 아니라 본문으로 돌려 바로 이어 쓰게
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenu.Label className="rich-menu__label">{label}</DropdownMenu.Label>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Item({
  onSelect,
  active,
  children,
}: {
  onSelect: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Item className="rich-menu__item" data-active={active || undefined} onSelect={onSelect}>
      {children}
    </DropdownMenu.Item>
  );
}

/** 링크 — 주소 입력칸이 붙은 작은 팝오버 */
function LinkButton({ editor, active }: { editor: Editor; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");

  const apply = () => {
    const url = href.trim();
    if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: /^(https?:|mailto:|\/|#)/.test(url) ? url : `https://${url}` })
        .run();
    setOpen(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setHref((editor.getAttributes("link").href as string | undefined) ?? "");
      }}
    >
      <Popover.Trigger
        className="rich-toolbar__btn"
        aria-label="링크"
        title="링크"
        aria-pressed={active}
        onMouseDown={(e) => e.preventDefault()}
      >
        <Link2 />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="rich-menu rich-menu--link" align="start" sideOffset={4}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply();
            }}
          >
            <label className="rich-menu__label" htmlFor="rich-link">
              링크 주소 (비우면 링크 해제)
            </label>
            <input
              id="rich-link"
              className="rich-menu__input"
              value={href}
              autoFocus
              placeholder="https://"
              onChange={(e) => setHref(e.target.value)}
            />
            <button type="submit" className="rich-menu__apply">
              적용
            </button>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
