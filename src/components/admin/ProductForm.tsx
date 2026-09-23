"use client";

import { useState } from "react";
import type { AdminCategory } from "./NewsForm";
import RichEditor from "./RichEditor";
import ImageField from "./ImageField";
import ImageListField from "./ImageListField";
import PdfListField from "./PdfListField";

function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
    product?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? 0,
  );
  const [sort, setSort] = useState<number>(product?.sort ?? 10);
  const [title, setTitle] = useState(product?.title ?? "");
  const [titleZh, setTitleZh] = useState(product?.titleZh ?? "");
  const [subtitle, setSubtitle] = useState(product?.subtitle ?? "");
  const [subtitleZh, setSubtitleZh] = useState(product?.subtitleZh ?? "");
  const [code, setCode] = useState(product?.code ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [image, setImage] = useState(product?.image ?? "");
  const [gallery, setGallery] = useState<string[]>(product?.gallery ?? []);
  const [pdfs, setPdfs] = useState<Array<{ file: string; label: string }>>(product?.pdfs ?? []);
  const [bodyHtml, setBodyHtml] = useState(product?.bodyHtml ?? "");
  const [bodyHtmlZh, setBodyHtmlZh] = useState(product?.bodyHtmlZh ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [descriptionZh, setDescriptionZh] = useState(product?.descriptionZh ?? "");
  const [technical, setTechnical] = useState(product?.technical ?? "");
  const [technicalZh, setTechnicalZh] = useState(product?.technicalZh ?? "");
  const [offer, setOffer] = useState(product?.offer ?? "");
  const [offerZh, setOfferZh] = useState(product?.offerZh ?? "");
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
      gallery,
      pdfs,
      status,
      bodyHtml,
      bodyText: htmlToText(bodyHtml),
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
  const sectionTitle = "mb-3 mt-6 border-l-4 border-[#e61d39] pl-3 text-[14px] font-bold text-[#333]";

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

      {/* ---------- Basic info ---------- */}
      <p className={sectionTitle}>基本信息</p>
      <div className="grid gap-4 md:grid-cols-2">
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
          副标题 / 规格型号
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
          状态
          <select className={inputClass} onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="正常">正常</option>
            <option value="置顶">置顶</option>
            <option value="下架">下架</option>
          </select>
        </label>
      </div>

      {/* ---------- Cover image ---------- */}
      <p className={sectionTitle}>封面图片</p>
      <ImageField value={image} onChange={setImage} folder="uploads/products" />

      {/* ---------- Product detail (EN + ZN side-by-side) ---------- */}
      <p className={sectionTitle}>产品详情内容</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>英文详情</label>
          <RichEditor value={bodyHtml} onChange={setBodyHtml} placeholder="在此编辑英文详情..." height={260} />
        </div>
        <div>
          <label className={labelClass}>中文详情</label>
          <RichEditor value={bodyHtmlZh} onChange={setBodyHtmlZh} placeholder="在此编辑中文详情..." height={260} />
        </div>
      </div>

      {/* ---------- Gallery + Technical PDFs ---------- */}
      <p className={sectionTitle}>产品图集 &amp; 技术文档</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className={labelClass}>产品图集</label>
          <ImageListField images={gallery} onChange={setGallery} folder="uploads/products" />
        </div>
        <div>
          <label className={labelClass}>技术 PDF / 文档</label>
          <PdfListField pdfs={pdfs} onChange={setPdfs} />
        </div>
      </div>

      {/* ---------- Description EN/ZH ---------- */}
      <p className={sectionTitle}>英文描述 &amp; 中文描述</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>英文描述</label>
          <RichEditor value={description} onChange={setDescription} placeholder="English description..." height={220} />
        </div>
        <div>
          <label className={labelClass}>中文描述</label>
          <RichEditor value={descriptionZh} onChange={setDescriptionZh} placeholder="中文描述..." height={220} />
        </div>
      </div>

      {/* ---------- Technical params EN/ZH ---------- */}
      <p className={sectionTitle}>英文技术参数 &amp; 中文技术参数</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>英文技术参数</label>
          <RichEditor value={technical} onChange={setTechnical} placeholder="Technical parameters..." height={220} />
        </div>
        <div>
          <label className={labelClass}>中文技术参数</label>
          <RichEditor value={technicalZh} onChange={setTechnicalZh} placeholder="中文技术参数..." height={220} />
        </div>
      </div>

      {/* ---------- Offer/Quotation EN/ZH ---------- */}
      <p className={sectionTitle}>英文报价说明 &amp; 中文报价说明（支持报价表）</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>英文报价说明</label>
          <RichEditor value={offer} onChange={setOffer} placeholder="Quotation / pricing notes..." height={220} />
        </div>
        <div>
          <label className={labelClass}>中文报价说明</label>
          <RichEditor value={offerZh} onChange={setOfferZh} placeholder="中文报价说明..." height={220} />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
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
