"use client";

import { useState } from "react";
import type { SiteContent } from "@/lib/site-types";
import RichEditor from "./RichEditor";

/* ---------------- types ---------------- */

type CardItem = {
  sourceId?: number;
  title?: string;
  titleZh?: string;
  image?: string;
  externalUrl?: string;
  hot?: boolean;
  [k: string]: unknown;
};

type EntryItem = {
  sourceId?: number;
  title?: string;
  titleZh?: string;
  bodyHtml?: string;
  bodyHtmlZh?: string;
  images?: string[];
  externalUrl?: string;
  date?: string;
  [k: string]: unknown;
};

type DownloadRow = {
  name?: string;
  serial?: string;
  format?: string;
  date?: string;
  file?: string;
  bodyHtml?: string;
  [k: string]: unknown;
};

type AboutBlock = { bodyHtml?: string; images?: string[] };

const inputCls =
  "mt-1 w-full border border-[#ddd] px-3 py-2 text-[13px] outline-none focus:border-[#e61d39]";
const btnCls =
  "rounded bg-[#e61d39] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60";

/* ---------------- helpers ---------------- */

function isAboutBlock(v: unknown): v is AboutBlock {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Plain-text length of an HTML fragment, for the editor's char counter. */
function stripTags(html: string): string {
  return (html ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ImageListEditor({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {images.map((img, i) => (
        <div className="flex items-center gap-2" key={i}>
          {img ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img alt="" className="h-[44px] w-[64px] shrink-0 border border-[#eee] object-cover" src={img} />
          ) : (
            <span className="flex h-[44px] w-[64px] shrink-0 items-center justify-center bg-[#fafafa] text-[10px] text-[#ccc]">
              预览
            </span>
          )}
          <input
            className={inputCls}
            value={img}
            onChange={(e) => {
              const next = [...images];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder="图片 URL，例如 /api/media/uploads/content/xxx.jpg"
          />
          <button
            className="shrink-0 rounded bg-[#f4f4f4] px-3 py-2 text-[12px] text-[#888] hover:bg-[#eee]"
            onClick={() => onChange(images.filter((_, idx) => idx !== i))}
            type="button"
          >
            删除
          </button>
        </div>
      ))}
      <button
        className="rounded border border-dashed border-[#ccc] px-3 py-2 text-[12px] text-[#888] hover:border-[#e61d39] hover:text-[#e61d39]"
        onClick={() => onChange([...images, ""])}
        type="button"
      >
        + 添加图片
      </button>
    </div>
  );
}

/** Live preview of an HTML fragment, matching the front-end body styling. */
function BodyPreview({ html }: { html: string }) {
  const hasContent = html.replace(/<[^>]+>/g, "").trim().length > 0;
  return (
    <div className="mt-2 border border-[#eee] bg-[#fcfcfc] p-4">
      <p className="mb-2 text-[11px] font-bold text-[#999]">前台效果预览</p>
      {hasContent ? (
        <div
          className="news-body max-h-[300px] overflow-y-auto text-[13px] leading-[190%] text-[#3d3d3d]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-[12px] text-[#bbb]">（暂无内容，前台将显示“此栏目暂无内容”）</p>
      )}
    </div>
  );
}

/* ---------------- main ---------------- */

export default function ContentForm({
  content,
  onCancel,
  onSaved,
}: {
  content: SiteContent;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const kind = content.kind;
  const isAbout = kind === "about";
  const isDown = kind === "down";
  const isList = !isAbout && !isDown;

  const [name, setName] = useState(content.name);
  const [nameZh, setNameZh] = useState(content.nameZh);

  // about
  const aboutEn = isAboutBlock(content.items) ? (content.items as AboutBlock) : {};
  const aboutZh = isAboutBlock(content.itemsZh) ? (content.itemsZh as AboutBlock) : {};
  const [bodyEn, setBodyEn] = useState(aboutEn.bodyHtml ?? "");
  const [bodyZh, setBodyZh] = useState(aboutZh.bodyHtml ?? "");
  const [images, setImages] = useState<string[]>(aboutEn.images ?? []);

  // list (cards + entries)
  const [cards, setCards] = useState<CardItem[]>(
    Array.isArray(content.items) ? (content.items as CardItem[]) : [],
  );
  const [entries, setEntries] = useState<EntryItem[]>(
    Array.isArray(content.entries) ? (content.entries as EntryItem[]) : [],
  );

  // download rows
  const [rows, setRows] = useState<DownloadRow[]>(
    Array.isArray(content.items) ? (content.items as DownloadRow[]) : [],
  );

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
    const target = index + dir;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    let payload: Record<string, unknown>;
    if (isAbout) {
      payload = {
        name,
        nameZh,
        items: { bodyHtml: bodyEn, images },
        itemsZh: { bodyHtml: bodyZh, images },
      };
    } else if (isDown) {
      payload = { name, nameZh, items: rows };
    } else {
      payload = { name, nameZh, items: cards, entries };
    }
    try {
      const response = await fetch(`/api/admin/content/${content.sourceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "保存失败");
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mb-5 border border-[#e3e3e3] bg-white p-5" onSubmit={submit}>
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#333]">
          编辑栏目：{name} <span className="text-[12px] font-normal text-[#aaa]">（{kind}）</span>
        </h2>
        <button className="text-[12px] text-[#888] hover:text-[#e61d39]" onClick={onCancel} type="button">
          关闭 ✕
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-[12px] font-bold text-[#555]">
          英文栏目名称
          <input className={inputCls} onChange={(e) => setName(e.target.value)} value={name} />
        </label>
        <label className="text-[12px] font-bold text-[#555]">
          中文栏目名称
          <input className={inputCls} onChange={(e) => setNameZh(e.target.value)} value={nameZh} />
        </label>
      </div>

      {/* ABOUT */}
      {isAbout && (
        <div className="mt-4 space-y-4">
          <div className="rounded border border-[#e8e8e8] bg-[#fafafa] px-3 py-2 text-[11px] text-[#777]">
            该栏目在前台渲染为<b>单页内容</b>：正文（支持 HTML）+ 图库。前台标题取「中文栏目名称」，
            正文按语言切换中/英文，图片以画廊网格展示（每行 1–3 张）。
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#555]">
              英文正文（富文本）
              <span className="ml-2 font-normal text-[#aaa]">纯文本 {stripTags(bodyEn).length} 字</span>
            </label>
            <div className="mt-1">
              <RichEditor value={bodyEn} onChange={setBodyEn} placeholder="编辑英文正文..." height={260} />
            </div>
            <BodyPreview html={bodyEn} />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#555]">
              中文正文（富文本）
              <span className="ml-2 font-normal text-[#aaa]">纯文本 {stripTags(bodyZh).length} 字</span>
            </label>
            <div className="mt-1">
              <RichEditor value={bodyZh} onChange={setBodyZh} placeholder="编辑中文正文..." height={260} />
            </div>
            <BodyPreview html={bodyZh} />
          </div>
          <div>
            <p className="mb-2 text-[12px] font-bold text-[#555]">图片（{images.length} 张，前后台共用）</p>
            <ImageListEditor images={images} onChange={setImages} />
          </div>
        </div>
      )}

      {/* DOWNLOAD */}
      {isDown && (
        <div className="mt-4 space-y-3">
          <div className="rounded border border-[#e8e8e8] bg-[#fafafa] px-3 py-2 text-[11px] text-[#777]">
            该栏目在前台渲染为<b>下载表格</b>：名称 / 编号 / 格式 / 日期 / 下载按钮。
            <b>文件地址</b>留空时前台显示「Coming Soon」；填写后会直接出现可点击的下载按钮。支持直接粘贴图床链接 https://…（文件存图床，不占网站空间）。
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[12px] font-bold text-[#555]">下载文件列表（{rows.length} 条）</p>
            <button
              className="rounded border border-[#ddd] px-2 py-1 text-[11px] text-[#666] hover:border-[#e61d39] hover:text-[#e61d39]"
              onClick={() => {
                const next = [...rows];
                const first = next[0];
                if (first) next.push({ ...first, name: `${first.name ?? ""} (副本)`, serial: `${first.serial ?? ""}-COPY`.replace(/^-/, "") });
                setRows(next);
              }}
              type="button"
            >
              复制首行
            </button>
          </div>
          {rows.map((row, i) => (
            <div className="rounded border border-[#eee] p-3" key={i}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-[11px] font-bold text-[#777]">
                  名称
                  <input
                    className={inputCls}
                    value={row.name ?? ""}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], name: e.target.value };
                      setRows(next);
                    }}
                  />
                </label>
                <label className="text-[11px] font-bold text-[#777]">
                  文件地址（PDF 链接 / /api/media/downloads/xxx.pdf / 图床链接 https://…）
                  <input
                    className={inputCls}
                    value={row.file ?? ""}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], file: e.target.value };
                      setRows(next);
                    }}
                    placeholder="/api/media/downloads/20180921141713_83602.pdf 或 https://图床/xxx.pdf"
                  />
                </label>
                <label className="text-[11px] font-bold text-[#777]">
                  编号
                  <input
                    className={inputCls}
                    value={row.serial ?? ""}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], serial: e.target.value };
                      setRows(next);
                    }}
                  />
                </label>
                <label className="text-[11px] font-bold text-[#777]">
                  格式
                  <input
                    className={inputCls}
                    value={row.format ?? ""}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], format: e.target.value };
                      setRows(next);
                    }}
                    placeholder="PDF"
                  />
                </label>
                <label className="text-[11px] font-bold text-[#777]">
                  日期
                  <input
                    className={inputCls}
                    value={row.date ?? ""}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], date: e.target.value };
                      setRows(next);
                    }}
                    placeholder="07/25/2018"
                  />
                </label>
              </div>
              <div className="mt-2">
                <label className="block text-[11px] font-bold text-[#777]">说明（富文本，可留空）</label>
                <div className="mt-1">
                  <RichEditor
                    value={row.bodyHtml ?? ""}
                    onChange={(html) => {
                      const next = [...rows];
                      next[i] = { ...next[i], bodyHtml: html };
                      setRows(next);
                    }}
                    placeholder="编辑下载项说明..."
                    height={180}
                  />
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded bg-[#f4f4f4] px-3 py-1 text-[12px] text-[#888] hover:bg-[#eee]"
                  onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                  type="button"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          <button
            className="rounded border border-dashed border-[#ccc] px-3 py-2 text-[12px] text-[#888] hover:border-[#e61d39] hover:text-[#e61d39]"
            onClick={() => setRows([...rows, { name: "", serial: "", format: "PDF", date: "", file: "", bodyHtml: "" }])}
            type="button"
          >
            + 添加下载项
          </button>
        </div>
      )}

      {/* LIST: cards + entries (honor / cases / service / lines) */}
      {isList && (
        <div className="mt-4 space-y-6">
          <div>
            <p className="mb-2 text-[12px] font-bold text-[#555]">条目卡片（列表显示）</p>
            {cards.map((card, i) => (
              <div className="mb-3 rounded border border-[#eee] p-3" key={i}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-[11px] font-bold text-[#777]">
                    标题（英）
                    <input
                      className={inputCls}
                      value={card.title ?? ""}
                      onChange={(e) => {
                        const next = [...cards];
                        next[i] = { ...next[i], title: e.target.value };
                        setCards(next);
                      }}
                    />
                  </label>
                  <label className="text-[11px] font-bold text-[#777]">
                    标题（中）
                    <input
                      className={inputCls}
                      value={card.titleZh ?? ""}
                      onChange={(e) => {
                        const next = [...cards];
                        next[i] = { ...next[i], titleZh: e.target.value };
                        setCards(next);
                      }}
                    />
                  </label>
                  <label className="text-[11px] font-bold text-[#777]">
                    图片 URL
                    <input
                      className={inputCls}
                      value={card.image ?? ""}
                      onChange={(e) => {
                        const next = [...cards];
                        next[i] = { ...next[i], image: e.target.value };
                        setCards(next);
                      }}
                    />
                  </label>
                  <label className="text-[11px] font-bold text-[#777]">
                    外部链接（留空为本站详情）
                    <input
                      className={inputCls}
                      value={card.externalUrl ?? ""}
                      onChange={(e) => {
                        const next = [...cards];
                        next[i] = { ...next[i], externalUrl: e.target.value };
                        setCards(next);
                      }}
                    />
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1 text-[11px] text-[#777]">
                    <input
                      type="checkbox"
                      checked={Boolean(card.hot)}
                      onChange={(e) => {
                        const next = [...cards];
                        next[i] = { ...next[i], hot: e.target.checked };
                        setCards(next);
                      }}
                    />
                    热门 (HOT)
                  </label>
                  <button
                    className="rounded bg-[#f4f4f4] px-2 py-1 text-[11px] text-[#888] hover:bg-[#eee]"
                    onClick={() => setCards(move(cards, i, -1))}
                    type="button"
                  >
                    ↑上移
                  </button>
                  <button
                    className="rounded bg-[#f4f4f4] px-2 py-1 text-[11px] text-[#888] hover:bg-[#eee]"
                    onClick={() => setCards(move(cards, i, 1))}
                    type="button"
                  >
                    ↓下移
                  </button>
                  <button
                    className="rounded bg-[#f4f4f4] px-2 py-1 text-[11px] text-[#e61d39] hover:bg-[#eee]"
                    onClick={() => setCards(cards.filter((_, idx) => idx !== i))}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            <button
              className="rounded border border-dashed border-[#ccc] px-3 py-2 text-[12px] text-[#888] hover:border-[#e61d39] hover:text-[#e61d39]"
              onClick={() =>
                setCards([...cards, { sourceId: -Date.now(), title: "", titleZh: "", image: "", externalUrl: "", hot: false }])
              }
              type="button"
            >
              + 添加条目
            </button>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-bold text-[#555]">条目详情正文（与上面卡片按 sourceId 对应）</p>
            {entries.map((entry, i) => (
              <div className="mb-3 rounded border border-[#eee] p-3" key={i}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-[11px] font-bold text-[#777]">
                    标题（英）
                    <input
                      className={inputCls}
                      value={entry.title ?? ""}
                      onChange={(e) => {
                        const next = [...entries];
                        next[i] = { ...next[i], title: e.target.value };
                        setEntries(next);
                      }}
                    />
                  </label>
                  <label className="text-[11px] font-bold text-[#777]">
                    标题（中）
                    <input
                      className={inputCls}
                      value={entry.titleZh ?? ""}
                      onChange={(e) => {
                        const next = [...entries];
                        next[i] = { ...next[i], titleZh: e.target.value };
                        setEntries(next);
                      }}
                    />
                  </label>
                  <label className="text-[11px] font-bold text-[#777]">
                    日期
                    <input
                      className={inputCls}
                      value={entry.date ?? ""}
                      onChange={(e) => {
                        const next = [...entries];
                        next[i] = { ...next[i], date: e.target.value };
                        setEntries(next);
                      }}
                    />
                  </label>
                  <label className="text-[11px] font-bold text-[#777]">
                    图片 URL（详情配图）
                    <input
                      className={inputCls}
                      value={(entry.images ?? [])[0] ?? ""}
                      onChange={(e) => {
                        const next = [...entries];
                        next[i] = { ...next[i], images: e.target.value ? [e.target.value] : [] };
                        setEntries(next);
                      }}
                    />
                  </label>
                </div>
                <div className="mt-2">
                  <label className="block text-[11px] font-bold text-[#777]">详情正文（英，富文本）</label>
                  <div className="mt-1">
                    <RichEditor
                      value={entry.bodyHtml ?? ""}
                      onChange={(html) => {
                        const next = [...entries];
                        next[i] = { ...next[i], bodyHtml: html };
                        setEntries(next);
                      }}
                      placeholder="编辑英文详情正文..."
                      height={220}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-[11px] font-bold text-[#777]">详情正文（中，富文本）</label>
                  <div className="mt-1">
                    <RichEditor
                      value={entry.bodyHtmlZh ?? ""}
                      onChange={(html) => {
                        const next = [...entries];
                        next[i] = { ...next[i], bodyHtmlZh: html };
                        setEntries(next);
                      }}
                      placeholder="编辑中文详情正文..."
                      height={220}
                    />
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    className="rounded bg-[#f4f4f4] px-2 py-1 text-[11px] text-[#e61d39] hover:bg-[#eee]"
                    onClick={() => setEntries(entries.filter((_, idx) => idx !== i))}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            <button
              className="rounded border border-dashed border-[#ccc] px-3 py-2 text-[12px] text-[#888] hover:border-[#e61d39] hover:text-[#e61d39]"
              onClick={() =>
                setEntries([
                  ...entries,
                  { sourceId: -Date.now(), title: "", titleZh: "", date: "", bodyHtml: "", bodyHtmlZh: "", images: [] },
                ])
              }
              type="button"
            >
              + 添加详情
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button className={btnCls} disabled={busy} type="submit">
          {busy ? "保存中..." : "保存栏目"}
        </button>
        {message ? <span className="text-[12px] text-[#e61d39]">{message}</span> : null}
      </div>
    </form>
  );
}
