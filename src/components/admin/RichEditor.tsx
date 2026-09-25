"use client";

import { useEffect, useRef } from "react";

/**
 * execCommand("fontSize") only accepts the legacy 1-7 scale, so we map each
 * wanted px size to a distinct legacy value, then immediately rewrite the
 * resulting <font size="n"> into <span style="font-size:Npx">. That keeps the
 * saved HTML clean and gives exact pixel control.
 */
const FONT_SIZES: { label: string; px: number; legacy: string }[] = [
  { label: "12px", px: 12, legacy: "1" },
  { label: "14px", px: 14, legacy: "2" },
  { label: "16px", px: 16, legacy: "3" },
  { label: "18px", px: 18, legacy: "4" },
  { label: "20px", px: 20, legacy: "5" },
  { label: "24px", px: 24, legacy: "6" },
  { label: "32px", px: 32, legacy: "7" },
];

const LEGACY_TO_PX: Record<string, number> = {
  "1": 12,
  "2": 14,
  "3": 16,
  "4": 18,
  "5": 20,
  "6": 24,
  "7": 32,
};

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

/** Rewrite the deprecated <font size>/<font face> tags execCommand emits into inline-styled spans. */
function normalizeFontTags(root: HTMLElement) {
  root.querySelectorAll("font").forEach((node) => {
    const fontEl = node as HTMLFontElement;
    const size = fontEl.getAttribute("size");
    const face = fontEl.getAttribute("face");
    if (!size && !face) return;
    const span = document.createElement("span");
    if (size) span.style.fontSize = `${LEGACY_TO_PX[size] ?? 16}px`;
    if (face) span.style.fontFamily = face;
    span.innerHTML = fontEl.innerHTML;
    fontEl.replaceWith(span);
  });
}

