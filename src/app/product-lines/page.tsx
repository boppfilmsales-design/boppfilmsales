import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ContentPageWrapper from "@/components/ContentPageWrapper";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Production Lines - Bruckner / Mitsubishi Film Lines",
  description: "BOPP, BOPET, tape, thermal lamination, metallizing and POF film production lines.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Products Lines" />
      <ContentPageWrapper kind="lines" />
      <SiteFooter />
    </div>
  );
}
