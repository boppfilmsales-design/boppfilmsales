"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import type { CommandProps } from "@tiptap/core";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import { FontFamily } from "@tiptap/extension-font-family";
import { sanitizeRichHtml } from "@/lib/rich-text";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (px: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

/**
 * `font-size` is not a built-in TipTap mark, so we extend `TextStyle` with an
 * extra `fontSize` attribute and a `setFontSize` command. Registering this one
 * also registers the underlying `textStyle` mark, which `@tiptap/extension-color`
 * depends on — so do NOT add plain `TextStyle` to the extension list as well
 * (that would be a duplicate-registration error).
 */
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.fontSize?.replace("px", "") || null,
        renderHTML: (attrs: Record<string, string | null>) =>
          attrs.fontSize ? { style: `font-size: ${attrs.fontSize}px` } : {},
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setFontSize:
        (px: string) =>
        ({ chain }: CommandProps) =>
          chain().setMark("textStyle", { fontSize: px }).run(),
      unsetFontSize:
        () =>
        ({ chain }: CommandProps) =>
          chain().unsetMark("textStyle").run(),
    };
  },
});

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "微软雅黑", value: "'Microsoft YaHei', 'PingFang SC', sans-serif" },
  { label: "宋体", value: "SimSun, 'Songti SC', serif" },
  { label: "黑体", value: "SimHei, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
];

/** A single toolbar button. `type="button"` is mandatory: every admin field is
 *  wrapped in a <form>, so a default-type button would submit the form. */
