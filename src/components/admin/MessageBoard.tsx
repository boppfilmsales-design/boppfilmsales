"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RichEditor from "./RichEditor";
import { sanitizeRichHtml } from "@/lib/rich-text";

/* ============================================================
 * 留言板 — 客户留言 / 内部留言
 *
 * 消息来自前台（首页 CONTACT 区块、/contact、/zh/contact），落在
 * `inquiries` 表；运营在这里阅读、回复、分派、批准公开或删除。
 * 运营之间的留言保留在「内部留言」tab（`admin_messages`）。
 *
 * 2026-10-02 两次改造：
 *   ① 两个 tab 的编辑框从纯文本升级为富文本（与「新闻中心 →
 *      Employees Literary」同一套 TipTap 编辑器）。
 *   ② 版式改成与新闻中心一致的「列表 → 点编辑进独立页面」：
 *      列表一行一条，点「编辑」才打开富文本编辑视图，
 *      不再是每张卡片里都塞一个编辑器。
 *
 * 编辑视图不新开路由，而是在同一个 tab 里切换 list / edit —— 后台是
 * 单页 SPA，这样保留筛选、搜索、滚动位置，返回列表时体感更连贯。
 * ============================================================ */

/**
 * 判断一段内容是不是 HTML。
 *
 * 升级前 `inquiries.reply` / `admin_messages.body` 存的是纯文本，
 * 升级后存 HTML —— 老数据必须继续正常显示，所以渲染前先判断：
 * 含标签就当 HTML 处理，否则按纯文本渲染（保留换行）。
 */
function looksLikeHtml(value: string): boolean {
  return /<(p|div|br|span|strong|em|u|ul|ol|li|h[1-6]|table|img|a|blockquote)\b/i.test(value);
}

