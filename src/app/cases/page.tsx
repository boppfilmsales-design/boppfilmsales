import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ContentPageWrapper from "@/components/ContentPageWrapper";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Classic Cases - To Buyers, To Markets, To Ourselves",
  description: "Development cases of Asia Pacific Industry Group: to buyers, to markets and to ourselves.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Classic Cases" />
      <ContentPageWrapper kind="cases" />
      <SiteFooter />
    </div>
  );
}
