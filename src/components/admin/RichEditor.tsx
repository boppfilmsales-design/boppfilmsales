"use client";

import { useEffect, useRef, useState } from "react";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value, mounted]);

  const exec = (command: string, valueArg?: string) => {
    if (typeof document === "undefined") return;
    document.execCommand(command, false, valueArg);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  };

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
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
    const url = window.prompt("输入图片地址（http:// 或 /uploads/...）:", "/uploads/products/");
    if (!url) return;
    insertHtml(`<img src="${url}" alt="" style="max-width:100%;height:auto;" />`);
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

  if (!mounted) {
    return <div className="h-[200px] animate-pulse rounded border border-[#ddd] bg-[#f9f9f9]" />;
  }

  return (
    <div className="rounded border border-[#ddd] bg-white">
      <div className="flex flex-wrap gap-1 border-b border-[#eee] bg-[#fafafa] p-2">
        <ToolbarButton onClick={() => exec("bold")} label="B" title="加粗" />
        <ToolbarButton onClick={() => exec("italic")} label="I" title="斜体" italic />
        <ToolbarButton onClick={() => exec("underline")} label="U" title="下划线" underline />
        <ToolbarButton onClick={() => exec("strikeThrough")} label="S" title="删除线" />
        <span className="mx-1 w-px bg-[#ddd]" />
        <ToolbarButton onClick={() => exec("formatBlock", "H2")} label="H2" title="二级标题" />
        <ToolbarButton onClick={() => exec("formatBlock", "H3")} label="H3" title="三级标题" />
        <ToolbarButton onClick={() => exec("formatBlock", "P")} label="P" title="段落" />
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
        <ToolbarButton onClick={promptTable} label="表格" title="插入表格" />
        <ToolbarButton onClick={insertQuoteTable} label="报价表" title="插入报价表格模板" />
        <span className="mx-1 w-px bg-[#ddd]" />
        <ToolbarButton onClick={() => exec("removeFormat")} label="清除格式" title="清除格式" />
        <ToolbarButton onClick={() => exec("undo")} label="撤销" title="撤销" />
        <ToolbarButton onClick={() => exec("redo")} label="重做" title="重做" />
      </div>
      <div
        ref={ref}
        className="w-full min-w-0 overflow-auto p-3 text-[13px] leading-[22px] outline-none"
        style={{ height, minHeight: height }}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
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
