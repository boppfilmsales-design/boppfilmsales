"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/* ============================================================
 * 留言板 — customer message inbox
 *
 * Messages arrive from the public site (home page CONTACT block,
 * /contact, /zh/contact) and land in the `inquiries` table. This
 * screen is the operator's inbox for them: read, reply, triage,
 * approve for the public wall, or delete.
 *
 * The legacy operator-to-operator note board is preserved as the
 * 「内部留言」tab so no existing data or workflow is lost.
 * ============================================================ */

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

function fmt(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("zh-CN", { hour12: false });
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
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [keyword, setKeyword] = useState("");

  /* ----- internal note state ----- */
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [noteCounts, setNoteCounts] = useState<NoteCounts>({ all: 0, open: 0, replied: 0, closed: 0 });
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const loadInbox = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inquiries?status=${encodeURIComponent(status)}`, {
        cache: "no-store",
      });
      const data = await res.json();
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
      const data = await res.json();
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
    const data = await res.json().catch(() => ({}));
    setNotice(data.ok ? okMsg : (data.error ?? "操作失败。"));
    if (data.ok) void loadInbox(filter);
  }

  async function removeInquiry(id: number) {
    if (!window.confirm("确定删除这条客户留言吗？该操作不可恢复。")) return;
    const res = await fetch("/api/admin/inquiries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    setNotice(data.ok ? "客户留言已删除。" : (data.error ?? "删除失败。"));
    if (data.ok) void loadInbox(filter);
  }

  async function submitNote() {
    if (!noteBody.trim()) {
      setNotice("留言内容不能为空。");
      return;
    }
    const res = await fetch("/api/admin/advanced/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: noteTitle, body: noteBody }),
    });
    const data = await res.json();
    if (!data.ok) {
      setNotice(data.error ?? "发布失败");
      return;
    }
    setNoteTitle("");
    setNoteBody("");
    setNotice("内部留言已发布。");
    void loadNotes();
  }

  /* Client-side search across name / company / e-mail / phone / body. */
  const visibleRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.contact, row.company, row.email, row.phone, row.message]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, keyword]);

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

      {/* ==================== CUSTOMER INBOX ==================== */}
      {tab === "inbox" ? (
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

          <div className="space-y-3">
            {loading ? (
              <div className="border border-[#e3e3e3] bg-white py-12 text-center text-[13px] text-[#888]">
                加载中…
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="border border-[#e3e3e3] bg-white py-12 text-center text-[13px] text-[#888]">
                暂无客户留言。
              </div>
            ) : (
              visibleRows.map((row) => {
                const meta = INQUIRY_STATUS[row.status] ?? { label: row.status, cls: "" };
                const isOpen = expanded[row.id] !== false;
                return (
                  <div className="border border-[#e3e3e3] bg-white" key={row.id}>
                    {/* header */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-[#f0f0f0] px-4 py-3">
                      <span className="text-[11px] font-bold text-[#bbb]">#{row.id}</span>
                      <span className="text-[14px] font-bold text-[#333]">
                        {row.contact || "（未填写）"}
                        {row.company && row.company !== row.contact ? (
                          <span className="ml-2 text-[12px] font-normal text-[#888]">{row.company}</span>
                        ) : null}
                      </span>
                      <span className={`px-2 py-[2px] text-[10px] font-bold ${meta.cls}`}>{meta.label}</span>
                      {row.isPublic ? (
                        <span className="bg-[#e6f6ea] px-2 py-[2px] text-[10px] font-bold text-[#1c7c39]">
                          公开中
                        </span>
                      ) : null}
                      {row.language === "zh" ? (
                        <span className="bg-[#eef3fb] px-2 py-[2px] text-[10px] text-[#1c6dd0]">中文站</span>
                      ) : (
                        <span className="bg-[#f4f4f4] px-2 py-[2px] text-[10px] text-[#999]">EN</span>
                      )}
                      <span className="ml-auto text-[11px] text-[#999]">
                        {fmt(row.createdAt)}
                        {row.sourcePage ? ` · ${row.sourcePage}` : ""}
                      </span>
                    </div>

                    {/* contact strip — clickable so replying is one tap */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 bg-[#fafafa] px-4 py-2 text-[12px]">
                      <a className="text-[#1c6dd0] hover:underline" href={`mailto:${row.email}`}>
                        ✉ {row.email}
                      </a>
                      {row.phone ? (
                        <a className="text-[#1c6dd0] hover:underline" href={`tel:${row.phone.replace(/[^\d+]/g, "")}`}>
                          ☎ {row.phone}
                        </a>
                      ) : (
                        <span className="text-[#bbb]">☎ 未留电话</span>
                      )}
                    </div>

                    {/* body */}
                    <div className="px-4 py-3">
                      <p
                        className={`whitespace-pre-wrap text-[13px] leading-[24px] text-[#444] ${
                          isOpen ? "" : "line-clamp-2"
                        }`}
                      >
                        {row.message}
                      </p>
                      {row.message.length > 120 ? (
                        <button
                          className="mt-1 text-[11px] text-[#1c6dd0] hover:underline"
                          onClick={() => setExpanded((s) => ({ ...s, [row.id]: !isOpen }))}
                          type="button"
                        >
                          {isOpen ? "收起" : "展开全文"}
                        </button>
                      ) : null}
                    </div>

                    {/* existing reply */}
                    {row.reply ? (
                      <div className="mx-4 mb-3 border-l-[3px] border-[#1c7c39] bg-[#f6fbf7] px-3 py-2">
                        <p className="text-[11px] text-[#1c7c39]">
                          回复 · {row.repliedBy || "system"}
                          {row.repliedAt ? ` · ${fmt(row.repliedAt)}` : ""}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[12px] text-[#444]">{row.reply}</p>
                      </div>
                    ) : null}

                    {/* actions */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-[#f0f0f0] px-4 py-3">
                      <input
                        className="min-w-[260px] flex-1 border border-[#ddd] px-3 py-[7px] text-[12px] outline-none focus:border-[#e61d39]"
                        onChange={(e) => setReplyDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                        placeholder="输入回复内容…"
                        value={replyDrafts[row.id] ?? ""}
                      />
                      <button
                        className="border border-[#1c7c39] px-3 py-[7px] text-[12px] text-[#1c7c39] hover:bg-[#1c7c39] hover:text-white"
                        onClick={() => {
                          const reply = (replyDrafts[row.id] ?? "").trim();
                          if (!reply) {
                            setNotice("回复内容不能为空。");
                            return;
                          }
                          void patchInquiry(row.id, { reply }, "回复已保存，状态已更新为「已回复」。");
                          setReplyDrafts((d) => ({ ...d, [row.id]: "" }));
                        }}
                        type="button"
                      >
                        回复
                      </button>

                      <select
                        className="border border-[#ddd] px-2 py-[7px] text-[12px]"
                        onChange={(event) => void patchInquiry(row.id, { status: event.target.value }, "状态已更新。")}
                        value={row.status}
                      >
                        <option value="new">未处理</option>
                        <option value="processing">处理中</option>
                        <option value="replied">已回复</option>
                        <option value="archived">已归档</option>
                      </select>

                      <button
                        className={`border px-3 py-[7px] text-[12px] ${
                          row.isPublic
                            ? "border-[#1c7c39] bg-[#e6f6ea] text-[#1c7c39]"
                            : "border-[#ddd] text-[#666] hover:border-[#bbb]"
                        }`}
                        onClick={() =>
                          void patchInquiry(
                            row.id,
                            { isPublic: !row.isPublic },
                            row.isPublic ? "已从公开留言墙撤下。" : "已发布到公开留言墙。",
                          )
                        }
                        type="button"
                      >
                        {row.isPublic ? "已公开 · 撤下" : "发布到留言墙"}
                      </button>

                      <a
                        className="border border-[#ddd] px-3 py-[7px] text-[12px] text-[#666] hover:border-[#bbb]"
                        href={`mailto:${row.email}?subject=${encodeURIComponent("Re: your inquiry to Asia Pacific Industry Group")}`}
                      >
                        邮件回复
                      </a>

                      <button
                        className="border border-[#f0c2cb] px-3 py-[7px] text-[12px] text-[#e61d39] hover:bg-[#e61d39] hover:text-white"
                        onClick={() => void removeInquiry(row.id)}
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* ==================== INTERNAL NOTES ==================== */
        <>
          <div className="mb-4 border border-[#e3e3e3] bg-white p-5">
            <h2 className="text-[16px] font-bold text-[#333]">发布内部留言</h2>
            <p className="mt-1 text-[12px] text-[#888]">
              仅用于运营人员之间沟通栏目维护事项，发布后会记录当前登录账号（{username}），客户看不到。
            </p>
            <input
              className="mt-3 w-full border border-[#ddd] px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="留言标题（可留空）"
              value={noteTitle}
            />
            <textarea
              className="mt-2 w-full border border-[#ddd] px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="留言内容，支持多行"
              rows={4}
              value={noteBody}
            />
            <div className="mt-2">
              <button
                className="bg-[#e61d39] px-4 py-[8px] text-[12px] font-bold text-white"
                onClick={() => void submitNote()}
                type="button"
              >
                发布留言
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {notes.length === 0 ? (
              <div className="border border-[#e3e3e3] bg-white py-12 text-center text-[13px] text-[#888]">
                暂无内部留言。
              </div>
            ) : (
              notes.map((row) => {
                const meta = NOTE_STATUS[row.status] ?? { label: row.status, cls: "" };
                return (
                  <div className="border border-[#e3e3e3] bg-white p-4" key={row.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      {row.isPinned ? (
                        <span className="bg-[#e61d39] px-2 py-[2px] text-[10px] font-bold text-white">置顶</span>
                      ) : null}
                      <span className="text-[14px] font-bold text-[#333]">{row.title}</span>
                      <span className={`px-2 py-[2px] text-[10px] font-bold ${meta.cls}`}>{meta.label}</span>
                      <span className="ml-auto text-[11px] text-[#999]">
                        {row.author} · {fmt(row.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[22px] text-[#555]">{row.body}</p>
                    {row.reply ? (
                      <div className="mt-3 border-l-[3px] border-[#1c7c39] bg-[#f6fbf7] px-3 py-2">
                        <p className="text-[11px] text-[#1c7c39]">
                          回复 · {row.repliedBy || "system"}
                          {row.repliedAt ? ` · ${fmt(row.repliedAt)}` : ""}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[12px] text-[#444]">{row.reply}</p>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
