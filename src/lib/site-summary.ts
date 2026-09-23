import homeSummaryJson from "@/data/home-summary.json";
import siteNavJson from "@/data/site-nav.json";

export type NavSub = {
  sourceId: number;
  name: string;
  nameZh: string;
  firstItemId: number;
  count: number;
};

export type NavCategory = {
  sourceId: number;
  name: string;
  nameZh: string;
  count: number;
  sampleNames: string[];
  sampleNamesZh: string[];
  subs: NavSub[];
};

export type HomeFeatured = {
  category: { sourceId: number; name: string; nameZh: string };
  product: { sourceId: number; title: string; titleZh: string; gallery0: string };
};

export type HomeGalleryItem = { src: string; title: string };
export type HomePdf = { label: string; file: string; product: string };

export type HomeSummary = {
  categories: NavCategory[];
  featured: HomeFeatured[];
  gallery: HomeGalleryItem[];
  pdfs: HomePdf[];
  totalProducts: number;
  aboutZhHtml: string;
};

export function getNavCategories(): NavCategory[] {
  return (siteNavJson as unknown as { categories: NavCategory[] }).categories;
}

export function getHomeSummary(): HomeSummary {
  return homeSummaryJson as unknown as HomeSummary;
}