export default function RichEditor({
  value,
  onChange,
  placeholder,
  height = 220,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);

  // The editable div has no React-managed children, so the server-rendered
  // markup is an empty div on both sides (no hydration mismatch) and we can
  // safely fill it imperatively after mount and on external value changes.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const exec = (command: string, valueArg?: string) => {
    if (typeof document === "undefined") return;
    document.execCommand(command, false, valueArg);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  };

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const handleBlur = () => {
    // Remember where the caret/selection was, so toolbar widgets that steal
    // focus (native <select> dropdowns) can put it back before formatting.
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
    handleInput();
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (!sel || !savedRange.current || !ref.current) return;
    if (sel.rangeCount > 0 && ref.current.contains(sel.anchorNode)) return; // already inside
    sel.removeAllRanges();
    sel.addRange(savedRange.current);
  };

  const requireSelection = (): boolean => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      window.alert("请先用鼠标选中要设置的文字，再选择字号 / 字体。");
      return false;
    }
    return true;
  };

  const applyFontSize = (px: number) => {
    if (typeof document === "undefined" || !ref.current) return;
    restoreSelection();
    if (!requireSelection()) return;
    const legacy = FONT_SIZES.find((item) => item.px === px)?.legacy ?? "3";
    // Force the legacy <font> output so we always have something predictable
    // to normalize into an exact px span.
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("fontSize", false, legacy);
    normalizeFontTags(ref.current);
    onChange(ref.current.innerHTML);
    ref.current?.focus();
  };

  const applyFontFamily = (family: string) => {
    if (typeof document === "undefined" || !ref.current) return;
    restoreSelection();
    if (!requireSelection()) return;
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("fontName", false, family);
    normalizeFontTags(ref.current);
    onChange(ref.current.innerHTML);
    ref.current?.focus();
  };

  const insertHtml = (html: string) => {
    if (typeof document === "undefined") return;
    document.execCommand("insertHTML", false, html);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  };

  const promptLink = () => {
    const url = window.prompt("输入链接地址（http:// 或 /path）:", "https://");
    if (!url) return;
    const text = document.getSelection()?.toString() || url;
    insertHtml(`<a href="${url}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`);
  };

  const promptImage = () => {
    const url = window.prompt(
      "输入图片地址（可直接粘贴图床链接 https://...，不占网站空间）:",
      "https://",
    );
    if (!url) return;
    insertHtml(`<img src="${escapeHtml(url)}" alt="" style="max-width:100%;height:auto;" />`);
  };

  // Same as 上传文件 but the file stays on an external image host, so the
  // site's own storage does not grow.
  const promptRemoteFile = () => {
    const url = window.prompt(
      "输入图床文件地址（https://... 的 PDF / Word / Excel 链接）:",
      "https://",
    );
    if (!url) return;
    insertHtml(
      `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener">📎 ${escapeHtml(url)}</a></p>`,
    );
  };

  const insertQuoteTable = () => {
    const html = `
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:700px;">
        <thead>
          <tr style="background:#f9f9f9;">
            <th style="border:1px solid #ccc;text-align:left;">Specification / 规格</th>
            <th style="border:1px solid #ccc;text-align:left;">Unit / 单位</th>
            <th style="border:1px solid #ccc;text-align:left;">FOB Price / 参考价</th>
            <th style="border:1px solid #ccc;text-align:left;">Action / 操作</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #ccc;"> </td>
            <td style="border:1px solid #ccc;"> </td>
            <td style="border:1px solid #ccc;"> </td>
            <td style="border:1px solid #ccc;"><a href="/contact" target="_blank" rel="noopener" style="color:#e61d39;font-weight:bold;">Request Quote / 索取报价</a></td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    insertHtml(html);
  };

  const promptTable = () => {
    const rows = Number(window.prompt("行数:", "3"));
    const cols = Number(window.prompt("列数:", "3"));
    if (!rows || !cols) return;
    let html = "<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;width:100%;'><tbody>";
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) html += "<td style='border:1px solid #ccc;'> </td>";
      html += "</tr>";
    }
    html += "</tbody></table><p><br></p>";
    insertHtml(html);
  };

  const colorBtn = (title: string, command: string) => {
    const color = window.prompt(title, "#e61d39");
    if (color) exec(command, color);
  };

  const uploadFile = async (file: File, type: "image" | "doc") => {
    const folder = type === "image" ? "uploads/products" : "downloads";
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
    if (!data.ok) throw new Error(data.error || "上传失败");
    return data.url as string;
  };

  const handleFileUpload = async (type: "image" | "doc") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "image" ? "image/*" : ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await uploadFile(file, type);
        if (type === "image") {
          insertHtml(`<img src="${url}" alt="" style="max-width:100%;height:auto;" />`);
        } else {
          insertHtml(`<p><a href="${url}" target="_blank" rel="noopener">📎 ${escapeHtml(file.name)}</a></p>`);
        }
      } catch (e: any) {
        window.alert(e.message);
      }
    };
    input.click();
  };

  return (
    <div className="rounded border border-[#ddd] bg-white">
      <div className="flex flex-wrap gap-1 border-b border-[#eee] bg-[#fafafa] p-2">
        <ToolbarButton onClick={() => exec("undo")} label="回退" title="回退（撤销上一步）" />
        <ToolbarButton onClick={() => exec("redo")} label="重做" title="重做" />
        <span className="mx-1 w-px bg-[#ddd]" />
        <ToolbarButton onClick={() => exec("bold")} label="B" title="加粗" />
        <ToolbarButton onClick={() => exec("italic")} label="I" title="斜体" italic />
        <ToolbarButton onClick={() => exec("underline")} label="U" title="下划线" underline />
        <ToolbarButton onClick={() => exec("strikeThrough")} label="S" title="删除线" />
        <span className="mx-1 w-px bg-[#ddd]" />
        <ToolbarButton onClick={() => exec("formatBlock", "H2")} label="H2" title="二级标题" />
        <ToolbarButton onClick={() => exec("formatBlock", "H3")} label="H3" title="三级标题" />
        <ToolbarButton onClick={() => exec("formatBlock", "P")} label="P" title="段落" />
        <select
          className="rounded border border-[#ddd] bg-white px-1 py-1 text-[11px] text-[#555] outline-none hover:bg-[#f0f0f0]"
          defaultValue=""
          onChange={(event) => {
            const px = Number(event.currentTarget.value);
            event.currentTarget.value = "";
            if (px) applyFontSize(px);
          }}
          title="字号（先选中文字）"
        >
          <option value="">字号</option>
          {FONT_SIZES.map((item) => (
            <option key={item.px} value={item.px}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-[#ddd] bg-white px-1 py-1 text-[11px] text-[#555] outline-none hover:bg-[#f0f0f0]"
          defaultValue=""
          onChange={(event) => {
            const family = event.currentTarget.value;
            event.currentTarget.value = "";
            if (family) applyFontFamily(family);
          }}
          title="字体（先选中文字）"
        >
          <option value="">字体</option>
          {FONT_FAMILIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <span className="mx-1 w-px bg-[#ddd]" />
        <ToolbarButton onClick={() => exec("insertUnorderedList")} label="• 列表" title="无序列表" />
        <ToolbarButton onClick={() => exec("insertOrderedList")} label="1. 列表" title="有序列表" />
        <span className="mx-1 w-px bg-[#ddd]" />
        <ToolbarButton onClick={() => exec("justifyLeft")} label="左" title="左对齐" />
        <ToolbarButton onClick={() => exec("justifyCenter")} label="中" title="居中" />
        <ToolbarButton onClick={() => exec("justifyRight")} label="右" title="右对齐" />
        <span className="mx-1 w-px bg-[#ddd]" />
        <ToolbarButton onClick={() => colorBtn("文字颜色", "foreColor")} label="A" title="文字颜色" />
        <ToolbarButton onClick={() => colorBtn("背景颜色", "hiliteColor")} label="底" title="背景高亮" />
        <span className="mx-1 w-px bg-[#ddd]" />
        <ToolbarButton onClick={promptLink} label="链接" title="插入链接" />
        <ToolbarButton onClick={promptImage} label="图片" title="插入图片 URL" />
        <ToolbarButton onClick={() => handleFileUpload("image")} label="上传图" title="上传并插入图片" />
        <ToolbarButton onClick={() => handleFileUpload("doc")} label="上传文件" title="上传 PDF/Word 等并插入链接" />
        <ToolbarButton onClick={promptRemoteFile} label="图床文件" title="粘贴图床上的 PDF/Word 链接（不占网站空间）" />
        <ToolbarButton onClick={promptTable} label="表格" title="插入表格" />
        <ToolbarButton onClick={insertQuoteTable} label="报价表" title="插入报价表格模板" />
        <span className="mx-1 w-px bg-[#ddd]" />
        <ToolbarButton onClick={() => exec("removeFormat")} label="清除格式" title="清除格式" />
      </div>
      <div
        ref={ref}
        className="w-full min-w-0 overflow-auto p-3 text-[13px] leading-[22px] outline-none"
        style={{ height, minHeight: height }}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleBlur}
        data-placeholder={placeholder}
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  title,
  italic,
  underline,
}: {
  onClick: () => void;
  label: string;
  title: string;
  italic?: boolean;
  underline?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded border border-[#ddd] bg-white px-2 py-1 text-[11px] text-[#555] hover:bg-[#f0f0f0]"
    >
      <span style={{ fontStyle: italic ? "italic" : undefined, textDecoration: underline ? "underline" : undefined }}>
        {label}
      </span>
    </button>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
