import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { allPdfs } from "@/lib/site";
import Link from "next/link";
import { getContentForSite } from "@/lib/content-db";

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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const currentSlug = params.category || "company-notice";
  const sourceId = currentSlug === "technology-data" ? 76 : currentSlug === "certificate-download" ? 157 : currentSlug === "msds-download" ? 158 : 43;
  const managedContent = await getContentForSite("down", sourceId);
  
  // 获取项目中真实的 PDF 数据
  const allPdfFiles = allPdfs();

  // 严格根据当前 slug 匹配对应的内容列表
  let items: Array<{ name: string; serial: string; format: string; date: string; url: string }> = [];

  const managedRows = managedContent && Array.isArray(managedContent.items) ? managedContent.items as Array<{ name?: string; serial?: string; format?: string; date?: string; file?: string }> : [];
  if (managedRows.length > 0) {
    items = managedRows.map((row) => ({
      name: row.name ?? "Download",
      serial: row.serial ?? "",
      format: row.format ?? "PDF",
      date: row.date ?? "",
      url: row.file ?? "#",
    }));
  } else if (currentSlug === "company-notice") {
    items = [
      { 
        name: "Our Company's Bank Accounts", 
        serial: "195717-184", 
        format: "PDF", 
        date: "07/25/2018", 
        url: "#" // 若无此文件可暂用 # 或提示
      }
    ];
  } else if (currentSlug === "technology-data") {
    items = allPdfFiles.map((pdf) => ({
      name: pdf.label || "Technical Data Sheet",
      serial: "TDS-PDF",
      format: "PDF",
      date: "2024-01-10",
      url: pdf.file || "#"
    }));
  } else if (currentSlug === "certificate-download") {
    items = [
      { 
        name: "ISO9001 Quality Management System Certificate", 
        serial: "CERT-ISO", 
        format: "PDF", 
        date: "2023-05-20", 
        url: "#" 
      }
    ];
  } else if (currentSlug === "msds-download") {
    items = [
      { 
        name: "MSDS for BOPET, BOPP and POF Film Products", 
        serial: "MSDS-FILM", 
        format: "PDF", 
        date: "2024-02-15", 
        url: "#" 
      }
    ];
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