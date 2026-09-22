export const revalidate = 3600; // 缓存 1 小时，且允许在打包时即使连不上数据库也能成功通过
import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import HomeContent from "@/components/pages/HomeContent";
import { 
  SITE, 
  getCategories, 
  allPdfs, 
  productCount, 
  featuredProducts, 
  catalogueImages 
} from "@/lib/site";
import { getLatestPostsSafe } from "@/lib/home-data";

export const metadata: Metadata = {
  title: `${SITE.name} - 4.5Mic BOPET film, BOPP film, BOPP tape, thermal laminating film`,
  description:
    "Asia Pacific Industry Group Co., Limited — 4.5Mic BOPET film, BOPP film, BOPP tape, BOPP thermal laminating film, polyester film, BOPP tobacco film, pearlized film, capacitor film, BOPET TTR film, POF shrink film and film machine lines.",
  keywords:
    "Asia Pacific Industry Group,4.5Mic BOPET film,BOPP film,BOPP tape,BOPP thermal laminating film,polyester film,bopp tobacco film,BOPP pearlized film,BOPP capacitor film,BOPET TTR film",
};

export default async function HomePage() {
  // 使用 try...catch 保护所有数据获取，防止数据库连接超时导致 Worker 崩溃 (Error 1102)
  let categories = [];
  let pdfs = [];
  let featured = [];
  let gallery = [];
  let news = [];
  let totalProducts = 0;

  try {
    categories = getCategories();
  } catch (e) {
    console.error("Failed to load categories:", e);
  }

  try {
    pdfs = allPdfs();
  } catch (e) {
    console.error("Failed to load pdfs:", e);
  }

  try {
    featured = featuredProducts(10);
  } catch (e) {
    console.error("Failed to load featured products:", e);
  }

  try {
    gallery = catalogueImages(8);
  } catch (e) {
    console.error("Failed to load gallery:", e);
  }

  try {
    news = await getLatestPostsSafe(6).catch(() => []);
  } catch (e) {
    console.error("Failed to load news:", e);
  }

  try {
    totalProducts = productCount();
  } catch (e) {
    console.error("Failed to load product count:", e);
  }

  const initialData = {
    categories,
    pdfs,
    featured,
    gallery,
    news,
    totalProducts,
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Home" />
      <HomeContent lang="en" initialData={initialData} />
      <SiteFooter />
    </div>
  );
}