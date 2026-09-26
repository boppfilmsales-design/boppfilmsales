"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import NewsForm, { type AdminCategory, type AdminPostDetail } from "@/components/admin/NewsForm";
import ProductForm, { type AdminProductDetail } from "@/components/admin/ProductForm";
import ContentForm from "@/components/admin/ContentForm";
import MessageBoard from "@/components/admin/MessageBoard";
import SiteSettings from "@/components/admin/SiteSettings";
import RoleManager from "@/components/admin/RoleManager";
import AdminUsers from "@/components/admin/AdminUsers";
import InfoTransfer from "@/components/admin/InfoTransfer";
import type { SiteContent } from "@/lib/site-types";

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
  /** DB id of the requested column (the sidebar's sourceId -> news_categories.id). */
  resolvedCategoryId?: number | null;
  total: number;
  page: number;
  pages: number;
  /** Present when the query failed (e.g. Neon quota exceeded). */
  error?: string;
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
  titleZh: string;
  image: string;
  imageCount: number;
  excerpt: string;
  status: string;
};

type ProductRow = {
  id: number;
  categoryId: number;
  sort: number;
  title: string;
  subtitle: string;
  image: string;
  subCategory: string;
  status: string;
};

type ProductCategory = AdminCategory & {
  nameZh?: string;
  itemCount?: number;
};

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

/* ---------- Helpers ---------- */

/**
 * Structure of the legacy 「高级管理」 root, mirroring the source panel:
 *   高级管理 → 留言板
 *   系统管理 → 站点设置 / 信息转移
 *   权限管理 → 角色管理 / 管理员
 */
const ADVANCED_TREE: { key: string; name: string; items: { key: string; name: string }[] }[] = [
  {
    key: "message-board",
    name: "留言板",
    items: [{ key: "messages", name: "留言板" }],
  },
  {
    key: "system",
    name: "系统管理",
    items: [
      { key: "settings", name: "站点设置" },
      { key: "transfer", name: "信息转移" },
    ],
  },
  {
    key: "permission",
    name: "权限管理",
    items: [
      { key: "roles", name: "角色管理" },
      { key: "users", name: "管理员" },
    ],
  },
];

function advancedTabName(key: string): string {
  for (const group of ADVANCED_TREE) {
    const item = group.items.find((i) => i.key === key);
    if (item) return `${group.name} / ${item.name}`;
  }
  return "高级管理";
}


