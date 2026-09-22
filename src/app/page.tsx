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
import { getLatestPostsSafe } from "@/lib/home-data"; // 假设这是您获取新闻的方法，按实际路径调整

export const metadata: Metadata = {
  title: `${SITE.name} - 4.5Mic BOPET film, BOPP film, BOPP tape, thermal laminating film`,
  description:
    "Asia Pacific Industry Group Co., Limited — 4.5Mic BOPET film, BOPP film, BOPP tape, BOPP thermal laminating film, polyester film, BOPP tobacco film, pearlized film, capacitor film, BOPET TTR film, POF shrink film and film machine lines.",
  keywords:
    "Asia Pacific Industry Group,4.5Mic BOPET film,BOPP film,BOPP tape,BOPP thermal laminating film,polyester film,bopp tobacco film,BOPP pearlized film,BOPP capacitor film,BOPET TTR film",
};

// 1. 将函数改为 async 服务器组件
export default async function HomePage() {
  // 2. 在服务端安全地获取所有数据
  const categories = getCategories();
  const pdfs = allPdfs();
  const featured = featuredProducts(10);
  const gallery = catalogueImages(8);
  const news = await getLatestPostsSafe(6).catch(() => []);
  const totalProducts = productCount();

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
      {/* 3. 将数据通过 initialData 传递给客户端组件 */}
      <HomeContent lang="en" initialData={initialData} />
      <SiteFooter />
    </div>
  );
}