import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asia Pacific Industry Group Co., Limited",
  description:
    "Asia Pacific Industry Group Co., Limited — BOPP film, BOPET film, BOPP tape, thermal laminating film, POF shrink film exporter (www.apigcl.com / www.boppfilmsales.com).",
  keywords:
    "Asia Pacific Industry Group,4.5Mic BOPET film,BOPP film, BOPP tape, BOPP thermal laminating film, polyester film, bopp tobacco film, BOPP pearlized film, BOPP capacitor film, BOPET TTR film",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-[#333] antialiased">{children}</body>
    </html>
  );
}
