"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import NewsForm, { type AdminCategory, type AdminPostDetail } from "@/components/admin/NewsForm";

/* ---------- Types ---------- */

type Row = {
  id: number;
  categoryId: number;
  title: string;
  listDate: string;
  newsDate: string;
  excerpt: string;
  image: string;
  isPublished: boolean;
  sourceId: number | null;
};

type ListResponse = {
  ok: boolean;
  items: Row[];
  categories: AdminCategory[];
  total: number;
  page: number;
  pages: number;
};

type AdminColumn = {
  sourceId: number;
  name: string;
  displayType: string;
  dataSource: string;
  parentId: number;
  itemCount: number;
};

type AdminSection = {
  pid: number;
  name: string;
  nameEn: string;
  columns: AdminColumn[];
};

type StaticRow = {
  id: number;
  sort: number;
  title: string;
  image: string;
  status: string;
};

type ProductRow = {
  id: number;
  sort: number;
  title: string;
  subtitle: string;
  image: string;
  subCategory: string;
  status: string;
};

/* ---------- Helpers ---------- */

function displayTypeName(type: string): string {
  switch (type) {
    case "single": return "单页内容";
    case "image-list": return "图片列表";
    case "text-list": return "图文列表";
    case "news-list": return "新闻列表";
    default: return type;
  }
}

/* ---------- Dashboard ---------- */

