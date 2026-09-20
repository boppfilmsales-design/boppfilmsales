import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ContentPageWrapper from "@/components/ContentPageWrapper";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "About Us - Asia Pacific Industry Group",
  description: "BOPP / BOPET film manufacturer in Hefei, China — company profile, culture, branch companies and warehouse.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="About Us" />
      <ContentPageWrapper kind="about" />
      <SiteFooter />
    </div>
  );
}
