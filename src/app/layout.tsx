import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.boppfilmsales.com"),
  title: {
    default: "Asia Pacific Industry Group | BOPP & BOPET Film Supplier",
    template: "%s | Asia Pacific Industry Group",
  },
  description:
    "Asia Pacific Industry Group Co., Limited — global supplier of BOPP film, BOPET film, BOPP tape, thermal laminating film, POF shrink film and film production lines.",
  keywords:
    "Asia Pacific Industry Group,4.5Mic BOPET film,BOPP film,BOPP tape,BOPP thermal laminating film,polyester film,BOPP tobacco film,BOPP pearlized film,BOPP capacitor film,BOPET TTR film",
  alternates: {
    canonical: "/",
    languages: { "en-US": "/", "zh-CN": "/zh" },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "zh_CN",
    siteName: "Asia Pacific Industry Group",
    title: "Advanced BOPP & BOPET Films Built for Industry",
    description: "Technical film materials, tape jumbo rolls and production line solutions for global manufacturers.",
    images: [{ url: "/uploads/products/9220b185d6079bc5.jpg", width: 600, height: 600, alt: "Film rolls prepared for export" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Asia Pacific Industry Group",
    description: "BOPP, BOPET, POF and technical film supply for global industry.",
    images: ["/uploads/products/9220b185d6079bc5.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-[#333] antialiased">{children}</body>
    </html>
  );
}
