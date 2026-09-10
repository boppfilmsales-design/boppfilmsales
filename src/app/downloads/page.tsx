import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { DownloadsPage } from "@/components/pages/Sections";
import { allDownloads } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Download Center - TDS / MSDS / Certificates",
  description: "Download company notices, technology data, certificates and MSDS documents (PDF).",
};

export default function Page() {
  const total = allDownloads().reduce((sum, g) => sum + g.rows.length, 0);
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Download" />
      <DownloadsPage />
      <div className="pb-12 text-center text-[13px] text-[#888]">{total} files available</div>
      <SiteFooter />
    </div>
  );
}
