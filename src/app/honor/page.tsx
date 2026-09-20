import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ContentPageWrapper from "@/components/ContentPageWrapper";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Honor & Certificates - Asia Pacific Industry Group",
  description: "Certificates, customer references and certification reports of Asia Pacific Industry Group.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Honor" />
      <ContentPageWrapper kind="honor" />
      <SiteFooter />
    </div>
  );
}
