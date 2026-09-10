"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import NewsForm, { type AdminCategory, type AdminPostDetail } from "@/components/admin/NewsForm";

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

export default function Dashboard({ username }: { username: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminPostDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), categoryId, perPage: "20" });
    if (query) params.set("q", query);
    const response = await fetch(`/api/admin/posts?${params.toString()}`, { cache: "no-store" });
    if (response.status === 401) {
      window.location.reload();
      return;
    }
    const data = (await response.json()) as ListResponse;
    setRows(data.items ?? []);
    setCategories(data.categories ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [categoryId, page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openEdit(id: number) {
    const response = await fetch(`/api/admin/posts/${id}`, { cache: "no-store" });
    const data = (await response.json()) as { ok: boolean; post?: AdminPostDetail };
    if (data.post) {
      setCreating(false);
      setEditing(data.post);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function remove(id: number, title: string) {
    if (!window.confirm(`Delete "${title}" ? This cannot be undone.`)) return;
    const response = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    setNotice(response.ok ? `Article #${id} deleted.` : "Delete failed.");
    await load();
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
    await load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  const categoryName = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <div className="bg-[#22262e] text-white">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 text-[14px] font-bold">
            <span className="flex h-8 w-8 items-center justify-center bg-[#e61d39] text-[12px]">AP</span>
            News Site Background
            <span className="text-[12px] font-normal text-white/60">signed in as {username}</span>
          </div>
          <div className="flex items-center gap-3 text-[12px]">
            <Link className="hover:underline" href="/news" target="_blank">
              View website ↗
            </Link>
            <Link className="hover:underline" href="/api/news" target="_blank">
              News API ↗
            </Link>
            <button className="border border-white/30 px-3 py-1 hover:bg-white/10" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-4 py-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {categories.map((category) => (
            <div className="border border-[#e3e3e3] bg-white p-4" key={category.id}>
              <p className="text-[12px] uppercase tracking-[1px] text-[#999]">{category.name}</p>
              <p className="mt-1 text-[22px] font-bold text-[#333]">
                {rows.filter((row) => row.categoryId === category.id).length}
                <span className="text-[12px] font-normal text-[#aaa]"> on this page</span>
              </p>
              <Link
                className="text-[12px] text-[#e61d39] hover:underline"
                href={`/news?category=${category.slug}`}
                target="_blank"
              >
                /news?category={category.slug} ↗
              </Link>
            </div>
          ))}
        </div>

        {(creating || editing) && (
          <div className="mt-6">
            <NewsForm
              categories={categories}
              defaultCategoryId={categories[0]?.id}
              onCancel={() => {
                setCreating(false);
                setEditing(null);
              }}
              onSaved={() => {
                setNotice("Saved. The website is updated immediately.");
                setCreating(false);
                setEditing(null);
                void load();
              }}
              post={editing}
            />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border border-[#e3e3e3] bg-white p-4">
          <button
            className="bg-[#e61d39] px-4 py-[9px] text-[12px] font-bold uppercase text-white"
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            type="button"
          >
            + Add article
          </button>
          <select
            className="border border-[#ddd] px-3 py-[9px] text-[13px]"
            onChange={(event) => {
              setPage(1);
              setCategoryId(event.target.value);
            }}
            value={categoryId}
          >
            <option value="all">All columns ({total})</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setQuery(keyword.trim());
            }}
          >
            <input
              className="border border-[#ddd] px-3 py-[9px] text-[13px]"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search title / content"
              value={keyword}
            />
            <button className="border border-[#ddd] px-4 py-[9px] text-[12px]" type="submit">
              Search
            </button>
          </form>
          <span className="text-[12px] text-[#888]">
            {total} record(s) · page {page} / {pages}
          </span>
          {notice ? <span className="text-[12px] text-[#e61d39]">{notice}</span> : null}
        </div>

        <div className="mt-4 overflow-x-auto border border-[#e3e3e3] bg-white">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="bg-[#fafafa] text-[12px] uppercase text-[#888]">
              <tr>
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">Title</th>
                <th className="px-3 py-3">Column</th>
                <th className="px-3 py-3">List date</th>
                <th className="px-3 py-3">News date</th>
                <th className="px-3 py-3">Legacy id</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee]">
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-3 py-3 text-[#999]">{row.id}</td>
                  <td className="max-w-[420px] px-3 py-3">
                    <Link
                      className="font-bold text-[#333] hover:text-[#e61d39]"
                      href={`/news/${categories.find((c) => c.id === row.categoryId)?.slug ?? "news"}/${row.id}`}
                      target="_blank"
                    >
                      {row.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-[12px] text-[#888]">{row.excerpt}</p>
                  </td>
                  <td className="px-3 py-3 text-[#666]">{categoryName.get(row.categoryId)}</td>
                  <td className="px-3 py-3 text-[#666]">{row.listDate || "-"}</td>
                  <td className="px-3 py-3 text-[#666]">{row.newsDate || "-"}</td>
                  <td className="px-3 py-3 text-[#bbb]">{row.sourceId ?? "-"}</td>
                  <td className="px-3 py-3">
                    <button
                      className={`px-2 py-[3px] text-[11px] font-bold ${
                        row.isPublished ? "bg-[#e6f6ea] text-[#1c7c39]" : "bg-[#f4f4f4] text-[#888]"
                      }`}
                      onClick={() => void togglePublish(row)}
                      type="button"
                    >
                      {row.isPublished ? "PUBLISHED" : "DRAFT"}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      className="mr-3 text-[12px] text-[#1c6dd0] hover:underline"
                      onClick={() => void openEdit(row.id)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="text-[12px] text-[#e61d39] hover:underline"
                      onClick={() => void remove(row.id, row.title)}
                      type="button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-[13px] text-[#888]" colSpan={8}>
                    No article found. Use &ldquo;+ Add article&rdquo; to publish one.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="px-3 py-8 text-center text-[13px] text-[#888]" colSpan={8}>
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
          <button
            className="border border-[#ddd] bg-white px-3 py-[7px] disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            ← previous
          </button>
          {Array.from({ length: pages }, (_, index) => index + 1)
            .filter((value) => Math.abs(value - page) <= 2 || value === 1 || value === pages)
            .map((value) => (
              <button
                className={`border px-3 py-[7px] ${
                  value === page ? "border-[#e61d39] bg-[#e61d39] text-white" : "border-[#ddd] bg-white"
                }`}
                key={value}
                onClick={() => setPage(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          <button
            className="border border-[#ddd] bg-white px-3 py-[7px] disabled:opacity-40"
            disabled={page >= pages}
            onClick={() => setPage((value) => Math.min(pages, value + 1))}
            type="button"
          >
            next →
          </button>
        </div>
      </div>
    </div>
  );
}