/** Bilingual column name helper - shows English / Chinese */
function colDisplayName(name: string): string {
  const zh: Record<string, string> = {
    "About Us": "\u5173\u4e8e\u6211\u4eec", "Main Products": "\u4e3b\u8425\u4ea7\u54c1", "Honor": "\u8363\u8a89\u8d44\u8d28", "Culture": "\u4f01\u4e1a\u6587\u5316", "Branch Companies": "\u5206\u516c\u53f8", "Factory & Warehouse": "\u5de5\u5382\u4e0e\u4ed3\u5e93", "Course": "\u53d1\u5c55\u5386\u7a0b", "Industry News": "\u884c\u4e1a\u65b0\u95fb", "Company News": "\u516c\u53f8\u65b0\u95fb", "Employees Literary": "\u5458\u5de5\u6587\u5b66", "General Information": "\u57fa\u672c\u4fe1\u606f", "Get Contacts": "\u8054\u7cfb\u65b9\u5f0f", "Send Inquiry": "\u53d1\u9001\u8be2\u76d8", "Give Advice To Seller": "\u7ed9\u5356\u5bb6\u5efa\u8bae", "Company's Notice": "\u516c\u53f8\u516c\u544a", "Technology Data Download": "\u6280\u672f\u8d44\u6599\u4e0b\u8f7d", "Certificate Download": "\u8bc1\u4e66\u4e0b\u8f7d", "MSDS Download": "MSDS\u4e0b\u8f7d", "Development Cases": "\u53d1\u5c55\u6848\u4f8b", "To Buyers": "\u81f4\u4e70\u5bb6", "To Markets": "\u81f4\u5e02\u573a", "To Ourselves": "\u81f4\u81ea\u5df1", "Useful Links Service": "\u5b9e\u7528\u94fe\u63a5\u670d\u52a1", "Company Announcement": "\u516c\u53f8\u516c\u544a", "Useful Knowledge": "\u5b9e\u7528\u77e5\u8bc6", "Vessel Shipping Lines": "\u8239\u8fd0\u822a\u7ebf", "Packing Film Production Lines": "\u5305\u88c5\u819c\u751f\u4ea7\u7ebf", "BOPP Film Production Lines": "BOPP\u819c\u751f\u4ea7\u7ebf", "BOPET Film Production Lines": "BOPET\u819c\u751f\u4ea7\u7ebf", "Tape Production Lines": "\u80f6\u5e26\u751f\u4ea7\u7ebf", "Thermal Lamination Film Production Lines": "\u70ed\u590d\u5408\u819c\u751f\u4ea7\u7ebf", "Bruckner Production Lines (Germany)": "Bruckner\u751f\u4ea7\u7ebf(\u5fb7\u56fd)", "Mitsubishi Production Lines (Japan)": "\u4e09\u83f1\u751f\u4ea7\u7ebf(\u65e5\u672c)", "Copy Paper Production Lines": "\u590d\u5370\u7eb8\u751f\u4ea7\u7ebf", "Silver Metallized Film Production Lines": "\u9540\u94dd\u819c\u751f\u4ea7\u7ebf", "POF Film Production Lines": "POF\u819c\u751f\u4ea7\u7ebf",  };
  return zh[name] ? `${name} / ${zh[name]}` : name;
}

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
  /**
   * Top-level navigation: the legacy panel has two roots —
   * 「内容管理」(this component's column browser) and 「高级管理」
   * (留言板 / 系统管理 / 权限管理). `mode` switches between them.
   */
  const [mode, setMode] = useState<"content" | "advanced">("content");
  const [advancedTab, setAdvancedTab] = useState<string>("messages");
  const [activeSection, setActiveSection] = useState<number | null>(1);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  const [activeColumn, setActiveColumn] = useState<AdminColumn | null>(null);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentRows, setContentRows] = useState<StaticRow[]>([]);
  const [selectedContent, setSelectedContent] = useState<SiteContent | null>(null);
  const [contentEditing, setContentEditing] = useState(false);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [productCats, setProductCats] = useState<ProductCategory[]>([]);
  const [productCatFilter, setProductCatFilter] = useState<number | null>(null);
  const [productKeyword, setProductKeyword] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productEditing, setProductEditing] = useState<AdminProductDetail | null>(null);
  const [productCreating, setProductCreating] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // News management state
  const [newsRows, setNewsRows] = useState<Row[]>([]);
  const [inquiryRows, setInquiryRows] = useState<InquiryRow[]>([]);
  const [newsCats, setNewsCats] = useState<AdminCategory[]>([]);
  const [newsTotal, setNewsTotal] = useState(0);
  const [newsPages, setNewsPages] = useState(1);
  const [newsPage, setNewsPage] = useState(1);
  const [newsCatId, setNewsCatId] = useState("all");
  /** DB id of the news column currently open (sourceId is resolved to this). */
  const [newsColumnId, setNewsColumnId] = useState(0);
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
    setSelectedContent(null);
    setContentEditing(false);
    setProductRows([]);
    setNewsRows([]);
    setInquiryRows([]);
    setProductEditing(null);
    setProductCreating(false);
    setSelectedProducts([]);
    setProductCatFilter(null);

    if (col.dataSource === "inquiries") {
      const res = await fetch("/api/admin/inquiries", { cache: "no-store" });
      const data = await res.json() as { rows?: InquiryRow[] };
      setInquiryRows(data.rows ?? []);
    } else if (col.dataSource === "news-db") {
      // Query by the columns' *legacy* sourceId (41/49/52); the API resolves
      // it to the news_categories.id FK and tells us which one it picked.
      const params = new URLSearchParams({ page: "1", perPage: "20", categoryId: String(col.sourceId) });
      const res = await fetch(`/api/admin/posts?${params}`, { cache: "no-store" });
      const data = (await res.json()) as ListResponse;
      setNewsRows(data.items ?? []);
      setNewsCats(data.categories ?? []);
      setNewsTotal(data.total ?? 0);
      setNewsPages(data.pages ?? 1);
      setNewsPage(1);
      setNewsCatId(String(data.resolvedCategoryId ?? data.categories?.[0]?.id ?? col.sourceId));
      setNewsColumnId(data.resolvedCategoryId ?? data.categories?.[0]?.id ?? 0);
      // A DB outage (e.g. Neon quota exceeded) must not silently look empty.
      if (!res.ok || data.ok === false) {
        setNotice(
          `数据库读取失败：${data.error ?? `HTTP ${res.status}`}。请到 Neon 控制台检查项目配额（Usage / Limits）。`,
        );
      }
    } else if (col.dataSource === "products") {
      const res = await fetch(`/api/admin/products/${col.sourceId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.rows) setProductRows(data.rows);
      setProductCats(data.category?.categories ?? []);
      setProductCatFilter(null);
    } else {
      const res = await fetch(`/api/admin/content/${col.sourceId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.rows) setContentRows(data.rows);
      if (data.content) setSelectedContent(data.content as SiteContent);
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

  async function openProductEdit(id: number) {
    const res = await fetch(`/api/admin/products/item/${id}`, { cache: "no-store" });
    const data = (await res.json()) as { ok: boolean; product?: AdminProductDetail };
    if (data.product) {
      setProductCreating(false);
      setProductEditing(data.product);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function removeProduct(id: number, title: string) {
    if (!window.confirm(`确定删除“${title}”吗？此操作不可恢复。`)) return;
    const res = await fetch(`/api/admin/products/item/${id}`, { method: "DELETE" });
    setNotice(res.ok ? `产品 #${id} 已删除。` : "删除失败。");
    if (activeColumn) await loadColumnContent(activeColumn);
  }

  function toggleProductSelection(id: number) {
    setSelectedProducts((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  }

  function toggleAllProducts() {
    const visibleRows = productRows.filter((row) => productCatFilter === null || row.categoryId === productCatFilter);
    const visibleIds = visibleRows.map((row) => row.id);
    setSelectedProducts((current) => visibleIds.every((id) => current.includes(id))
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  }

  async function bulkProductAction(action: "delete" | "status", status?: string) {
    if (selectedProducts.length === 0) {
      setNotice("请先选择产品。");
      return;
    }
    if (action === "delete" && !window.confirm(`确定删除选中的 ${selectedProducts.length} 个产品吗？`)) return;
    const response = await fetch("/api/admin/products", {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "delete" ? { ids: selectedProducts } : { ids: selectedProducts, status }),
    });
    const data = await response.json() as { ok?: boolean; error?: string; count?: number };
    setNotice(data.ok ? `已处理 ${data.count ?? 0} 个产品。` : (data.error ?? "操作失败。"));
    if (data.ok && activeColumn) await loadColumnContent(activeColumn);
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

  /** Client-side keyword filter over the column currently open. */
  async function runNewsSearch(term: string) {
    setQuery(term);
    await loadNews(1, newsCatId, term);
  }

  async function updateInquiry(id: number, status: string) {
    await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (activeColumn) await loadColumnContent(activeColumn);
  }

  async function removeInquiry(id: number) {
    if (!window.confirm("确定删除这条客户询盘吗？")) return;
    await fetch("/api/admin/inquiries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (activeColumn) await loadColumnContent(activeColumn);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  const totalItems = sections.reduce((sum, s) => sum + s.columns.reduce((sub, c) => sub + c.itemCount, 0), 0);

  /* Summary badge for the currently open column — mirrors what the front end
     actually renders, so an editor can see at a glance whether the column has
     a body / gallery / list before opening the form. */
  const columnPreview = selectedContent ?? null;
  const columnPreviewLabel = (() => {
    if (!columnPreview) return "";
    const items = columnPreview.items;
    if (Array.isArray(items)) {
      return `${items.length} 个列表条目 · ${columnPreview.entries?.length ?? 0} 条详情`;
    }
    const block = (items ?? {}) as { bodyHtml?: string; images?: string[] };
    const chars = (block.bodyHtml ?? "").replace(/<[^>]+>/g, "").trim().length;
    const images = block.images?.length ?? 0;
    return `正文 ${chars} 字 · 配图 ${images} 张`;
  })();

  return (
    <div className="flex min-h-screen bg-[#f4f5f7]">
      {/* ========== Left Sidebar ========== */}
      <aside className="flex w-[220px] shrink-0 flex-col bg-[#393D49] text-white">
        <div className="flex items-center gap-2 bg-[#23262E] px-4 py-3 text-[14px] font-bold">
          <span className="flex h-8 w-8 items-center justify-center bg-[#e61d39] text-[12px]">AP</span>
          XgxCms
        </div>

        {/* Top-level roots: 内容管理 / 高级管理 */}
        <div className="flex border-b border-white/10 bg-[#2f333d]">
          {(
            [
              ["content", "内容管理"],
              ["advanced", "高级管理"],
            ] as const
          ).map(([key, label]) => (
            <button
              className={`flex-1 py-[10px] text-[12px] font-bold transition-colors ${
                mode === key ? "bg-[#e61d39] text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
              key={key}
              onClick={() => {
                setMode(key);
                setNotice("");
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {mode === "advanced" ? (
            ADVANCED_TREE.map((group) => (
              <div key={group.key} className="border-b border-white/5">
                <div className="px-4 py-[10px] text-[12px] font-bold text-white/90">{group.name}</div>
                <ul className="bg-black/20">
                  {group.items.map((item) => (
                    <li key={item.key}>
                      <button
                        className={`flex w-full items-center justify-between px-4 py-[8px] text-left text-[12px] ${
                          advancedTab === item.key
                            ? "bg-[#e61d39] text-white"
                            : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                        onClick={() => {
                          setAdvancedTab(item.key);
                          setNotice("");
                          setLoadError("");
                        }}
                        type="button"
                      >
                        <span className="truncate">{item.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : loading ? (
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
                          <span className="truncate">{colDisplayName(col.name)}</span>
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
            {mode === "advanced" ? (
              <span className="text-white/80">
                <span className="text-white/50">当前位置：</span>
                <span className="ml-1">高级管理</span>
                <span className="mx-2 text-white/30">/</span>
                <span className="text-white">{advancedTabName(advancedTab)}</span>
              </span>
            ) : activeColumn ? (
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
          {mode === "advanced" ? (
            advancedTab === "messages" ? (
              <MessageBoard username={username} />
            ) : advancedTab === "settings" ? (
              <SiteSettings />
            ) : advancedTab === "transfer" ? (
              <InfoTransfer />
            ) : advancedTab === "roles" ? (
              <RoleManager />
            ) : (
              <AdminUsers currentUser={username} />
            )
          ) : loadError ? (
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
                  <h3 className="flex cursor-pointer items-center justify-between text-[15px] font-bold text-[#333]" onClick={() => { const next = new Set(collapsedSections); if (next.has(section.pid)) next.delete(section.pid); else next.add(section.pid); setCollapsedSections(next); }}><span>{section.name}</span><span className="text-[12px] text-[#aaa]">{collapsedSections.has(section.pid) ? "▶" : "▼"}</span></h3>
                                    {!collapsedSections.has(section.pid) && (<div className="mt-3 space-y-[6px]">
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
                        <span className="truncate">{colDisplayName(col.name)}</span>
                        <span className="ml-2 rounded bg-[#f4f4f4] px-1.5 py-[2px] text-[10px] font-bold text-[#888]">
                          {col.itemCount}
                        </span>
                      </button>
                    ))}
                  </div>)}
                </div>
              ))}
            </div>
          ) : contentLoading ? (
            <div className="py-16 text-center text-[14px] text-[#888]">Loading...</div>
          ) : activeColumn.dataSource === "inquiries" ? (
            <div className="overflow-x-auto border border-[#e3e3e3] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eee] p-4">
                <div>
                  <h2 className="text-[16px] font-bold text-[#333]">客户询盘</h2>
                  <p className="mt-1 text-[12px] text-[#888]">
                    共 {inquiryRows.length} 条记录 · 回复与公开审核请到
                    <button
                      className="ml-1 text-[#1c6dd0] hover:underline"
                      onClick={() => { setMode("advanced"); setAdvancedTab("messages"); }}
                      type="button"
                    >
                      高级管理 → 留言板
                    </button>
                  </p>
                </div>
              </div>
              <table className="w-full min-w-[1080px] text-left text-[13px]">
                <thead className="bg-[#fafafa] text-[12px] text-[#888]">
                  <tr>
                    <th className="px-3 py-3">时间</th>
                    <th className="px-3 py-3">客户</th>
                    <th className="px-3 py-3">电话</th>
                    <th className="px-3 py-3">邮箱</th>
                    <th className="px-3 py-3">留言</th>
                    <th className="px-3 py-3">状态</th>
                    <th className="px-3 py-3">公开</th>
                    <th className="px-3 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee]">
                  {inquiryRows.map((row) => (
                    <tr className="align-top" key={row.id}>
                      <td className="whitespace-nowrap px-3 py-3 text-[#888]">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-3"><strong>{row.contact || "（未填写）"}</strong>{row.company && row.company !== row.contact ? <div className="text-[11px] text-[#888]">{row.company}</div> : null}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {row.phone ? <a className="text-[#1c6dd0]" href={`tel:${row.phone.replace(/[^\d+]/g, "")}`}>{row.phone}</a> : <span className="text-[#bbb]">—</span>}
                      </td>
                      <td className="px-3 py-3"><a className="text-[#1c6dd0]" href={`mailto:${row.email}`}>{row.email}</a></td>
                      <td className="max-w-[360px] whitespace-pre-wrap px-3 py-3 text-[#555]">{row.message}</td>
                      <td className="px-3 py-3">
                        <select className="border border-[#ddd] px-2 py-1 text-[12px]" onChange={(event) => void updateInquiry(row.id, event.target.value)} value={row.status}>
                          <option value="new">新询盘</option>
                          <option value="processing">处理中</option>
                          <option value="replied">已回复</option>
                          <option value="archived">已归档</option>
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {row.isPublic ? <span className="bg-[#e6f6ea] px-2 py-[2px] text-[10px] font-bold text-[#1c7c39]">公开中</span> : <span className="text-[11px] text-[#bbb]">未公开</span>}
                      </td>
                      <td className="px-3 py-3">
                        <button className="text-[12px] text-[#e61d39] hover:underline" onClick={() => void removeInquiry(row.id)} type="button">删除</button>
                      </td>
                    </tr>
                  ))}
                  {inquiryRows.length === 0 ? <tr><td className="py-10 text-center text-[#888]" colSpan={8}>暂无客户询盘</td></tr> : null}
                </tbody>
              </table>
            </div>
          ) : activeColumn.dataSource === "news-db" ? (
            /* News management (database-backed CRUD) */
            <div>
              {(creating || editing) && activeColumn && (
                <div className="mb-5">
                  <NewsForm
                    // Remount per article so the editor picks up the newly
                    // loaded body instead of syncing it in an effect.
                    key={editing ? `post-${editing.id}` : "new"}
                    categories={newsCats.length > 0 ? newsCats : [{ id: newsColumnId, slug: "news", name: activeColumn.name }]}
                    defaultCategoryId={newsColumnId || newsCats[0]?.id}
                    onCancel={() => { setCreating(false); setEditing(null); }}
                    onSaved={() => {
                      setNotice("已保存，前台立即生效。");
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
                <input
                  className="w-[200px] border border-[#ddd] px-3 py-[7px] text-[12px] outline-none focus:border-[#e61d39]"
                  onChange={(event) => setKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void runNewsSearch(keyword.trim());
                  }}
                  placeholder="搜索标题 / 正文，回车执行"
                  value={keyword}
                />
                <button
                  className="border border-[#ddd] px-3 py-[7px] text-[12px] text-[#666] hover:border-[#e61d39] hover:text-[#e61d39]"
                  onClick={() => void runNewsSearch(keyword.trim())}
                  type="button"
                >
                  搜索
                </button>
                {query ? (
                  <button
                    className="text-[12px] text-[#1c6dd0] hover:underline"
                    onClick={() => { setKeyword(""); void runNewsSearch(""); }}
                    type="button"
                  >
                    清除「{query}」
                  </button>
                ) : null}
                <span className="text-[12px] text-[#888]">
                  共 {newsTotal} 条 · 第 {newsPage} / {newsPages} 页
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
                          {query ? `没有匹配「${query}」的文章。` : "此栏目暂无文章，点击「+ 添加信息」新建一条。"}
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
            /* Products management */
            <div>
              {(productCreating || productEditing) && (
                <div className="mb-5">
                  <ProductForm
                    categories={productCats}
                    defaultCategoryId={productEditing?.categoryId ?? productCats[0]?.id}
                    familyId={activeColumn.sourceId}
                    key={productEditing?.id ?? "new"}
                    onCancel={() => { setProductCreating(false); setProductEditing(null); }}
                    onSaved={() => {
                      setNotice("产品已保存。");
                      setProductCreating(false);
                      setProductEditing(null);
                      void loadColumnContent(activeColumn);
                    }}
                    product={productEditing}
                  />
                </div>
              )}
              <div className="mb-3 flex items-center gap-3 border border-[#e3e3e3] bg-white p-3">
                <button
                  className="bg-[#e61d39] px-4 py-[8px] text-[12px] font-bold text-white"
                  onClick={() => { setProductEditing(null); setProductCreating(true); }}
                  type="button"
                >
                  + 添加产品
                </button>
                <input className="border border-[#ddd] px-3 py-[7px] text-[12px] text-[#666] outline-none focus:border-[#e61d39]" value={productKeyword} onChange={(e) => setProductKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setProductSearch(productKeyword.trim()); }} placeholder="搜索产品标题" type="text" />
                <span className="text-[12px] text-[#888]">
                  {productRows.filter((row) => (productCatFilter === null || row.categoryId === productCatFilter) && (!productSearch || row.title.toLowerCase().includes(productSearch.toLowerCase()))).length} products in this category
                </span>
                <span className="rounded bg-[#f4f4f4] px-2 py-[3px] text-[11px] font-bold text-[#888]">{displayTypeName(activeColumn.displayType)}</span>
                <button className="border border-[#ddd] px-3 py-[7px] text-[12px] text-[#666] disabled:opacity-40" disabled={selectedProducts.length === 0} onClick={() => void bulkProductAction("delete")} type="button">批量删除</button>
                <select className="border border-[#ddd] px-2 py-[6px] text-[12px] text-[#666]" defaultValue="" onChange={(event) => { const value = event.target.value; event.target.value = ""; if (value) void bulkProductAction("status", value); }}>
                  <option value="">批量设置状态</option>
                  <option value="正常">正常</option>
                  <option value="置顶">置顶</option>
                  <option value="下架">下架</option>
                </select>
                {notice ? <span className="text-[12px] text-[#e61d39]">{notice}</span> : null}
              </div>
              {productCats.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-1 border-b border-[#ddd] bg-white px-2 pt-2">
                  <button
                    className={`border-b-2 px-3 py-2 text-[12px] ${productCatFilter === null ? "border-[#e61d39] font-bold text-[#e61d39]" : "border-transparent text-[#666]"}`}
                    onClick={() => { setProductCatFilter(null); setSelectedProducts([]); }}
                    type="button"
                  >
                    全部产品 ({productRows.length})
                  </button>
                  {productCats.map((cat) => {
                    const count = productRows.filter((row) => row.categoryId === cat.id).length;
                    return (
                      <button
                        className={`border-b-2 px-3 py-2 text-left text-[12px] ${productCatFilter === cat.id ? "border-[#e61d39] font-bold text-[#e61d39]" : "border-transparent text-[#666]"}`}
                        key={cat.id}
                        onClick={() => { setProductCatFilter(cat.id); setSelectedProducts([]); }}
                        type="button"
                      >
                        {cat.name} ({count})
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <div className="overflow-x-auto border border-[#e3e3e3] bg-white">
                <table className="w-full min-w-[900px] text-left text-[13px]">
                  <thead className="bg-[#fafafa] text-[12px] text-[#888]">
                    <tr>
                      <th className="px-3 py-3"><input aria-label="全选产品" checked={productRows.filter((row) => productCatFilter === null || row.categoryId === productCatFilter).length > 0 && productRows.filter((row) => productCatFilter === null || row.categoryId === productCatFilter).every((row) => selectedProducts.includes(row.id))} onChange={toggleAllProducts} type="checkbox" /></th>
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
                    {productRows.filter((row) => (productCatFilter === null || row.categoryId === productCatFilter) && (!productSearch || row.title.toLowerCase().includes(productSearch.toLowerCase()))).map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="px-3 py-3"><input aria-label={`选择产品 ${row.title}`} checked={selectedProducts.includes(row.id)} onChange={() => toggleProductSelection(row.id)} type="checkbox" /></td>
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
                          <span className={`px-2 py-[3px] text-[11px] font-bold ${row.status === "下架" ? "bg-[#f4f4f4] text-[#888]" : row.status === "置顶" ? "bg-[#fff5d6] text-[#9a6b00]" : "bg-[#e6f6ea] text-[#1c7c39]"}`}>{row.status}</span>
                        </td>
                        <td className="px-3 py-3">
                          <button className="mr-3 text-[12px] text-[#1c6dd0] hover:underline" onClick={() => void openProductEdit(row.id)} type="button">编辑</button>
                          <button className="text-[12px] text-[#e61d39] hover:underline" onClick={() => void removeProduct(row.id, row.title)} type="button">删除</button>
                          <Link className="ml-3 text-[12px] text-[#666] hover:underline" href={`/products/${activeColumn.sourceId}`} target="_blank">查看</Link>
                        </td>
                      </tr>
                    ))}
                    {productRows.filter((row) => productCatFilter === null || row.categoryId === productCatFilter).length === 0 && (
                      <tr><td className="py-8 text-center text-[13px] text-[#888]" colSpan={8}>No products found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Database-backed content management (About Us / About, Honor,
               Download, Product lines, Cases, Service columns) */
            <div>
              {selectedContent && contentEditing ? (
                <ContentForm
                  content={selectedContent}
                  onCancel={() => setContentEditing(false)}
                  onSaved={() => {
                    setNotice("栏目内容已保存。");
                    setContentEditing(false);
                    void loadColumnContent(activeColumn);
                  }}
                />
              ) : null}
              <div className="mb-3 flex flex-wrap items-center gap-3 border border-[#e3e3e3] bg-white p-3">
                {selectedContent ? (
                  <button
                    className="bg-[#e61d39] px-4 py-[8px] text-[12px] font-bold text-white"
                    onClick={() => setContentEditing(true)}
                    type="button"
                  >
                    编辑栏目内容
                  </button>
                ) : null}
                <span className="text-[12px] text-[#888]">{contentRows.length} 条记录</span>
                <span className="rounded bg-[#f4f4f4] px-2 py-[3px] text-[11px] font-bold text-[#888]">
                  {displayTypeName(activeColumn.displayType)}
                </span>
                {columnPreview ? (
                  <span className="rounded bg-[#fff5d6] px-2 py-[3px] text-[11px] text-[#9a6b00]">
                    {columnPreviewLabel}
                  </span>
                ) : null}
                <span className="text-[11px] text-[#aaa]">sourceId: {activeColumn.sourceId}</span>
                {notice ? <span className="text-[12px] text-[#e61d39]">{notice}</span> : null}
              </div>
              <div className="overflow-x-auto border border-[#e3e3e3] bg-white">
                <table className="w-full min-w-[940px] text-left text-[13px]">
                  <thead className="bg-[#fafafa] text-[12px] text-[#888]">
                    <tr>
                      <th className="px-3 py-3">编号</th>
                      <th className="px-3 py-3">排序</th>
                      <th className="px-3 py-3">栏目名称</th>
                      <th className="px-3 py-3">正文摘要</th>
                      <th className="px-3 py-3">配图</th>
                      <th className="px-3 py-3">状态</th>
                      <th className="px-3 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee]">
                    {contentRows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="px-3 py-3 text-[#999]">{row.id}</td>
                        <td className="px-3 py-3 text-[#666]">{row.sort}</td>
                        <td className="max-w-[220px] px-3 py-3">
                          <span className="font-bold text-[#333]">{row.title}</span>
                          {row.titleZh ? (
                            <p className="mt-1 text-[11px] text-[#888]">{row.titleZh}</p>
                          ) : null}
                        </td>
                        <td className="max-w-[380px] px-3 py-3 text-[12px] leading-[20px] text-[#666]">
                          {row.excerpt ? (
                            <span className="line-clamp-2">{row.excerpt}</span>
                          ) : (
                            <span className="text-[#ccc]">（暂无正文）</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {row.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img alt="" className="h-[40px] w-[60px] object-cover" src={row.image} />
                            ) : (
                              <span className="text-[11px] text-[#ccc]">NO PHOTO</span>
                            )}
                            {row.imageCount > 0 ? (
                              <span className="rounded bg-[#f4f4f4] px-1.5 py-[2px] text-[10px] font-bold text-[#888]">
                                ×{row.imageCount}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="bg-[#e6f6ea] px-2 py-[3px] text-[11px] font-bold text-[#1c7c39]">{row.status}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <button
                            className="mr-3 text-[12px] text-[#1c6dd0] hover:underline"
                            onClick={() => setContentEditing(true)}
                            type="button"
                          >
                            编辑
                          </button>
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
                      <tr><td className="py-8 text-center text-[13px] text-[#888]" colSpan={7}>此栏目暂无内容。</td></tr>
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
