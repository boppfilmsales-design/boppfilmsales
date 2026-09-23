"use client";

import { useState } from "react";
import type { AdminCategory } from "./NewsForm";

export type AdminProductDetail = {
  id: number;
  categoryId: number;
  sort: number;
  title: string;
  titleZh: string;
  subtitle: string;
  subtitleZh: string;
  code: string;
  price: string;
  image: string;
  gallery: string[];
  pdfs: Array<{ file: string; label: string }>;
  bodyHtml: string;
  bodyText: string;
  bodyHtmlZh: string;
  description: string;
  descriptionZh: string;
  technical: string;
  technicalZh: string;
  offer: string;
  offerZh: string;
  status: string;
};

export default function ProductForm({
  categories,
  product,
  familyId,
  defaultCategoryId,
  onCancel,
  onSaved,
}: {
  categories: AdminCategory[];
  product?: AdminProductDetail | null;
  familyId: number;
  defaultCategoryId?: number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [categoryId, setCategoryId] = useState<number>(
    product?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? 0
  );
  const [sort, setSort] = useState<number>(product?.sort ?? 10);
  const [title, setTitle] = useState(product?.title ?? "");
  const [titleZh, setTitleZh] = useState(product?.titleZh ?? "");
  const [subtitle, setSubtitle] = useState(product?.subtitle ?? "");
  const [subtitleZh, setSubtitleZh] = useState(product?.subtitleZh ?? "");
  const [code, setCode] = useState(product?.code ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [image, setImage] = useState(product?.image ?? "");
  const [galleryText, setGalleryText] = useState((product?.gallery ?? []).join("\n"));
  const [pdfsText, setPdfsText] = useState((product?.pdfs ?? []).map((pdf) => `${pdf.label} | ${pdf.file}`).join("\n"));
  const [bodyHtml, setBodyHtml] = useState(product?.bodyHtml ?? "");
  const [bodyText, setBodyText] = useState(product?.bodyText ?? "");
  const [bodyHtmlZh, setBodyHtmlZh] = useState(product?.bodyHtmlZh ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [descriptionZh, setDescriptionZh] = useState(product?.descriptionZh ?? "");
  const [technical, setTechnical] = useState(product?.technical ?? "");
  const [technicalZh, setTechnicalZh] = useState(product?.technicalZh ?? "");
  const [offer, setOffer] = useState(product?.offer ?? "");
  const [offerZh, setOfferZh] = useState(product?.offerZh ?? "");
  const [mode, setMode] = useState<"text" | "html">(
    product?.bodyHtml?.includes("<") ? "html" : "text"
  );
  const [status, setStatus] = useState(product?.status ?? "正常");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const payload = {
      familyId,
      categoryId,
      sort,
      title,
      titleZh,
      subtitle,
      subtitleZh,
      code,
      price,
      image,
      gallery: galleryText.split("\n").map((value) => value.trim()).filter(Boolean),
      pdfs: pdfsText.split("\n").map((line) => {
        const [label, file] = line.split("|").map((value) => value.trim());
        return { label: label || file || "PDF", file: file || label || "" };
      }).filter((pdf) => pdf.file),
      status,
      bodyHtml: mode === "html" ? bodyHtml : "",
      bodyText: mode === "text" ? bodyText : "",
      bodyHtmlZh,
      description,
      descriptionZh,
      technical,
      technicalZh,
      offer,
      offerZh,
    };

    const url = product ? `/api/admin/products/item/${product.id}` : "/api/admin/products";
    const method = product ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { ok?: boolean; error?: string };
    setBusy(false);

    if (!response.ok || !data.ok) {
      setMessage(data.error ?? "保存产品失败");
      return;
    }

    setMessage("保存成功！");
    onSaved();
  }

  const inputClass =
    "mt-1 w-full border border-[#ddd] px-3 py-[9px] text-[13px] outline-none focus:border-[#e61d39]";
  const labelClass = "block text-[12px] font-bold text-[#555]";

  return (
    <form className="border border-[#e3e3e3] bg-white p-5" onSubmit={submit}>
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#333]">
          {product ? `编辑产品 #${product.id}` : "添加新产品"}
        </h2>
        <button className="text-[12px] text-[#888] hover:text-[#e61d39]" onClick={onCancel} type="button">
          关闭 ✕
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          产品子栏目
          <select
            className={inputClass}
            onChange={(event) => setCategoryId(Number.parseInt(event.target.value, 10))}
            value={categoryId}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          排序编号 (数字越小越靠前)
          <input
            className={inputClass}
            type="number"
            onChange={(event) => setSort(Number.parseInt(event.target.value, 10) || 0)}
            value={sort}
          />
        </label>

        <label className={labelClass}>
          产品名称 / 标题
          <input className={inputClass} onChange={(event) => setTitle(event.target.value)} value={title} />
        </label>

        <label className={labelClass}>
          中文产品名称
          <input className={inputClass} onChange={(event) => setTitleZh(event.target.value)} value={titleZh} />
        </label>

        <label className={labelClass}>
          副标题 / 规格型号 (如: 4.5 Micron, 500mm width)
          <input className={inputClass} onChange={(event) => setSubtitle(event.target.value)} value={subtitle} />
        </label>

        <label className={labelClass}>
          中文副标题 / 规格
          <input className={inputClass} onChange={(event) => setSubtitleZh(event.target.value)} value={subtitleZh} />
        </label>

        <label className={labelClass}>
          产品代码
          <input className={inputClass} onChange={(event) => setCode(event.target.value)} value={code} />
        </label>

        <label className={labelClass}>
          批发价格
          <input className={inputClass} onChange={(event) => setPrice(event.target.value)} value={price} />
        </label>

        <label className={labelClass}>
          封面图片路径 (如: /uploads/products/xxx.jpg)
          <input className={inputClass} onChange={(event) => setImage(event.target.value)} value={image} />
        </label>

        <label className={labelClass}>
          状态
          <select className={inputClass} onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="正常">正常</option>
            <option value="置顶">置顶</option>
            <option value="下架">下架</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3 text-[12px]">
        <span className="font-bold text-[#555]">详情内容格式:</span>
        {(["text", "html"] as const).map((value) => (
          <button
            className={`border px-3 py-1 ${
              mode === value ? "border-[#e61d39] bg-[#e61d39] text-white" : "border-[#ddd] text-[#666]"
            }`}
            key={value}
            onClick={() => setMode(value)}
            type="button"
          >
            {value === "text" ? "纯文本" : "HTML 源码"}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {mode === "text" ? (
          <textarea
            className="h-[220px] w-full border border-[#ddd] p-3 text-[13px] leading-[22px] outline-none focus:border-[#e61d39]"
            onChange={(event) => setBodyText(event.target.value)}
            placeholder={"在此输入产品详细描述/技术指标，空行自动分段。"}
            value={bodyText}
          />
        ) : (
          <textarea
            className="h-[220px] w-full border border-[#ddd] p-3 font-mono text-[12px] leading-[20px] outline-none focus:border-[#e61d39]"
            onChange={(event) => setBodyHtml(event.target.value)}
            placeholder={'<p>HTML 详情代码...</p>'}
            value={bodyHtml}
          />
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          产品图集（每行一个图片路径）
          <textarea className={`${inputClass} h-28 font-mono text-[12px]`} onChange={(event) => setGalleryText(event.target.value)} value={galleryText} />
        </label>
        <label className={labelClass}>
          技术 PDF（每行：显示名称 | 文件路径）
          <textarea className={`${inputClass} h-28 font-mono text-[12px]`} onChange={(event) => setPdfsText(event.target.value)} value={pdfsText} />
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[
          ["英文描述", description, setDescription], ["中文描述", descriptionZh, setDescriptionZh],
          ["英文技术参数", technical, setTechnical], ["中文技术参数", technicalZh, setTechnicalZh],
          ["英文报价说明", offer, setOffer], ["中文报价说明", offerZh, setOfferZh],
          ["中文详情 HTML", bodyHtmlZh, setBodyHtmlZh],
        ].map(([label, value, setter]) => (
          <label className={labelClass} key={label as string}>
            {label as string}
            <textarea className={`${inputClass} h-32 font-mono text-[12px]`} onChange={(event) => (setter as (value: string) => void)(event.target.value)} value={value as string} />
          </label>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          className="bg-[#e61d39] px-6 py-[10px] text-[13px] font-bold uppercase text-white disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          {busy ? "保存中..." : product ? "确认修改" : "确认添加"}
        </button>
        {message ? <span className="text-[12px] text-[#666]">{message}</span> : null}
      </div>
    </form>
  );
}