/** 把留言正文渲染成与新闻详情页一致的富文本块。 */
function RichBody({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  if (!looksLikeHtml(text)) {
    // 老数据：纯文本，保留换行
    return <p className={`whitespace-pre-wrap ${className}`}>{text}</p>;
  }
  return (
    <div
      className={`news-body ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(text) }}
    />
  );
}

type InquiryRow = {
  id: number;
  company: string;
  contact: string;
  email: string;
  phone: string;
  message: string;
  language: string;
  sourcePage: string;
  status: string;
  reply: string;
  repliedBy: string;
  repliedAt: string | null;
  isPublic: boolean;
  createdAt: string;
};

type InquiryCounts = {
  all: number;
  new: number;
  processing: number;
  replied: number;
  archived: number;
  public: number;
};

type NoteRow = {
  id: number;
  author: string;
  title: string;
  body: string;
  status: string;
  reply: string;
  repliedBy: string;
  repliedAt: string | null;
  isPinned: boolean;
  createdAt: string;
};

type NoteCounts = { all: number; open: number; replied: number; closed: number };

const INQUIRY_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "未处理", cls: "bg-[#fde8ec] text-[#c8102e]" },
  processing: { label: "处理中", cls: "bg-[#fff5d6] text-[#9a6b00]" },
  replied: { label: "已回复", cls: "bg-[#e6f6ea] text-[#1c7c39]" },
  archived: { label: "已归档", cls: "bg-[#f4f4f4] text-[#888]" },
};

const NOTE_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "待处理", cls: "bg-[#fff5d6] text-[#9a6b00]" },
  replied: { label: "已回复", cls: "bg-[#e6f6ea] text-[#1c7c39]" },
  closed: { label: "已归档", cls: "bg-[#f4f4f4] text-[#888]" },
};

/**
 * 后台接口的统一响应形状。
 *
 * 加上显式类型是因为 `Response.json()` 返回 `unknown`，直接读 `data.ok`
 * 会在 tsc 下报 TS18046（既有的 AdminUsers / InfoTransfer / Dashboard
 * 也有同一类报错）。这里一次断言，调用处就能正常取值。
 */
type ApiResponse = {
  ok?: boolean;
  error?: string;
  rows?: InquiryRow[];
  counts?: InquiryCounts;
  data?: unknown;
};

function fmt(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("zh-CN", { hour12: false });
}

/** 列表表头单元格 —— 与内容表格同一套配色。 */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`whitespace-nowrap px-3 py-[10px] text-left text-[12px] font-bold text-[#555] ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-[10px] align-middle text-[13px] text-[#444] ${className}`}>{children}</td>;
}

/** 把一段 HTML 压成纯文本摘要，用于列表单元格。 */
function plain(value: string, max = 60): string {
  const t = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

export default function MessageBoard({ username }: { username: string }) {
  const [tab, setTab] = useState<"inbox" | "notes">("inbox");

  /* ----- customer inbox state ----- */
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [counts, setCounts] = useState<InquiryCounts>({
    all: 0, new: 0, processing: 0, replied: 0, archived: 0, public: 0,
  });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");

  /** 客户留言：null = 列表视图，数字 = 正在编辑那条。 */
  const [editingInquiry, setEditingInquiry] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  /* ----- internal note state ----- */
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [noteCounts, setNoteCounts] = useState<NoteCounts>({ all: 0, open: 0, replied: 0, closed: 0 });

  /** 内部留言：null = 列表视图，"new" = 新建，数字 = 编辑那条。 */
  const [editingNote, setEditingNote] = useState<number | "new" | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const loadInbox = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inquiries?status=${encodeURIComponent(status)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as ApiResponse;
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRows(data.rows ?? []);
      if (data.counts) setCounts(data.counts);
      setError("");
    } catch (err) {
      setError(`加载客户留言失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/advanced/messages?status=all", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; rows?: NoteRow[]; counts?: NoteCounts };
      if (!data.ok) return;
      setNotes(data.rows ?? []);
      if (data.counts) setNoteCounts(data.counts);
    } catch {
      /* non-fatal: the note board is secondary */
    }
  }, []);

  useEffect(() => {
    if (tab === "inbox") void loadInbox(filter);
    else void loadNotes();
  }, [tab, filter, loadInbox, loadNotes]);

  async function patchInquiry(id: number, payload: Record<string, unknown>, okMsg: string) {
    const res = await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResponse;
    setNotice(data.ok ? okMsg : (data.error ?? "操作失败。"));
    if (data.ok) void loadInbox(filter);
    return Boolean(data.ok);
  }

  async function removeInquiry(id: number) {
    if (!window.confirm("确定删除这条客户留言吗？该操作不可恢复。")) return;
    const res = await fetch("/api/admin/inquiries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResponse;
    setNotice(data.ok ? "客户留言已删除。" : (data.error ?? "删除失败。"));
    if (data.ok) {
      setEditingInquiry(null);
      void loadInbox(filter);
    }
  }

  /** 新建或更新内部留言。 */
  async function saveNote() {
    // 富文本编辑器没输入时也会给出 "<p></p>"，要去掉标签再判空
    if (!noteBody.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()) {
      setNotice("留言内容不能为空。");
      return;
    }
    const isNew = editingNote === "new";
    const res = await fetch("/api/admin/advanced/messages", {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isNew ? { title: noteTitle, body: noteBody } : { id: editingNote, title: noteTitle, body: noteBody },
      ),
    });
    const data = (await res.json()) as ApiResponse;
    if (!data.ok) {
      setNotice(data.error ?? "保存失败");
      return;
    }
    setNotice(isNew ? "内部留言已发布。" : "内部留言已更新。");
    setEditingNote(null);
    setNoteTitle("");
    setNoteBody("");
    void loadNotes();
  }

  async function removeNote(id: number) {
    if (!window.confirm("确定删除这条内部留言吗？该操作不可恢复。")) return;
    const res = await fetch("/api/admin/advanced/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResponse;
    setNotice(data.ok ? "内部留言已删除。" : (data.error ?? "删除失败。"));
    if (data.ok) {
      setEditingNote(null);
      void loadNotes();
    }
  }

  /* Client-side search across name / company / e-mail / phone / body. */
  const visibleRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.contact, row.company, row.email, row.phone, row.message, row.reply]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, keyword]);

  const currentInquiry = rows.find((r) => r.id === editingInquiry) ?? null;
  const currentNote = editingNote !== null && editingNote !== "new" ? notes.find((n) => n.id === editingNote) ?? null : null;

  /** 打开某条客户留言的编辑视图，并把已有回复填进草稿。 */
  function openInquiry(row: InquiryRow) {
    setNotice("");
    setEditingInquiry(row.id);
    setReplyDraft(row.reply ?? "");
  }

  function openNote(row: NoteRow) {
    setNotice("");
    setEditingNote(row.id);
    setNoteTitle(row.title ?? "");
    setNoteBody(row.body ?? "");
  }

  return (
    <div>
      {/* ---------- Tabs ---------- */}
      <div className="mb-4 flex items-center gap-2 border-b border-[#e3e3e3]">
        {(
          [
            ["inbox", `客户留言 ${counts.all}`],
            ["notes", `内部留言 ${noteCounts.all}`],
          ] as const
        ).map(([key, label]) => (
          <button
            className={`-mb-px border-b-[3px] px-4 py-2 text-[13px] ${
              tab === key
                ? "border-[#e61d39] font-bold text-[#e61d39]"
                : "border-transparent text-[#888] hover:text-[#555]"
            }`}
            key={key}
            onClick={() => {
              setTab(key);
              setNotice("");
              setEditingInquiry(null);
              setEditingNote(null);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {notice ? (
        <div className="mb-3 border border-[#e3e3e3] bg-[#fffdf5] px-4 py-2 text-[12px] text-[#9a6b00]">
          {notice}
        </div>
      ) : null}

      {/* ==================== 客户留言 ==================== */}
      {tab === "inbox" ? (
        editingInquiry === null ? (
          /* ---------- 列表视图 ---------- */
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {(
                [
                  ["all", `全部 ${counts.all}`],
                  ["new", `未处理 ${counts.new}`],
                  ["processing", `处理中 ${counts.processing}`],
                  ["replied", `已回复 ${counts.replied}`],
                  ["archived", `已归档 ${counts.archived}`],
                ] as const
              ).map(([key, label]) => (
                <button
                  className={`border px-3 py-[6px] text-[12px] ${
                    filter === key
                      ? "border-[#e61d39] bg-[#e61d39] font-bold text-white"
                      : "border-[#ddd] bg-white text-[#666] hover:border-[#bbb]"
                  }`}
                  key={key}
                  onClick={() => setFilter(key)}
                  type="button"
                >
                  {label}
                </button>
              ))}
              <span className="ml-1 text-[12px] text-[#1c7c39]">已公开 {counts.public}</span>
              <input
                className="ml-auto w-[220px] border border-[#ddd] px-3 py-[6px] text-[12px] outline-none focus:border-[#e61d39]"
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索姓名 / 公司 / 邮箱 / 电话"
                value={keyword}
              />
            </div>

            {error ? (
              <div className="mb-3 border border-red-300 bg-red-50 p-4 text-[13px] text-red-700">{error}</div>
            ) : null}

            <div className="border border-[#e3e3e3] bg-white">
              <table className="w-full border-collapse">
                <thead className="border-b border-[#e3e3e3] bg-[#fafafa]">
                  <tr>
                    <Th className="w-[62px]">编号</Th>
                    <Th>客户 / 公司</Th>
                    <Th>联系方式</Th>
                    <Th>留言摘要</Th>
                    <Th className="w-[130px]">提交时间</Th>
                    <Th className="w-[80px]">状态</Th>
                    <Th className="w-[74px]">公开</Th>
                    <Th className="w-[120px]">操作</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-12 text-center text-[13px] text-[#888]" colSpan={8}>
                        加载中…
                      </td>
                    </tr>
                  ) : visibleRows.length === 0 ? (
                    <tr>
                      <td className="py-12 text-center text-[13px] text-[#888]" colSpan={8}>
                        暂无客户留言。
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row) => {
                      const meta = INQUIRY_STATUS[row.status] ?? { label: row.status, cls: "" };
                      return (
                        <tr className="border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fcfcfc]" key={row.id}>
                          <Td className="text-[12px] font-bold text-[#bbb]">#{row.id}</Td>
                          <Td>
                            <span className="font-bold text-[#333]">{row.contact || "（未填写）"}</span>
                            {row.company && row.company !== row.contact ? (
                              <span className="block text-[12px] text-[#888]">{row.company}</span>
                            ) : null}
                            {row.language === "zh" ? (
                              <span className="mt-1 inline-block bg-[#eef3fb] px-1.5 py-[1px] text-[10px] text-[#1c6dd0]">
                                中文站
                              </span>
                            ) : null}
                          </Td>
                          <Td>
                            <a className="block text-[12px] text-[#1c6dd0] hover:underline" href={`mailto:${row.email}`}>
                              {row.email}
                            </a>
                            {row.phone ? (
                              <span className="block text-[12px] text-[#666]">{row.phone}</span>
                            ) : null}
                          </Td>
                          <Td className="max-w-[280px] text-[12px] text-[#666]">
                            {plain(row.reply ? `【已回复】${row.reply}` : row.message, 56)}
                          </Td>
                          <Td className="text-[12px] text-[#999]">{fmt(row.createdAt)}</Td>
                          <Td>
                            <span className={`px-2 py-[2px] text-[10px] font-bold ${meta.cls}`}>{meta.label}</span>
                          </Td>
                          <Td>
                            {row.isPublic ? (
                              <span className="bg-[#e6f6ea] px-2 py-[2px] text-[10px] font-bold text-[#1c7c39]">公开中</span>
                            ) : (
                              <span className="text-[11px] text-[#ccc]">—</span>
                            )}
                          </Td>
                          <Td>
                            <button
                              className="text-[12px] text-[#1c6dd0] hover:underline"
                              onClick={() => openInquiry(row)}
                              type="button"
                            >
                              编辑
                            </button>
                            <span className="mx-1 text-[#ddd]">|</span>
                            <button
                              className="text-[12px] text-[#e61d39] hover:underline"
                              onClick={() => void removeInquiry(row.id)}
                              type="button"
                            >
                              删除
                            </button>
                          </Td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* ---------- 编辑视图（与新闻「编辑：新文章」同一套思路） ---------- */
          <div className="border border-[#e3e3e3] bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-[#e3e3e3] bg-[#fafafa] px-4 py-3">
              <button
                className="border border-[#ddd] bg-white px-3 py-[6px] text-[12px] text-[#666] hover:border-[#bbb]"
                onClick={() => {
                  setEditingInquiry(null);
                  setReplyDraft("");
                }}
                type="button"
              >
                ← 返回列表
              </button>
              <span className="text-[15px] font-bold text-[#333]">
                编辑：客户留言 #{editingInquiry}
              </span>
              {currentInquiry ? (
                <>
                  <span className="text-[13px] text-[#666]">
                    {currentInquiry.contact || "（未填写）"}
                    {currentInquiry.company && currentInquiry.company !== currentInquiry.contact
                      ? ` · ${currentInquiry.company}`
                      : ""}
                  </span>
                  <span
                    className={`px-2 py-[2px] text-[10px] font-bold ${
                      (INQUIRY_STATUS[currentInquiry.status] ?? { cls: "" }).cls
                    }`}
                  >
                    {(INQUIRY_STATUS[currentInquiry.status] ?? { label: currentInquiry.status }).label}
                  </span>
                </>
              ) : null}
            </div>

            {!currentInquiry ? (
              <div className="px-4 py-12 text-center text-[13px] text-[#888]">
                这条留言已不在当前筛选结果中（可能改了状态）。请返回列表重新打开。
              </div>
            ) : (
              <div className="p-4">
                {/* 客户资料 */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border border-[#eee] bg-[#fafafa] px-4 py-3 text-[12px]">
                  <a className="text-[#1c6dd0] hover:underline" href={`mailto:${currentInquiry.email}`}>
                    ✉ {currentInquiry.email}
                  </a>
                  {currentInquiry.phone ? (
                    <a
                      className="text-[#1c6dd0] hover:underline"
                      href={`tel:${currentInquiry.phone.replace(/[^\d+]/g, "")}`}
                    >
                      ☎ {currentInquiry.phone}
                    </a>
                  ) : (
                    <span className="text-[#bbb]">☎ 未留电话</span>
                  )}
                  <span className="text-[#999]">
                    {fmt(currentInquiry.createdAt)}
                    {currentInquiry.sourcePage ? ` · 来源 ${currentInquiry.sourcePage}` : ""}
                  </span>
                </div>

                {/* 客户原文 */}
                <div className="mt-4">
                  <p className="mb-2 text-[13px] font-bold text-[#333]">客户留言内容</p>
                  <div className="border border-[#eee] bg-[#fcfcfc] px-4 py-3">
                    <RichBody className="text-[14px] leading-[26px] text-[#444]" text={currentInquiry.message} />
                  </div>
                </div>

                {/* 回复编辑器 */}
                <div className="mt-5">
                  <p className="mb-2 text-[13px] font-bold text-[#333]">回复内容（富文本）</p>
                  <RichEditor
                    height={260}
                    onChange={setReplyDraft}
                    placeholder="输入回复内容…（支持加粗、列表、链接、图片、表格）"
                    value={replyDraft}
                  />
                  {currentInquiry.repliedAt ? (
                    <p className="mt-2 text-[11px] text-[#999]">
                      上次回复：{currentInquiry.repliedBy || "system"} · {fmt(currentInquiry.repliedAt)}
                    </p>
                  ) : null}
                </div>

                {/* 操作 */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eee] pt-4">
                  <button
                    className="border border-[#1c7c39] bg-[#1c7c39] px-5 py-[8px] text-[12px] font-bold text-white hover:bg-[#16612d]"
                    onClick={() => {
                      const reply = replyDraft.trim();
                      // 富文本编辑器在没输入时也会给出 "<p></p>"，要当空处理
                      if (!reply || !reply.replace(/<[^>]*>/g, "").trim()) {
                        setNotice("回复内容不能为空。");
                        return;
                      }
                      void patchInquiry(currentInquiry.id, { reply }, "回复已保存，状态已更新为「已回复」。");
                    }}
                    type="button"
                  >
                    保存回复
                  </button>

                  <select
                    className="border border-[#ddd] px-2 py-[8px] text-[12px]"
                    onChange={(event) =>
                      void patchInquiry(currentInquiry.id, { status: event.target.value }, "状态已更新。")
                    }
                    value={currentInquiry.status}
                  >
                    <option value="new">未处理</option>
                    <option value="processing">处理中</option>
                    <option value="replied">已回复</option>
                    <option value="archived">已归档</option>
                  </select>

                  <button
                    className={`border px-3 py-[8px] text-[12px] ${
                      currentInquiry.isPublic
                        ? "border-[#1c7c39] bg-[#e6f6ea] text-[#1c7c39]"
                        : "border-[#ddd] text-[#666] hover:border-[#bbb]"
                    }`}
                    onClick={() =>
                      void patchInquiry(
                        currentInquiry.id,
                        { isPublic: !currentInquiry.isPublic },
                        currentInquiry.isPublic ? "已从公开留言墙撤下。" : "已发布到公开留言墙。",
                      )
                    }
                    type="button"
                  >
                    {currentInquiry.isPublic ? "已公开 · 撤下" : "发布到留言墙"}
                  </button>

                  <a
                    className="border border-[#ddd] px-3 py-[8px] text-[12px] text-[#666] hover:border-[#bbb]"
                    href={`mailto:${currentInquiry.email}?subject=${encodeURIComponent("Re: your inquiry to Asia Pacific Industry Group")}`}
                  >
                    邮件回复
                  </a>

                  <button
                    className="ml-auto border border-[#f0c2cb] px-3 py-[8px] text-[12px] text-[#e61d39] hover:bg-[#e61d39] hover:text-white"
                    onClick={() => void removeInquiry(currentInquiry.id)}
                    type="button"
                  >
                    删除这条留言
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      ) : editingNote === null ? (
        /* ==================== 内部留言：列表视图 ==================== */
        <>
          <div className="mb-3 flex items-center">
            <button
              className="border border-[#e61d39] bg-[#e61d39] px-4 py-[7px] text-[12px] font-bold text-white hover:bg-[#c8102e]"
              onClick={() => {
                setNotice("");
                setEditingNote("new");
                setNoteTitle("");
                setNoteBody("");
              }}
              type="button"
            >
              + 发布内部留言
            </button>
            <span className="ml-3 text-[12px] text-[#888]">
              仅运营人员可见，客户看不到。共 {noteCounts.all} 条。
            </span>
          </div>

          <div className="border border-[#e3e3e3] bg-white">
            <table className="w-full border-collapse">
              <thead className="border-b border-[#e3e3e3] bg-[#fafafa]">
                <tr>
                  <Th className="w-[62px]">编号</Th>
                  <Th className="w-[280px]">标题</Th>
                  <Th>内容摘要</Th>
                  <Th className="w-[110px]">作者</Th>
                  <Th className="w-[130px]">时间</Th>
                  <Th className="w-[80px]">状态</Th>
                  <Th className="w-[120px]">操作</Th>
                </tr>
              </thead>
              <tbody>
                {notes.length === 0 ? (
                  <tr>
                    <td className="py-12 text-center text-[13px] text-[#888]" colSpan={7}>
                      暂无内部留言。
                    </td>
                  </tr>
                ) : (
                  notes.map((row) => {
                    const meta = NOTE_STATUS[row.status] ?? { label: row.status, cls: "" };
                    return (
                      <tr className="border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fcfcfc]" key={row.id}>
                        <Td className="text-[12px] font-bold text-[#bbb]">#{row.id}</Td>
                        <Td>
                          {row.isPinned ? (
                            <span className="mr-1 bg-[#e61d39] px-1.5 py-[1px] text-[10px] font-bold text-white">
                              置顶
                            </span>
                          ) : null}
                          <span className="font-bold text-[#333]">{row.title || "（无标题）"}</span>
                        </Td>
                        <Td className="max-w-[340px] text-[12px] text-[#666]">{plain(row.body, 56)}</Td>
                        <Td className="text-[12px] text-[#666]">{row.author}</Td>
                        <Td className="text-[12px] text-[#999]">{fmt(row.createdAt)}</Td>
                        <Td>
                          <span className={`px-2 py-[2px] text-[10px] font-bold ${meta.cls}`}>{meta.label}</span>
                        </Td>
                        <Td>
                          <button
                            className="text-[12px] text-[#1c6dd0] hover:underline"
                            onClick={() => openNote(row)}
                            type="button"
                          >
                            编辑
                          </button>
                          <span className="mx-1 text-[#ddd]">|</span>
                          <button
                            className="text-[12px] text-[#e61d39] hover:underline"
                            onClick={() => void removeNote(row.id)}
                            type="button"
                          >
                            删除
                          </button>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* ==================== 内部留言：编辑视图 ==================== */
        <div className="border border-[#e3e3e3] bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#e3e3e3] bg-[#fafafa] px-4 py-3">
            <button
              className="border border-[#ddd] bg-white px-3 py-[6px] text-[12px] text-[#666] hover:border-[#bbb]"
              onClick={() => {
                setEditingNote(null);
                setNoteTitle("");
                setNoteBody("");
              }}
              type="button"
            >
              ← 返回列表
            </button>
            <span className="text-[15px] font-bold text-[#333]">
              {editingNote === "new" ? "编辑：新留言" : `编辑：内部留言 #${editingNote}`}
            </span>
            {currentNote ? <span className="text-[12px] text-[#999]">{currentNote.author} · {fmt(currentNote.createdAt)}</span> : null}
            <span className="ml-auto text-[12px] text-[#888]">当前登录：{username}</span>
          </div>

          <div className="p-4">
            <label className="mb-1 block text-[13px] font-bold text-[#333]">留言标题</label>
            <input
              className="w-full border border-[#ddd] px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="留言标题（可留空）"
              value={noteTitle}
            />

            <p className="mb-2 mt-5 text-[13px] font-bold text-[#333]">留言内容（富文本）</p>
            <RichEditor
              height={320}
              onChange={setNoteBody}
              placeholder="留言内容…（支持加粗、列表、链接、图片、表格）"
              value={noteBody}
            />

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eee] pt-4">
              <button
                className="border border-[#e61d39] bg-[#e61d39] px-5 py-[8px] text-[12px] font-bold text-white hover:bg-[#c8102e]"
                onClick={() => void saveNote()}
                type="button"
              >
                {editingNote === "new" ? "发布留言" : "保存修改"}
              </button>
              <button
                className="border border-[#ddd] px-4 py-[8px] text-[12px] text-[#666] hover:border-[#bbb]"
                onClick={() => {
                  setEditingNote(null);
                  setNoteTitle("");
                  setNoteBody("");
                }}
                type="button"
              >
                取消
              </button>
              {editingNote !== "new" ? (
                <button
                  className="ml-auto border border-[#f0c2cb] px-3 py-[8px] text-[12px] text-[#e61d39] hover:bg-[#e61d39] hover:text-white"
                  onClick={() => void removeNote(editingNote as number)}
                  type="button"
                >
                  删除这条留言
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