export default function Dashboard({ username }: { username: string }) {
  const [activeSection, setActiveSection] = useState<number | null>(1);
  const [activeColumn, setActiveColumn] = useState<AdminColumn | null>(null);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentRows, setContentRows] = useState<StaticRow[]>([]);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // News management state
  const [newsRows, setNewsRows] = useState<Row[]>([]);
  const [newsCats, setNewsCats] = useState<AdminCategory[]>([]);
  const [newsTotal, setNewsTotal] = useState(0);
  const [newsPages, setNewsPages] = useState(1);
  const [newsPage, setNewsPage] = useState(1);
  const [newsCatId, setNewsCatId] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminPostDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");

  /* ----- Load admin sections ----- */
  useEffect(() => {
    fetch("/api/admin/sections", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (data.sections) setSections(data.sections);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(`Failed to load admin sections: ${err.message}`);
        setLoading(false);
      });
  }, []);

  /* ----- Load column content ----- */
  const loadColumnContent = useCallback(async (col: AdminColumn) => {
    setContentLoading(true);
    setContentRows([]);
    setProductRows([]);
    setNewsRows([]);

    if (col.dataSource === "news-db") {
      const params = new URLSearchParams({ page: "1", perPage: "50", categoryId: String(col.sourceId) });
      const res = await fetch(`/api/admin/posts?${params}`, { cache: "no-store" });
      const data = (await res.json()) as ListResponse;
      setNewsRows(data.items ?? []);
      setNewsCats(data.categories ?? []);
      setNewsTotal(data.total ?? 0);
      setNewsPages(data.pages ?? 1);
      setNewsPage(1);
      setNewsCatId(String(col.sourceId));
    } else if (col.dataSource === "products") {
      const res = await fetch(`/api/admin/products/${col.sourceId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.rows) setProductRows(data.rows);
    } else {
      const res = await fetch(`/api/admin/content/${col.sourceId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.rows) setContentRows(data.rows);
    }
    setContentLoading(false);
  }, []);

  /* ----- News CRUD ----- */
  async function openEdit(id: number) {
    const res = await fetch(`/api/admin/posts/${id}`, { cache: "no-store" });
    const data = (await res.json()) as { ok: boolean; post?: AdminPostDetail };
    if (data.post) {
      setCreating(false);
      setEditing(data.post);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function removeNews(id: number, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    setNotice(res.ok ? `Article #${id} deleted.` : "Delete failed.");
    if (activeColumn) await loadColumnContent(activeColumn);
  }

  async function togglePublish(row: Row) {
    await fetch(`/api/admin/posts/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: row.title,
        listDate: row.listDate,
        newsDate: row.newsDate,
        excerpt: row.excerpt,
        image: row.image,
        categoryId: row.categoryId,
        isPublished: !row.isPublished,
      }),
    });
    if (activeColumn) await loadColumnContent(activeColumn);
  }

  async function loadNews(page: number, catId: string, q: string) {
    const params = new URLSearchParams({ page: String(page), perPage: "20", categoryId: catId });
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/posts?${params}`, { cache: "no-store" });
    const data = (await res.json()) as ListResponse;
    setNewsRows(data.items ?? []);
    setNewsTotal(data.total ?? 0);
    setNewsPages(data.pages ?? 1);
    setNewsPage(page);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  const totalItems = sections.reduce((sum, s) => sum + s.columns.reduce((sub, c) => sub + c.itemCount, 0), 0);

  return (
    <div className="flex min-h-screen bg-[#f4f5f7]">
      {/* ========== Left Sidebar ========== */}
      <aside className="flex w-[220px] shrink-0 flex-col bg-[#393D49] text-white">
        <div className="flex items-center gap-2 bg-[#23262E] px-4 py-3 text-[14px] font-bold">
          <span className="flex h-8 w-8 items-center justify-center bg-[#e61d39] text-[12px]">AP</span>
          XgxCms
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="px-4 py-8 text-center text-[12px] text-white/50">Loading...</div>
          ) : (
            sections.map((section) => (
              <div key={section.pid} className="border-b border-white/5">
                <button
                  className="flex w-full items-center justify-between px-4 py-[10px] text-left text-[13px] font-bold text-white/90 hover:bg-white/5"
                  onClick={() => {
                    const isOpen = activeSection === section.pid;
                    setActiveSection(isOpen ? null : section.pid);
                  }}
                  type="button"
                >
                  {section.name}
                  <span className="text-[10px] text-white/40">{section.columns.length}</span>
                </button>
                {activeSection === section.pid && (
                  <ul className="bg-black/20">
                    {section.columns.map((col) => (
                      <li key={col.sourceId}>
                        <button
                          className={`flex w-full items-center justify-between px-4 py-[8px] text-left text-[12px] ${
                            activeColumn?.sourceId === col.sourceId
                              ? "bg-[#e61d39] text-white"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                          onClick={() => {
                            setActiveColumn(col);
                            setEditing(null);
                            setCreating(false);
                            void loadColumnContent(col);
                          }}
                          type="button"
                        >
                          <span className="truncate">{col.name}</span>
                          <span className="ml-2 shrink-0 text-[10px] opacity-60">{col.itemCount}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
        <div className="border-t border-white/10 px-4 py-3 text-[11px] text-white/40">
          {totalItems} items total
        </div>
      </aside>

      {/* ========== Right Content Area ========== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between bg-[#23262E] px-4 py-3 text-white">
          <div className="text-[13px] font-bold">
            {activeColumn ? (
              <span className="text-white/80">
                <span className="text-white/50">当前位置：</span>
                <span className="ml-1">内容管理</span>
                <span className="mx-2 text-white/30">/</span>
                <span className="text-white/70">{sections.find((s) => s.pid === activeColumn.parentId)?.name}</span>
                <span className="mx-2 text-white/30">/</span>
                <span className="text-white">{activeColumn.name}</span>
              </span>
            ) : (
              <span className="text-white/60">选择左侧栏目开始管理</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[12px]">
            <span className="text-white/50">signed in as {username}</span>
            <Link className="text-white/70 hover:text-white" href="/" target="_blank">
              查看网站 ↗
            </Link>
            <button className="text-white/70 hover:text-white" onClick={logout} type="button">
              退出
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-5">
          {loadError ? (
            <div className="border border-red-300 bg-red-50 p-6 text-center text-[14px] text-red-700">
              <p className="font-bold">加载失败</p>
              <p className="mt-2 text-[12px]">{loadError}</p>
              <p className="mt-2 text-[12px] text-red-500">请刷新页面重试，或检查数据库连接是否正常。</p>
            </div>
          ) : !activeColumn ? (
            /* Dashboard overview */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((section) => (
                <div key={section.pid} className="border border-[#e3e3e3] bg-white p-5">
                  <h3 className="text-[15px] font-bold text-[#333]">{section.name}</h3>
                  <p className="text-[11px] text-[#999]">{section.nameEn}</p>
                  <div className="mt-3 space-y-[6px]">
                    {section.columns.map((col) => (
                      <button
                        className="flex w-full items-center justify-between text-left text-[12px] text-[#666] hover:text-[#e61d39]"
                        key={col.sourceId}
                        onClick={() => {
                          setActiveSection(section.pid);
                          setActiveColumn(col);
                          void loadColumnContent(col);
                        }}
                        type="button"
                      >
                        <span className="truncate">{col.name}</span>
                        <span className="ml-2 rounded bg-[#f4f4f4] px-1.5 py-[2px] text-[10px] font-bold text-[#888]">
                          {col.itemCount}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : contentLoading ? (
            <div className="py-16 text-center text-[14px] text-[#888]">Loading...</div>
          ) : activeColumn.dataSource === "news-db" ? (
            /* News management (database-backed CRUD) */
            <div>
              {(creating || editing) && activeColumn && (
                <div className="mb-5">
                  <NewsForm
                    categories={newsCats.length > 0 ? newsCats : [{ id: activeColumn.sourceId, slug: "news", name: activeColumn.name }]}
                    defaultCategoryId={activeColumn.sourceId}
                    onCancel={() => { setCreating(false); setEditing(null); }}
                    onSaved={() => {
                      setNotice("Saved. The website is updated immediately.");
                      setCreating(false);
                      setEditing(null);
                      void loadColumnContent(activeColumn);
                    }}
                    post={editing}
                  />
                </div>
              )}

              {/* Toolbar */}
              <div className="mb-3 flex flex-wrap items-center gap-3 border border-[#e3e3e3] bg-white p-3">
                <button
                  className="bg-[#e61d39] px-4 py-[8px] text-[12px] font-bold text-white"
                  onClick={() => { setEditing(null); setCreating(true); }}
                  type="button"
                >
                  + 添加信息
                </button>
                <span className="text-[12px] text-[#888]">
                  {newsTotal} record(s) · page {newsPage} / {newsPages}
                </span>
                {notice ? <span className="text-[12px] text-[#e61d39]">{notice}</span> : null}
              </div>

              {/* News table */}
              <div className="overflow-x-auto border border-[#e3e3e3] bg-white">
                <table className="w-full min-w-[800px] text-left text-[13px]">
                  <thead className="bg-[#fafafa] text-[12px] text-[#888]">
                    <tr>
                      <th className="px-3 py-3">编号</th>
                      <th className="px-3 py-3">排序</th>
                      <th className="px-3 py-3">标题</th>
                      <th className="px-3 py-3">封面图片</th>
                      <th className="px-3 py-3">状态</th>
                      <th className="px-3 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee]">
                    {newsRows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="px-3 py-3 text-[#999]">{row.id}</td>
                        <td className="px-3 py-3 text-[#666]">{row.id * 10}</td>
                        <td className="max-w-[300px] px-3 py-3">
                          <Link className="font-bold text-[#333] hover:text-[#e61d39]" href={`/news/${newsCats.find((c) => c.id === row.categoryId)?.slug ?? "news"}/${row.id}`} target="_blank">
                            {row.title}
                          </Link>
                          <p className="mt-1 line-clamp-1 text-[11px] text-[#888]">{row.excerpt}</p>
                        </td>
                        <td className="px-3 py-3">
                          {row.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt="" className="h-[40px] w-[60px] object-cover" src={row.image} />
                          ) : (
                            <span className="text-[11px] text-[#ccc]">NO PHOTO</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            className={`px-2 py-[3px] text-[11px] font-bold ${row.isPublished ? "bg-[#e6f6ea] text-[#1c7c39]" : "bg-[#f4f4f4] text-[#888]"}`}
                            onClick={() => void togglePublish(row)}
                            type="button"
                          >
                            {row.isPublished ? "正常" : "隐藏"}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <button className="mr-3 text-[12px] text-[#1c6dd0] hover:underline" onClick={() => void openEdit(row.id)} type="button">编辑</button>
                          <button className="text-[12px] text-[#e61d39] hover:underline" onClick={() => void removeNews(row.id, row.title)} type="button">删除</button>
                        </td>
                      </tr>
                    ))}
                    {newsRows.length === 0 && (
                      <tr>
                        <td className="py-8 text-center text-[13px] text-[#888]" colSpan={6}>
                          No articles found. Click "+ 添加信息" to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {newsPages > 1 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
                  <button className="border border-[#ddd] bg-white px-3 py-[7px] disabled:opacity-40" disabled={newsPage <= 1} onClick={() => void loadNews(newsPage - 1, newsCatId, query)} type="button">← 上一页</button>
                  {Array.from({ length: newsPages }, (_, i) => i + 1).filter((v) => Math.abs(v - newsPage) <= 2 || v === 1 || v === newsPages).map((v) => (
                    <button key={v} className={`border px-3 py-[7px] ${v === newsPage ? "border-[#e61d39] bg-[#e61d39] text-white" : "border-[#ddd] bg-white"}`} onClick={() => void loadNews(v, newsCatId, query)} type="button">{v}</button>
                  ))}
                  <button className="border border-[#ddd] bg-white px-3 py-[7px] disabled:opacity-40" disabled={newsPage >= newsPages} onClick={() => void loadNews(newsPage + 1, newsCatId, query)} type="button">下一页 →</button>
                </div>
              )}
            </div>
          ) : activeColumn.dataSource === "products" ? (
            /* Products management (read-only from site-seed.json) */
            <div>
              <div className="mb-3 flex items-center gap-3 border border-[#e3e3e3] bg-white p-3">
                <span className="text-[12px] text-[#888]">{productRows.length} products in this category</span>
                <span className="rounded bg-[#f4f4f4] px-2 py-[3px] text-[11px] font-bold text-[#888]">{displayTypeName(activeColumn.displayType)}</span>
              </div>
              <div className="overflow-x-auto border border-[#e3e3e3] bg-white">
                <table className="w-full min-w-[900px] text-left text-[13px]">
                  <thead className="bg-[#fafafa] text-[12px] text-[#888]">
                    <tr>
                      <th className="px-3 py-3">编号</th>
                      <th className="px-3 py-3">排序</th>
                      <th className="px-3 py-3">标题</th>
                      <th className="px-3 py-3">封面图片</th>
                      <th className="px-3 py-3">子分类</th>
                      <th className="px-3 py-3">状态</th>
                      <th className="px-3 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee]">
                    {productRows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="px-3 py-3 text-[#999]">{row.id}</td>
                        <td className="px-3 py-3 text-[#666]">{row.sort}</td>
                        <td className="max-w-[280px] px-3 py-3">
                          <span className="font-bold text-[#333]">{row.title}</span>
                          {row.subtitle && <p className="mt-1 text-[11px] text-[#888]">{row.subtitle}</p>}
                        </td>
                        <td className="px-3 py-3">
                          {row.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt="" className="h-[40px] w-[60px] object-cover" src={row.image} />
                          ) : (
                            <span className="text-[11px] text-[#ccc]">NO PHOTO</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-[#666]">{row.subCategory}</td>
                        <td className="px-3 py-3">
                          <span className="bg-[#e6f6ea] px-2 py-[3px] text-[11px] font-bold text-[#1c7c39]">正常</span>
                        </td>
                        <td className="px-3 py-3">
                          <Link className="text-[12px] text-[#1c6dd0] hover:underline" href={`/products/${activeColumn.sourceId}`} target="_blank">查看</Link>
                        </td>
                      </tr>
                    ))}
                    {productRows.length === 0 && (
                      <tr><td className="py-8 text-center text-[13px] text-[#888]" colSpan={7}>No products found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Static content management (read-only from site-seed.json) */
            <div>
              <div className="mb-3 flex items-center gap-3 border border-[#e3e3e3] bg-white p-3">
                <span className="text-[12px] text-[#888]">{contentRows.length} items</span>
                <span className="rounded bg-[#f4f4f4] px-2 py-[3px] text-[11px] font-bold text-[#888]">{displayTypeName(activeColumn.displayType)}</span>
                <span className="text-[11px] text-[#aaa]">sourceId: {activeColumn.sourceId}</span>
              </div>
              <div className="overflow-x-auto border border-[#e3e3e3] bg-white">
                <table className="w-full min-w-[800px] text-left text-[13px]">
                  <thead className="bg-[#fafafa] text-[12px] text-[#888]">
                    <tr>
                      <th className="px-3 py-3">编号</th>
                      <th className="px-3 py-3">排序</th>
                      <th className="px-3 py-3">标题</th>
                      <th className="px-3 py-3">封面图片</th>
                      <th className="px-3 py-3">状态</th>
                      <th className="px-3 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee]">
                    {contentRows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="px-3 py-3 text-[#999]">{row.id}</td>
                        <td className="px-3 py-3 text-[#666]">{row.sort}</td>
                        <td className="max-w-[300px] px-3 py-3 font-bold text-[#333]">{row.title}</td>
                        <td className="px-3 py-3">
                          {row.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt="" className="h-[40px] w-[60px] object-cover" src={row.image} />
                          ) : (
                            <span className="text-[11px] text-[#ccc]">NO PHOTO</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className="bg-[#e6f6ea] px-2 py-[3px] text-[11px] font-bold text-[#1c7c39]">{row.status}</span>
                        </td>
                        <td className="px-3 py-3">
                          {activeColumn.parentId === 1 && (
                            <Link className="text-[12px] text-[#1c6dd0] hover:underline" href={`/about?id=${activeColumn.sourceId}`} target="_blank">查看</Link>
                          )}
                          {activeColumn.parentId === 42 && (
                            <Link className="text-[12px] text-[#1c6dd0] hover:underline" href="/downloads" target="_blank">查看</Link>
                          )}
                          {activeColumn.parentId === 44 && (
                            <Link className="text-[12px] text-[#1c6dd0] hover:underline" href="/product-lines" target="_blank">查看</Link>
                          )}
                          {activeColumn.parentId === 53 && (
                            <Link className="text-[12px] text-[#1c6dd0] hover:underline" href="/cases" target="_blank">查看</Link>
                          )}
                          {activeColumn.parentId === 78 && (
                            <Link className="text-[12px] text-[#1c6dd0] hover:underline" href="/service" target="_blank">查看</Link>
                          )}
                          {activeColumn.parentId === 29 && (
                            <Link className="text-[12px] text-[#1c6dd0] hover:underline" href="/contact" target="_blank">查看</Link>
                          )}
                          {activeColumn.parentId === 20 && (
                            <Link className="text-[12px] text-[#1c6dd0] hover:underline" href="/" target="_blank">查看</Link>
                          )}
                        </td>
                      </tr>
                    ))}
                    {contentRows.length === 0 && (
                      <tr><td className="py-8 text-center text-[13px] text-[#888]" colSpan={6}>No content found for this section.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
