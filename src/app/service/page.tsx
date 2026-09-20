import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ContentPageWrapper from "@/components/ContentPageWrapper";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Service Center - Useful Links, Announcements, Shipping Lines",
  description: "Useful links, company announcements, foreign trade knowledge and vessel shipping lines.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Service Center" />
      <ContentPageWrapper kind="service" />
      <SiteFooter />
    </div>
  );
}
