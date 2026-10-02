import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
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
    images: [{ url: "/api/media/uploads/products/9220b185d6079bc5.jpg", width: 600, height: 600, alt: "Film rolls prepared for export" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Asia Pacific Industry Group",
    description: "BOPP, BOPET, POF and technical film supply for global industry.",
    images: ["/api/media/uploads/products/9220b185d6079bc5.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-[#333] antialiased">{children}</body>
      <Script
        id="baidu-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `var _hmt = _hmt || [];
(function() {
  /* 百度统计 —— 按访问域名选对应的站点 ID。
     改造前这里写死 apigcl 的 ID，于是 boppfilmsales.com 的访客也被计进
     apigcl 的报表，两份数据是混的。
     在浏览器里判断 hostname 而不是服务端：Workers / Vercel / old 子域
     复用同一份 HTML，服务端只知道构建时的域名。
     去掉 www. 前缀后匹配，这样 www 与裸域自动归到同一个站点。 */
  var SITES = {
    "boppfilmsales.com": "908ba259a0b256ef0b23f307a9e0992a",
    "boppfilmsale.com": "908ba259a0b256ef0b23f307a9e0992a",
    "apigcl.com": "3861ee9aa38791080fd3cdc167fc15a1"
  };
  var FALLBACK = "908ba259a0b256ef0b23f307a9e0992a";

  var host = (location.hostname || "").toLowerCase().replace(/^www\\./, "");
  var id = SITES[host] || FALLBACK;

  var hm = document.createElement("script");
  hm.async = true;
  hm.src = "https://hm.baidu.com/hm.js?" + id;
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();`,
        }}
      />
    </html>
  );
}