function TB({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      className={`flex h-[28px] min-w-[28px] items-center justify-center rounded border px-[7px] text-[12px] leading-none transition ${
        active
          ? "border-[#c8102e] bg-[#c8102e] text-white"
          : "border-[#d9dde3] bg-white text-[#444] hover:border-[#c8102e] hover:text-[#c8102e]"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-[20px] w-px shrink-0 bg-[#e3e6ea]" />;
}

export default function RichEditor({
  value,
  onChange,
  placeholder,
  height = 400,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  height?: number;
}) {
  const [foreColor, setForeColor] = useState("#e61d39");
  const [hiliteColor, setHiliteColor] = useState("#fff799");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(value || "");
  const [charCount, setCharCount] = useState(0);
  const [fontSize, setFontSizeState] = useState("16");
  const [fontFamily, setFontFamilyState] = useState(FONT_FAMILIES[0].value);
  const imageInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  // Keep the latest callbacks in refs so the editor is never torn down and
  // rebuilt just because the parent re-rendered with a new inline arrow.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // StarterKit v3 already ships Link + Underline; registering them again
        // would be a duplicate-extension error.
        link: false,
        underline: false,
      }),
      Underline,
      FontSize,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CharacterCount,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "rich-editor-content",
        style: `min-height:${height}px;padding:12px;outline:none;`,
      },
      // Word / legacy-site pastes carry fixed heights, /qzone/ background
      // images and absolute positioning — strip them on the way in.
      transformPastedHTML: (html) => sanitizeRichHtml(html),
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChangeRef.current(html);
      setCharCount(ed.storage.characterCount.characters());
    },
    immediatelyRender: false,
  });

  // Re-sync when the parent swaps in a different record (e.g. opening another
  // product in the same mounted form).
  useEffect(() => {
    if (!editor) return;
    if (typeof value === "string" && value !== editor.getHTML()) {
      // `emitUpdate: false` keeps this from echoing back through onUpdate →
      // onChange → parent state → this effect (an infinite loop).
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  const uploadFile = useCallback(async (file: File, type: "image" | "doc") => {
    const folder = type === "image" ? "uploads/products" : "downloads";
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
    if (!data.ok) throw new Error(data.error || "上传失败");
    return data.url as string;
  }, []);

  const onPickImage = async (file: File) => {
    if (!editor) return;
    try {
      const url = await uploadFile(file, "image");
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (err) {
      window.alert((err as Error).message || "图片上传失败");
    }
  };

  const onPickDoc = async (file: File) => {
    if (!editor) return;
    try {
      const url = await uploadFile(file, "doc");
      editor
        .chain()
        .focus()
        .insertContent(`<p><a href="${url}" target="_blank" rel="noopener">${file.name}</a></p>`)
        .run();
    } catch (err) {
      window.alert((err as Error).message || "文件上传失败");
    }
  };

  const insertRemoteLink = () => {
    if (!editor) return;
    const url = window.prompt("请输入图床 / 文件链接地址（http 或 https 开头）");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.alert("链接必须以 http:// 或 https:// 开头");
      return;
    }
    const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
    if (isImage) {
      editor.chain().focus().setImage({ src: url }).run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent(`<p><a href="${url}" target="_blank" rel="noopener">${url}</a></p>`)
        .run();
    }
  };

  const insertLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("链接地址（留空则移除链接）", previous || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const applySource = () => {
    if (!editor) return;
    editor.commands.setContent(sourceHtml || "", { emitUpdate: false });
    onChangeRef.current(sourceHtml || "");
    setShowSource(false);
  };

  const openSource = () => {
    if (!editor) return;
    setSourceHtml(editor.getHTML());
    setShowSource(true);
  };

  const body = (
    <div
      className={`rounded border border-[#d9dde3] bg-white ${
        isFullscreen ? "fixed inset-0 z-[999] flex flex-col overflow-auto p-4" : ""
      }`}
      ref={undefined}
    >
      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-[#e6e9ed] bg-[#fafbfc] px-2 py-[6px]">
        <TB disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()} title="回退">
          回退
        </TB>
        <TB disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()} title="重做">
          重做
        </TB>
        <Divider />

        <TB active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} title="加粗">
          <b>B</b>
        </TB>
        <TB active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} title="斜体">
          <i>I</i>
        </TB>
        <TB active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="下划线">
          <u>U</u>
        </TB>
        <TB active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()} title="删除线">
          <s>S</s>
        </TB>
        <Divider />

        <TB active={editor?.isActive("paragraph")} onClick={() => editor?.chain().focus().setParagraph().run()} title="正文">
          正文
        </TB>
        <TB
          active={editor?.isActive("heading", { level: 2 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          title="标题 H2"
        >
          H2
        </TB>
        <TB
          active={editor?.isActive("heading", { level: 3 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          title="标题 H3"
        >
          H3
        </TB>
        <Divider />

        <TB
          active={editor?.isActive({ textAlign: "left" })}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          title="左对齐"
        >
          ⇤
        </TB>
        <TB
          active={editor?.isActive({ textAlign: "center" })}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          title="居中"
        >
          ↔
        </TB>
        <TB
          active={editor?.isActive({ textAlign: "right" })}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          title="右对齐"
        >
          ⇥
        </TB>
        <Divider />

        <TB
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="无序列表"
        >
          • 列表
        </TB>
        <TB
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          title="有序列表"
        >
          1. 列表
        </TB>
        <TB active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="引用">
          ❝
        </TB>
        <Divider />

        <TB onClick={insertLink} title="插入 / 编辑链接">
          🔗 链接
        </TB>
        <TB onClick={() => imageInput.current?.click()} title="上传图片">
          🖼 图片
        </TB>
        <TB onClick={() => docInput.current?.click()} title="上传 PDF / 文档">
          📎 文档
        </TB>
        <TB onClick={insertRemoteLink} title="图床链接地址">
          ☁ 图床
        </TB>
        <TB
          onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="插入表格"
        >
          ▦ 表格
        </TB>
        <Divider />

        {/* 字号 */}
        <select
          className="h-[28px] rounded border border-[#d9dde3] bg-white px-1 text-[12px]"
          onChange={(e) => {
            const px = e.target.value;
            setFontSizeState(px);
            editor?.chain().focus().setFontSize(px).run();
          }}
          title="字号"
          value={fontSize}
        >
          {FONT_SIZES.map((px) => (
            <option key={px} value={String(px)}>
              {px}px
            </option>
          ))}
        </select>

        {/* 字体 */}
        <select
          className="h-[28px] max-w-[130px] rounded border border-[#d9dde3] bg-white px-1 text-[12px]"
          onChange={(e) => {
            const v = e.target.value;
            setFontFamilyState(v);
            editor?.chain().focus().setFontFamily(v).run();
          }}
          title="字体"
          value={fontFamily}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <Divider />

        {/* 字体颜色 / 背景颜色 */}
        <label className="flex h-[28px] items-center gap-1 rounded border border-[#d9dde3] bg-white px-[6px] text-[12px]" title="字体颜色">
          A
          <input
            className="h-[20px] w-[26px] cursor-pointer border-0 bg-transparent p-0"
            onChange={(e) => {
              setForeColor(e.target.value);
              editor?.chain().focus().setColor(e.target.value).run();
            }}
            type="color"
            value={foreColor}
          />
        </label>
        <label className="flex h-[28px] items-center gap-1 rounded border border-[#d9dde3] bg-white px-[6px] text-[12px]" title="背景颜色">
          底
          <input
            className="h-[20px] w-[26px] cursor-pointer border-0 bg-transparent p-0"
            onChange={(e) => {
              setHiliteColor(e.target.value);
              editor?.chain().focus().setHighlight({ color: e.target.value }).run();
            }}
            type="color"
            value={hiliteColor}
          />
        </label>
        <TB onClick={() => editor?.chain().focus().unsetColor().run()} title="清除字体颜色">
          ✕色
        </TB>
        <TB onClick={() => editor?.chain().focus().unsetHighlight().run()} title="清除背景颜色">
          ✕底
        </TB>
        <TB onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} title="清除格式">
          清除格式
        </TB>
        <Divider />

        <TB active={showSource} onClick={() => (showSource ? applySource() : openSource())} title="HTML 源码">
          &lt;/&gt; 源码
        </TB>
        <TB active={isFullscreen} onClick={() => setIsFullscreen((v) => !v)} title="全屏（Esc 退出）">
          {isFullscreen ? "退出全屏" : "全屏"}
        </TB>
      </div>

      {/* ── Editing area ──────────────────────────────────────── */}
      {showSource ? (
        <div className="p-2">
          <textarea
            className="h-[320px] w-full resize-y rounded border border-[#d9dde3] p-3 font-mono text-[12px] leading-[20px] outline-none focus:border-[#c8102e]"
            onChange={(e) => setSourceHtml(e.target.value)}
            placeholder={placeholder || "请输入内容…"}
            value={sourceHtml}
          />
          <div className="mt-2 flex gap-2">
            <button
              className="rounded bg-[#c8102e] px-4 py-[6px] text-[12px] font-bold text-white hover:bg-[#a30d25]"
              onClick={applySource}
              type="button"
            >
              应用源码
            </button>
            <button
              className="rounded border border-[#d9dde3] px-4 py-[6px] text-[12px] text-[#444] hover:border-[#c8102e] hover:text-[#c8102e]"
              onClick={() => setShowSource(false)}
              type="button"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}

      <div className="flex items-center justify-between border-t border-[#eef0f3] px-3 py-[5px] text-[11px] text-[#8a8a8a]">
        <span>{charCount} 字符</span>
        <span>支持 Word 粘贴自动清理 · Esc 退出全屏</span>
      </div>

      <input
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPickImage(f);
          e.target.value = "";
        }}
        ref={imageInput}
        type="file"
      />
      <input
        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPickDoc(f);
          e.target.value = "";
        }}
        ref={docInput}
        type="file"
      />
    </div>
  );

  return body;
}
