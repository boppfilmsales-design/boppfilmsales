"use client";

import { useState, useMemo } from "react";
import { validProductPdfs } from "@/lib/site";
import type { SiteProduct } from "@/lib/site";

type Props = {
  product: SiteProduct;
  lang?: "en" | "zh";
};

/** Extracts tab sections from the combined body HTML. */
function extractTabs(html: string) {
  const descMatch = html.match(/<div class="tab-description">([\s\S]*?)<\/div>\s*(?:<div class="tab-|$)/);
  const techMatch = html.match(/<div class="tab-technical">([\s\S]*?)<\/div>\s*(?:<div class="tab-|$)/);
  const offerMatch = html.match(/<div class="tab-offer">([\s\S]*?)<\/div>\s*$/);
  
  return {
    description: descMatch ? descMatch[1].trim() : html,
    technical: techMatch ? techMatch[1].trim() : "",
    offer: offerMatch ? offerMatch[1].trim() : "",
  };
}

export default function ProductTabs({ product, lang = "en" }: Props) {
  const body = lang === "zh" && product.bodyHtmlZh ? product.bodyHtmlZh : product.bodyHtml;
  const tabs = useMemo(() => extractTabs(body), [body]);
  const pdfs = useMemo(() => validProductPdfs(product), [product]);
  
  const hasTech = tabs.technical && tabs.technical.length > 20;
  const hasOffer = tabs.offer && tabs.offer.length > 20;
  
  const tabList = [
    { id: "desc", label: lang === "zh" ? "产品描述" : "Description", content: tabs.description },
    ...(hasTech ? [{ id: "tech", label: lang === "zh" ? "技术参数" : "Technical Parameters", content: tabs.technical }] : []),
    ...(hasOffer ? [{ id: "offer", label: lang === "zh" ? "报价详情" : "Offer Details", content: tabs.offer }] : []),
  ];
  
  const [activeTab, setActiveTab] = useState(0);
  const current = tabList[activeTab] ?? tabList[0];

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] md:p-8">
      {/* Tab headers */}
      <div className="flex flex-wrap gap-1 border-b-2 border-[#e8e8e8]">
        {tabList.map((tab, idx) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(idx)}
            className={`relative px-6 py-3 text-[14px] font-bold transition-all ${
              activeTab === idx
                ? "text-[#c8102e] after:absolute after:bottom-[-2px] after:left-0 after:h-[3px] after:w-full after:bg-[#c8102e]"
                : "text-[#888] hover:text-[#c8102e]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        <div
          className="news-body text-[14px] leading-[190%] text-[#3d3d3d]"
          dangerouslySetInnerHTML={{ __html: current.content || `<p>${product.title}</p>` }}
        />
      </div>

      {/* PDF downloads within Technical Parameters tab */}
      {activeTab === 1 && pdfs.length > 0 && (
        <div className="mt-8 border-2 border-[#c8102e] bg-[#fff7f8] p-6">
          <h3 className="text-[15px] font-bold uppercase tracking-[1px] text-[#c8102e]">
            {lang === "zh" ? "技术参数下载" : "Technical Data Sheet Downloads"}
          </h3>
          <p className="mt-2 text-[12px] leading-[20px] text-[#777]">
            {lang === "zh"
              ? "点击即可下载 PDF 版技术参数 / 检测报告。"
              : "Click to download the PDF technical data sheet / test report."}
          </p>
          <div className="mt-4 space-y-3">
            {pdfs.map((pdf) => (
              <a
                key={pdf.file}
                href={pdf.file}
                download
                className="flex items-center gap-3 border border-[#f0c9cf] bg-white px-4 py-3 transition-colors hover:border-[#c8102e] hover:bg-[#c8102e] hover:text-white"
              >
                <span className="flex h-[38px] w-[34px] shrink-0 items-center justify-center bg-[#c8102e] text-[10px] font-black text-white">
                  PDF
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold">
                    {pdf.label || pdf.file.split("/").pop()}
                  </span>
                  <span className="block text-[11px] opacity-70">
                    {lang === "zh" ? "点击下载" : "Click to download"}
                  </span>
                </span>
                <span className="text-[16px]">↓</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
