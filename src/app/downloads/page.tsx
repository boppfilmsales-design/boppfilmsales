import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ArticleColumnPage from "@/components/pages/ArticleColumn";
import { getArticleColumn } from "@/lib/article-columns";
import { allPdfs } from "@/lib/site";
import Link from "next/link";
import { getContentForSite } from "@/lib/content-db";

/**
 * 实时渲染：后台改完内容，前台立刻生效。
 *
 * 2026-10-02 之前这里是 `revalidate = 60`（增量缓存 60 秒）。当时的理由是免费版
 * Workers 只有 10 毫秒 CPU 预算，而 `force-dynamic` 会让每次访问都重建整棵页面树
 * 并重扫 D1，进而触发 Error 1102（Worker exceeded resource limits）。
 *
 * 现已升级 Workers Paid（30 秒 CPU / 请求，额度是免费版的 3000 倍），所以改回
 * 实时渲染。代价是每次访问都会读一次 D1 —— 首页那种一次读上百行的页面如果流量
 * 很大，要留意 D1 的每日读取额度。
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Download Center - TDS / MSDS / Certificates",
  description: "Download company notices, technology data, certificates and MSDS documents (PDF).",
};

const DOWNLOAD_CATEGORIES = [
  { slug: "company-notice", name: "Company's Notice" },
  { slug: "technology-data", name: "Technology Data" },
  { slug: "certificate-download", name: "Certificate Download" },
  { slug: "msds-download", name: "MSDS Download" },
];

/** 栏目 slug → admin_contents.source_id */
function sourceIdFor(slug: string): number {
  switch (slug) {
    case "technology-data": return 76;
    case "certificate-download": return 157;
    case "msds-download": return 158;
    default: return 43; // company-notice
  }
}

/**
 * 反向映射：source_id → 栏目 slug。
 *
 * ColumnStrip 和分页都发 `?id=<source_id>`（与 /cases、/service 一致），而这个
 * 页面历史上用 `?category=<slug>`。两种都要接受，否则从标签条点进来会落到
 * Company's Notice。
 */
function slugForSourceId(sourceId: number): string {
  switch (sourceId) {
    case 76: return "technology-data";
    case 157: return "certificate-download";
    case 158: return "msds-download";
    default: return "company-notice";
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; p?: string; id?: string }>;
}) {
  const params = await searchParams;
  const requestedId = Number.parseInt(params.id ?? "", 10);
  const currentSlug =
    Number.isFinite(requestedId) && requestedId > 0
      ? slugForSourceId(requestedId)
      : params.category || "company-notice";
  const sourceId = sourceIdFor(currentSlug);
  const page = Number.parseInt(params.p ?? "1", 10) || 1;

  /**
   * 2026-10-01: 下载中心四栏已改为富文本文章模式（news_posts 支撑），
   * 渲染方式与 新闻中心 → Employees Literary 完全一致：列表 + 详情页。
   * 没有匹配到时才回落到原来的文件列表渲染，保证旧链接不会 404。
   */
  const articleColumn = getArticleColumn(sourceId);
  if (articleColumn) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader active="Download" />
        <ArticleColumnPage column={articleColumn} lang="en" page={page} />
        <SiteFooter />
      </div>
    );
  }

  const managedContent = await getContentForSite("down", sourceId);

  // Real PDF catalogue, used to backfill the "Technology Data" tab when the
  // admin column has not been filled in yet.
  const allPdfFiles = allPdfs();

  type DownloadItem = { name: string; serial: string; format: string; date: string; url: string };
  const managedRows = managedContent && Array.isArray(managedContent.items)
    ? (managedContent.items as Array<{ name?: string; serial?: string; format?: string; date?: string; file?: string }>)
    : [];

  let items: DownloadItem[] = managedRows
    .filter((row) => row && (row.name || row.file))
    .map((row) => ({
      name: row.name ?? "Download",
      serial: row.serial ?? "",
      format: row.format || "PDF",
      date: row.date ?? "",
      // The legacy rows store either an absolute /api/media/downloads/... path or a bare
      // file name; normalise both so the download button actually works.
      url: !row.file ? "#" : row.file.startsWith("/") || /^https?:\/\//i.test(row.file) ? row.file : `/api/media/downloads/${row.file}`,
    }));

  // Fallback: when the managed column has no rows yet, still show the real
  // catalogue instead of a hardcoded placeholder.
  if (items.length === 0 && currentSlug === "technology-data") {
    items = allPdfFiles.map((pdf, index) => ({
      name: pdf.label || "Technical Data Sheet",
      serial: `TDS-${String(index + 1).padStart(3, "0")}`,
      format: "PDF",
      date: "",
      url: pdf.file || "#",
    }));
  }

  if (items.length === 0) {
    items = [];
  }
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Download" />
      
      {/* 页面标题头部 */}
      <div className="bg-[#22262e] py-12 text-center text-white">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="text-[13px] text-gray-400 mb-2">
            <Link href="/" className="hover:text-white">Home</Link> / Download
          </div>
          <h1 className="text-[32px] font-bold tracking-wide uppercase">DOWNLOAD</h1>
        </div>
      </div>

      {/* 主体内容区 */}
      <div className="mx-auto max-w-[1200px] px-4 py-8">
        {/* 四个大类横向标签栏 */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-200 mb-8 bg-gray-100">
          {DOWNLOAD_CATEGORIES.map((cat) => {
            const isActive = currentSlug === cat.slug;
            return (
              <Link
                key={cat.slug}
                href={`/downloads?category=${cat.slug}`}
                className={`px-4 py-4 text-center text-[14px] font-bold transition-colors ${
                  isActive
                    ? "bg-[#c8102e] text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-200 hover:text-[#c8102e]"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>

        {/* 表格内容展示区 */}
        <div className="border border-gray-200 rounded shadow-sm overflow-hidden bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-gray-200 text-[13px] text-gray-700">
                <th className="py-3 px-4 font-bold">Name</th>
                <th className="py-3 px-4 font-bold">Serial number</th>
                <th className="py-3 px-4 font-bold">Format</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[13px] text-gray-600">
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">{item.name}</td>
                    <td className="py-3 px-4">{item.serial}</td>
                    <td className="py-3 px-4">{item.format}</td>
                    <td className="py-3 px-4">{item.date}</td>
                    <td className="py-3 px-4 text-right">
                      {item.url && item.url !== "#" ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-[#c8102e] text-white px-3 py-1 rounded text-[12px] hover:bg-[#a30d25]"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-gray-400 text-[12px] italic">Coming Soon</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No files available in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}