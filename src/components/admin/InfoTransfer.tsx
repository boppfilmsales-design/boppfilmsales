"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TransferColumn = {
  sourceId: number;
  name: string;
  sectionPid: number;
  sectionName: string;
  sectionNameEn: string;
  displayType: string;
  dataSource: string;
  itemCount: number;
  dbKind: string | null;
  dbName: string | null;
};

type ProductSub = {
  sourceId: number;
  name: string;
  nameZh: string;
  firstItemId: number;
  count: number;
};

type ProductFamily = {
  sourceId: number;
  name: string;
  nameZh: string;
  count: number;
  subs: ProductSub[];
};

type ProductRow = {
  id: number;
  categoryId: number;
  sort: number;
  title: string;
  subtitle: string;
  image: string;
  status: string;
};

const MODES = [
  ["content", "内容栏目转移"],
  ["news", "新闻栏目转移"],
  ["products", "产品转移"],
] as const;

function fmtCount(n: number): string {
  return `${n ?? 0} 条`;
}

export default function InfoTransfer() {
  const [columns, setColumns] = useState<TransferColumn[]>([]);
  const [productTree, setProductTree] = useState<ProductFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"content" | "news" | "products">("content");
  const [fromSourceId, setFromSourceId] = useState("");
  const [toSourceId, setToSourceId] = useState("");
  const [copy, setCopy] = useState(false);
  const [result, setResult] = useState("");

  /* ----- product-transfer state ----- */
  const [srcFamilyId, setSrcFamilyId] = useState("");
  const [srcCategoryId, setSrcCategoryId] = useState("");
  const [tgtFamilyId, setTgtFamilyId] = useState("");
  const [tgtCategoryId, setTgtCategoryId] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/advanced/transfer", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setColumns(data.columns ?? []);
      setProductTree(data.productTree ?? []);
      setError("");
    } catch (err) {
      setError(`加载栏目列表失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Load products whenever a source family is chosen. */
  useEffect(() => {
    const familyId = Number(srcFamilyId);
    if (!Number.isInteger(familyId) || familyId <= 0) {
      setProducts([]);
      setSelectedIds(new Set());
      return;
    }
    let cancelled = false;
    async function fetchProducts() {
      setProductsLoading(true);
      try {
        const res = await fetch(`/api/admin/products/${familyId}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          setProducts(data.rows ?? []);
          setSelectedIds(new Set());
        }
      } catch (err) {
        if (!cancelled) {
          setNotice(`加载产品失败：${(err as Error).message}`);
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    }
    void fetchProducts();
    return () => { cancelled = true; };
  }, [srcFamilyId]);

  const newsColumns = columns.filter((c) => c.dataSource === "news-db");
  const contentColumns = columns.filter((c) => c.dataSource === "static" && c.dbKind);
  const options = mode === "news" ? newsColumns : contentColumns;

  const from = options.find((c) => String(c.sourceId) === fromSourceId);
  const to = options.find((c) => String(c.sourceId) === toSourceId);
  const sameKind = from && to && from.dbKind === to.dbKind;

  /* ----- derived product selections ----- */
  const srcFamily = productTree.find((f) => String(f.sourceId) === srcFamilyId);
  const srcSub = srcFamily?.subs.find((s) => String(s.sourceId) === srcCategoryId);
  const tgtFamily = productTree.find((f) => String(f.sourceId) === tgtFamilyId);
  const tgtSub = tgtFamily?.subs.find((s) => String(s.sourceId) === tgtCategoryId);

  const sourceProducts = useMemo(
    () => products.filter((p) => String(p.categoryId) === srcCategoryId),
    [products, srcCategoryId],
  );

  const allSelected = sourceProducts.length > 0 && sourceProducts.every((p) => selectedIds.has(p.id));
  const someSelected = sourceProducts.some((p) => selectedIds.has(p.id));

  function toggleProduct(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllProducts() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const p of sourceProducts) next.delete(p.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const p of sourceProducts) next.add(p.id);
        return next;
      });
    }
  }

  function resetProductForm() {
    setSrcFamilyId("");
    setSrcCategoryId("");
    setTgtFamilyId("");
    setTgtCategoryId("");
    setProducts([]);
    setSelectedIds(new Set());
    setCopy(false);
  }

  async function syncNav() {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/admin/advanced/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sync" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setNotice(
        `前台产品导航已重建：${data.families} 个大类、${data.products} 个产品${
          data.synced ? "" : "（数据库写入失败，请重试）"
        }。`,
      );
    } catch (err) {
      setNotice(`同步失败：${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (mode === "products") {
      if (selectedIds.size === 0) {
        setNotice("请先选择要转移的产品。");
        return;
      }
      if (!tgtFamilyId || !tgtCategoryId) {
        setNotice("请选择目标大类和目标子分类。");
        return;
      }
      if (!tgtFamily || !tgtSub) {
        setNotice("目标分类不存在。");
        return;
      }
      if (srcFamilyId === tgtFamilyId && srcCategoryId === tgtCategoryId && !copy) {
        setNotice("源子分类与目标子分类相同，且未选择复制，无需转移。");
        return;
      }
      if (!copy) {
        const ok = window.confirm(
          `即将把选中的 ${selectedIds.size} 个产品从「${srcFamily?.name ?? ""} / ${srcSub?.name ?? ""}」移动到「${tgtFamily.name} / ${tgtSub.name}」。\n\n确定继续？`,
        );
        if (!ok) return;
      }
      setBusy(true);
      setResult("");
      try {
        const res = await fetch("/api/admin/advanced/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "products",
            productIds: Array.from(selectedIds),
            targetFamilyId: Number(tgtFamilyId),
            targetCategoryId: Number(tgtCategoryId),
            copy,
          }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        setNotice(
          `${copy ? "复制" : "转移"}完成：共处理 ${data.moved} 个产品。${
            data.navSynced ? "前台产品导航已同步。" : "⚠️ 前台导航同步失败，请点上方「同步前台产品导航」重试。"
          }`,
        );
        if (data.snapshot) setResult(data.snapshot);
        setSelectedIds(new Set());
        void load();
      } catch (err) {
        setNotice(`转移失败：${(err as Error).message}`);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!fromSourceId || !toSourceId) {
      setNotice("请先选择源栏目和目标栏目。");
      return;
    }
    if (fromSourceId === toSourceId) {
      setNotice("源栏目和目标栏目不能相同。");
      return;
    }
    if (mode === "content" && !copy) {
      const ok = window.confirm(
        `即将把「${from?.name}」的全部 ${from?.itemCount ?? 0} 条内容移动到「${to?.name}」。\n\n源栏目会被清空，操作会在留言板留下快照记录。确定继续？`,
      );
      if (!ok) return;
    }
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/advanced/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, fromSourceId: Number(fromSourceId), toSourceId: Number(toSourceId), copy }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setNotice(`转移完成：共处理 ${data.moved} 条。`);
      if (data.snapshot) setResult(data.snapshot);
      void load();
    } catch (err) {
      setNotice(`转移失败：${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="border border-[#e3e3e3] bg-white py-16 text-center text-[13px] text-[#888]">加载中…</div>;
  }
  if (error) {
    return <div className="border border-red-300 bg-red-50 p-5 text-[13px] text-red-700">{error}</div>;
  }

  return (
    <div>
      <div className="border border-[#e3e3e3] bg-white p-5">
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h2 className="text-[16px] font-bold text-[#333]">信息转移</h2>
          <button
            className="border border-[#ddd] bg-white px-3 py-[5px] text-[12px] text-[#666] hover:border-[#bbb] disabled:opacity-50"
            disabled={busy}
            onClick={syncNav}
            type="button"
          >
            ↻ 同步前台产品导航
          </button>
          <span className="text-[11px] text-[#999]">
            产品转移会自动同步；此处用于手动重建（例如在「产品管理」里改过分类之后）。
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-[20px] text-[#888]">
          把一个栏目/分类的内容转移到另一个栏目/分类。每次转移都会在「留言板」留下一条带快照的记录，便于回溯。
          <br />
          新闻转移会在三个新闻栏目之间迁移文章；内容转移会移动整列的列表条目；产品转移会把产品从一个子分类移到另一个子分类。
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {MODES.map(([key, label]) => (
            <button
              className={`border px-3 py-[6px] text-[12px] ${
                mode === key
                  ? "border-[#e61d39] bg-[#e61d39] font-bold text-white"
                  : "border-[#ddd] bg-white text-[#666] hover:border-[#bbb]"
              }`}
              key={key}
              onClick={() => {
                setMode(key);
                setFromSourceId("");
                setToSourceId("");
                setNotice("");
                setResult("");
                resetProductForm();
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "products" ? (
          <>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {/* ---------- Source panel ---------- */}
              <div className="space-y-4 rounded border border-[#f0f0f0] bg-[#fafafa] p-4">
                <h3 className="text-[13px] font-bold text-[#333]">源分类（要移出的产品）</h3>

                <label className="block">
                  <span className="text-[12px] font-bold text-[#666]">产品大类</span>
                  <select
                    className="mt-1 w-full border border-[#ddd] bg-white px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
                    onChange={(e) => {
                      setSrcFamilyId(e.target.value);
                      setSrcCategoryId("");
                      setSelectedIds(new Set());
                    }}
                    value={srcFamilyId}
                  >
                    <option value="">请选择产品大类…</option>
                    {productTree.map((f) => (
                      <option key={f.sourceId} value={f.sourceId}>
                        {f.name}（{fmtCount(f.count)}）
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[12px] font-bold text-[#666]">二级分类</span>
                  <select
                    className="mt-1 w-full border border-[#ddd] bg-white px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
                    disabled={!srcFamily}
                    onChange={(e) => {
                      setSrcCategoryId(e.target.value);
                      setSelectedIds(new Set());
                    }}
                    value={srcCategoryId}
                  >
                    <option value="">{srcFamily ? "请选择子分类…" : "先选择产品大类"}</option>
                    {srcFamily?.subs.map((s) => (
                      <option key={s.sourceId} value={s.sourceId}>
                        {s.name}（{fmtCount(s.count)}）
                      </option>
                    ))}
                  </select>
                  {srcSub ? (
                    <p className="mt-1 text-[11px] text-[#999]">
                      subId: {srcSub.sourceId} · 中文：{srcSub.nameZh || "—"}
                    </p>
                  ) : null}
                </label>

                <div className="border-t border-[#eee] pt-3">
                  <p className="mb-2 text-[12px] font-bold text-[#666]">
                    三级产品（{sourceProducts.length} 条）
                  </p>
                  {productsLoading ? (
                    <p className="py-6 text-center text-[12px] text-[#888]">加载产品中…</p>
                  ) : !srcCategoryId ? (
                    <p className="py-6 text-center text-[12px] text-[#bbb]">请先选择二级分类以列出产品</p>
                  ) : sourceProducts.length === 0 ? (
                    <p className="py-6 text-center text-[12px] text-[#888]">该子分类下暂无产品</p>
                  ) : (
                    <div className="max-h-[320px] overflow-auto border border-[#eee] bg-white">
                      <div className="sticky top-0 flex items-center gap-2 border-b border-[#f0f0f0] bg-[#fafafa] px-3 py-2 text-[12px]">
                        <input
                          checked={allSelected}
                          onChange={toggleAllProducts}
                          ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                          type="checkbox"
                        />
                        <span className="font-bold">全选</span>
                        <span className="ml-auto text-[#999]">已选 {selectedIds.size}</span>
                      </div>
                      {sourceProducts.map((p) => (
                        <label
                          className="flex cursor-pointer items-center gap-3 border-b border-[#f7f7f7] px-3 py-2 text-[12px] hover:bg-[#f8f8f8]"
                          key={p.id}
                        >
                          <input
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleProduct(p.id)}
                            type="checkbox"
                          />
                          <span className="shrink-0 font-mono text-[#bbb]">#{p.id}</span>
                          <span className="flex-1 truncate text-[#333]">{p.title || "（无标题）"}</span>
                          {p.status !== "正常" ? (
                            <span className="shrink-0 rounded bg-[#f4f4f4] px-1.5 py-[1px] text-[10px] text-[#888]">
                              {p.status}
                            </span>
                          ) : null}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ---------- Target panel ---------- */}
              <div className="space-y-4 rounded border border-[#f0f0f0] bg-[#fafafa] p-4">
                <h3 className="text-[13px] font-bold text-[#333]">目标分类（移到这里）</h3>

                <label className="block">
                  <span className="text-[12px] font-bold text-[#666]">产品大类</span>
                  <select
                    className="mt-1 w-full border border-[#ddd] bg-white px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
                    onChange={(e) => {
                      setTgtFamilyId(e.target.value);
                      setTgtCategoryId("");
                    }}
                    value={tgtFamilyId}
                  >
                    <option value="">请选择产品大类…</option>
                    {productTree.map((f) => (
                      <option key={f.sourceId} value={f.sourceId}>
                        {f.name}（{fmtCount(f.count)}）
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[12px] font-bold text-[#666]">二级分类</span>
                  <select
                    className="mt-1 w-full border border-[#ddd] bg-white px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
                    disabled={!tgtFamily}
                    onChange={(e) => setTgtCategoryId(e.target.value)}
                    value={tgtCategoryId}
                  >
                    <option value="">{tgtFamily ? "请选择子分类…" : "先选择产品大类"}</option>
                    {tgtFamily?.subs.map((s) => (
                      <option key={s.sourceId} value={s.sourceId}>
                        {s.name}（{fmtCount(s.count)}）
                      </option>
                    ))}
                  </select>
                  {tgtSub ? (
                    <p className="mt-1 text-[11px] text-[#999]">
                      subId: {tgtSub.sourceId} · 中文：{tgtSub.nameZh || "—"}
                    </p>
                  ) : null}
                </label>

                <div className="border-t border-[#eee] pt-3">
                  <div className="rounded border border-[#e3e3e3] bg-white p-3 text-[12px] leading-[22px] text-[#555]">
                    <p className="font-bold text-[#333]">操作预览</p>
                    {!selectedIds.size ? (
                      <p className="text-[#999]">尚未选择任何产品</p>
                    ) : !tgtSub ? (
                      <p className="text-[#999]">尚未选择目标子分类</p>
                    ) : (
                      <>
                        <p>
                          源：{srcFamily?.name ?? "—"} / {srcSub?.name ?? "—"}
                        </p>
                        <p>
                          目标：{tgtFamily?.name ?? "—"} / {tgtSub.name}
                        </p>
                        <p>产品数：{selectedIds.size}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2 text-[12px] text-[#666]">
              <input checked={copy} onChange={(e) => setCopy(e.target.checked)} type="checkbox" />
              复制而非移动（保留源分类中的产品，在目标分类生成副本）
            </label>
          </>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr]">
            <label className="block">
              <span className="text-[12px] font-bold text-[#666]">源栏目（从这里移出）</span>
              <select
                className="mt-1 w-full border border-[#ddd] px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
                onChange={(e) => setFromSourceId(e.target.value)}
                value={fromSourceId}
              >
                <option value="">请选择源栏目…</option>
                {options.map((c) => (
                  <option key={c.sourceId} value={c.sourceId}>
                    {c.sectionName} / {c.name}（{c.itemCount} 条）
                  </option>
                ))}
              </select>
              {from ? (
                <p className="mt-1 text-[11px] text-[#999]">
                  sourceId: {from.sourceId} · 类型: {from.dbKind ?? from.dataSource} · 条目: {from.itemCount}
                </p>
              ) : null}
            </label>

            <div className="flex items-center justify-center pt-6 text-[20px] text-[#ccc]">→</div>

            <label className="block">
              <span className="text-[12px] font-bold text-[#666]">目标栏目（移到这里）</span>
              <select
                className="mt-1 w-full border border-[#ddd] px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
                onChange={(e) => setToSourceId(e.target.value)}
                value={toSourceId}
              >
                <option value="">请选择目标栏目…</option>
                {options.map((c) => (
                  <option key={c.sourceId} value={c.sourceId}>
                    {c.sectionName} / {c.name}（{c.itemCount} 条）
                  </option>
                ))}
              </select>
              {to ? (
                <p className="mt-1 text-[11px] text-[#999]">
                  sourceId: {to.sourceId} · 类型: {to.dbKind ?? to.dataSource} · 条目: {to.itemCount}
                </p>
              ) : null}
            </label>
          </div>
        )}

        {mode === "content" && from && to && !sameKind ? (
          <p className="mt-3 border border-[#ffe0b2] bg-[#fff8e6] px-3 py-2 text-[12px] text-[#9a6b00]">
            注意：源栏目类型（{from.dbKind}）与目标栏目类型（{to.dbKind}）不同。如果二者不属于兼容的列表类型，转移会被拒绝。
          </p>
        ) : null}

        {mode !== "products" && mode === "content" ? (
          <label className="mt-3 flex items-center gap-2 text-[12px] text-[#666]">
            <input checked={copy} onChange={(e) => setCopy(e.target.checked)} type="checkbox" />
            复制而非移动（保留源栏目的内容）
          </label>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="bg-[#e61d39] px-4 py-[9px] text-[12px] font-bold text-white disabled:opacity-40"
            disabled={
              busy ||
              (mode === "products"
                ? selectedIds.size === 0 || !tgtFamilyId || !tgtCategoryId
                : !fromSourceId || !toSourceId)
            }
            onClick={() => void run()}
            type="button"
          >
            {busy ? "转移中…" : "执行转移"}
          </button>
          <button
            className="border border-[#ddd] px-4 py-[9px] text-[12px] text-[#666]"
            onClick={() => {
              setFromSourceId("");
              setToSourceId("");
              setNotice("");
              setResult("");
              resetProductForm();
            }}
            type="button"
          >
            重置
          </button>
          {notice ? <span className="text-[12px] text-[#e61d39]">{notice}</span> : null}
        </div>
      </div>

      {result ? (
        <div className="mt-4 border border-[#e3e3e3] bg-white p-4">
          <h3 className="text-[13px] font-bold text-[#333]">快照（已同时写入留言板）</h3>
          <pre className="mt-2 max-h-[240px] overflow-auto bg-[#fafafa] p-3 text-[11px] leading-[18px] text-[#555]">
            {result}
          </pre>
        </div>
      ) : null}

      <div className="mt-4 border border-[#e3e3e3] bg-white">
        <div className="border-b border-[#eee] px-5 py-3">
          <h3 className="text-[13px] font-bold text-[#333]">可转移栏目/分类一览</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[12px]">
            <thead className="bg-[#fafafa] text-[12px] text-[#888]">
              <tr>
                <th className="px-3 py-2">区块</th>
                <th className="px-3 py-2">栏目/分类</th>
                <th className="px-3 py-2">sourceId</th>
                <th className="px-3 py-2">类型</th>
                <th className="px-3 py-2">数据源</th>
                <th className="px-3 py-2">条目数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {mode === "products"
                ? productTree.flatMap((f) =>
                    [
                      <tr className="bg-[#fafafa]" key={`fam-${f.sourceId}`}>
                        <td className="px-3 py-2 font-bold text-[#333]">{f.name}</td>
                        <td className="px-3 py-2 text-[#888]">产品大类</td>
                        <td className="px-3 py-2 font-mono text-[#999]">{f.sourceId}</td>
                        <td className="px-3 py-2 text-[#666]">family</td>
                        <td className="px-3 py-2 text-[#666]">products</td>
                        <td className="px-3 py-2 text-[#666]">{f.count}</td>
                      </tr>,
                      ...f.subs.map((s) => (
                        <tr key={`sub-${s.sourceId}`}>
                          <td className="px-3 py-2 text-[#bbb]">└</td>
                          <td className="px-3 py-2 text-[#333]">{s.name}</td>
                          <td className="px-3 py-2 font-mono text-[#999]">{s.sourceId}</td>
                          <td className="px-3 py-2 text-[#666]">sub</td>
                          <td className="px-3 py-2 text-[#666]">products</td>
                          <td className="px-3 py-2 text-[#666]">{s.count}</td>
                        </tr>
                      )),
                    ].flat(),
                  )
                : columns.map((c) => (
                    <tr key={c.sourceId}>
                      <td className="px-3 py-2 text-[#888]">{c.sectionName}</td>
                      <td className="px-3 py-2 text-[#333]">{c.name}</td>
                      <td className="px-3 py-2 font-mono text-[#999]">{c.sourceId}</td>
                      <td className="px-3 py-2 text-[#666]">{c.dbKind ?? "-"}</td>
                      <td className="px-3 py-2 text-[#666]">{c.dataSource}</td>
                      <td className="px-3 py-2 text-[#666]">{c.itemCount}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
