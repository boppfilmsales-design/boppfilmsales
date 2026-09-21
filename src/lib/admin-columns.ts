import { getCategories, getContentBySourceId, getContents, type SiteCategory, type SiteContent } from "@/lib/site";

/**
 * Admin column structure — mirrors the source site (apigcl.com) XgxCms admin panel.
 * Each top-level section (pid) contains sub-categories (c_id) that map to either
 * static site-seed.json data or database-backed news categories.
 */

export type DisplayType = "single" | "image-list" | "text-list" | "news-list";
export type DataSource = "static" | "news-db" | "products";

export type AdminColumn = {
  sourceId: number;
  name: string;
  displayType: DisplayType;
  dataSource: DataSource;
  parentId: number;
  itemCount: number;
};

export type AdminSection = {
  pid: number;
  name: string;
  nameEn: string;
  columns: AdminColumn[];
};

function displayTypeFromKind(kind: string): DisplayType {
  switch (kind) {
    case "about": return "single";
    case "honor": return "image-list";
    case "down": return "news-list";
    case "lines": return "image-list";
    case "service": return "news-list";
    case "cases": return "image-list";
    default: return "text-list";
  }
}

function staticItemCount(content: SiteContent | undefined): number {
  if (!content) return 0;
  if (content.entries && Array.isArray(content.entries)) return content.entries.length;
  if (content.items && Array.isArray(content.items)) return content.items.length;
  if (content.items && typeof content.items === "object") {
    const items = content.items as { bodyHtml?: string; images?: string[] };
    return items.images?.length ?? (items.bodyHtml ? 1 : 0);
  }
  return 0;
}

export function getAdminSections(): AdminSection[] {
  const categories = getCategories();
  const contents = getContents();

  const findContent = (sourceId: number) => getContentBySourceId(sourceId);

  const sections: AdminSection[] = [
    {
      pid: 1,
      name: "关于我们",
      nameEn: "About Us",
      columns: [
        { sourceId: 13, name: "About Us", displayType: "single", dataSource: "static", parentId: 1, itemCount: staticItemCount(findContent(13)) },
        { sourceId: 55, name: "Main Products", displayType: "single", dataSource: "static", parentId: 1, itemCount: staticItemCount(findContent(55)) },
        { sourceId: 16, name: "Honor", displayType: "image-list", dataSource: "static", parentId: 1, itemCount: staticItemCount(findContent(16)) },
        { sourceId: 56, name: "Culture", displayType: "single", dataSource: "static", parentId: 1, itemCount: staticItemCount(findContent(56)) },
        { sourceId: 169, name: "Branch Companies", displayType: "single", dataSource: "static", parentId: 1, itemCount: staticItemCount(findContent(169)) },
        { sourceId: 171, name: "Factory & Warehouse", displayType: "single", dataSource: "static", parentId: 1, itemCount: staticItemCount(findContent(171)) },
        { sourceId: 172, name: "Course", displayType: "single", dataSource: "static", parentId: 1, itemCount: staticItemCount(findContent(172)) },
      ],
    },
    {
      pid: 2,
      name: "新闻中心",
      nameEn: "News Center",
      columns: [
        { sourceId: 41, name: "Industry News", displayType: "news-list", dataSource: "news-db", parentId: 2, itemCount: 0 },
        { sourceId: 49, name: "Company News", displayType: "news-list", dataSource: "news-db", parentId: 2, itemCount: 0 },
        { sourceId: 52, name: "Employees Literary", displayType: "news-list", dataSource: "news-db", parentId: 2, itemCount: 0 },
      ],
    },
    {
      pid: 33,
      name: "产品展示",
      nameEn: "Products",
      columns: categories.map((cat: SiteCategory) => ({
        sourceId: cat.sourceId,
        name: cat.name,
        displayType: "text-list" as DisplayType,
        dataSource: "products" as DataSource,
        parentId: 33,
        itemCount: cat.subs.reduce((sum, sub) => sum + sub.items.length, 0),
      })),
    },
    {
      pid: 20,
      name: "其他",
      nameEn: "Other",
      columns: [
        { sourceId: 21, name: "banner-首页", displayType: "image-list", dataSource: "static", parentId: 20, itemCount: 0 },
        { sourceId: 31, name: "友情链接", displayType: "news-list", dataSource: "static", parentId: 20, itemCount: 0 },
        { sourceId: 47, name: "公司介绍-首页", displayType: "image-list", dataSource: "static", parentId: 20, itemCount: 0 },
      ],
    },
    {
      pid: 29,
      name: "联系我们",
      nameEn: "Contact Us",
      columns: [
        { sourceId: 32, name: "General Information", displayType: "news-list", dataSource: "static", parentId: 29, itemCount: 0 },
        { sourceId: 155, name: "Get Contacts", displayType: "single", dataSource: "static", parentId: 29, itemCount: 0 },
        { sourceId: 156, name: "Send Inquiry", displayType: "single", dataSource: "static", parentId: 29, itemCount: 0 },
        { sourceId: 162, name: "Give Advice To Seller", displayType: "single", dataSource: "static", parentId: 29, itemCount: 0 },
      ],
    },
    {
      pid: 42,
      name: "下载中心",
      nameEn: "Download Center",
      columns: [
        { sourceId: 43, name: "Company's Notice", displayType: "news-list", dataSource: "static", parentId: 42, itemCount: staticItemCount(findContent(43)) },
        { sourceId: 76, name: "Technology Data Download", displayType: "news-list", dataSource: "static", parentId: 42, itemCount: staticItemCount(findContent(76)) },
        { sourceId: 157, name: "Certificate Download", displayType: "news-list", dataSource: "static", parentId: 42, itemCount: staticItemCount(findContent(157)) },
        { sourceId: 158, name: "MSDS Download", displayType: "news-list", dataSource: "static", parentId: 42, itemCount: staticItemCount(findContent(158)) },
      ],
    },
    {
      pid: 44,
      name: "产品生产线",
      nameEn: "Production Lines",
      columns: [
        { sourceId: 45, name: "Packing Film Production Lines", displayType: "image-list", dataSource: "static", parentId: 44, itemCount: staticItemCount(findContent(45)) },
        { sourceId: 142, name: "BOPP Film Production Lines", displayType: "image-list", dataSource: "static", parentId: 44, itemCount: staticItemCount(findContent(142)) },
        { sourceId: 143, name: "BOPET Film Production Lines", displayType: "image-list", dataSource: "static", parentId: 44, itemCount: staticItemCount(findContent(143)) },
        { sourceId: 144, name: "Tape Production Lines", displayType: "image-list", dataSource: "static", parentId: 44, itemCount: staticItemCount(findContent(144)) },
        { sourceId: 149, name: "Thermal Lamination Film Production Lines", displayType: "image-list", dataSource: "static", parentId: 44, itemCount: staticItemCount(findContent(149)) },
        { sourceId: 164, name: "Bruckner Production Lines (Germany)", displayType: "image-list", dataSource: "static", parentId: 44, itemCount: staticItemCount(findContent(164)) },
        { sourceId: 165, name: "Mitsubishi Production Lines (Japan)", displayType: "image-list", dataSource: "static", parentId: 44, itemCount: staticItemCount(findContent(165)) },
        { sourceId: 167, name: "Copy Paper Production Lines", displayType: "image-list", dataSource: "static", parentId: 44, itemCount: staticItemCount(findContent(167)) },
        { sourceId: 173, name: "Silver Metallized Film Production Lines", displayType: "image-list", dataSource: "static", parentId: 44, itemCount: staticItemCount(findContent(173)) },
        { sourceId: 174, name: "POF Film Production Lines", displayType: "image-list", dataSource: "static", parentId: 44, itemCount: staticItemCount(findContent(174)) },
      ],
    },
    {
      pid: 53,
      name: "案例",
      nameEn: "Cases",
      columns: [
        { sourceId: 54, name: "Development Cases", displayType: "image-list", dataSource: "static", parentId: 53, itemCount: staticItemCount(findContent(54)) },
        { sourceId: 145, name: "To Buyers", displayType: "image-list", dataSource: "static", parentId: 53, itemCount: staticItemCount(findContent(145)) },
        { sourceId: 146, name: "To Markets", displayType: "image-list", dataSource: "static", parentId: 53, itemCount: staticItemCount(findContent(146)) },
        { sourceId: 147, name: "To Ourselves", displayType: "image-list", dataSource: "static", parentId: 53, itemCount: staticItemCount(findContent(147)) },
      ],
    },
    {
      pid: 78,
      name: "服务",
      nameEn: "Service",
      columns: [
        { sourceId: 79, name: "Useful Links Service", displayType: "news-list", dataSource: "static", parentId: 78, itemCount: staticItemCount(findContent(79)) },
        { sourceId: 141, name: "Company Announcement", displayType: "news-list", dataSource: "static", parentId: 78, itemCount: staticItemCount(findContent(141)) },
        { sourceId: 148, name: "Useful Knowledge", displayType: "news-list", dataSource: "static", parentId: 78, itemCount: staticItemCount(findContent(148)) },
        { sourceId: 199, name: "Vessel Shipping Lines", displayType: "news-list", dataSource: "static", parentId: 78, itemCount: staticItemCount(findContent(199)) },
      ],
    },
  ];

  return sections;
}

export function getDisplayTypeName(type: DisplayType): string {
  switch (type) {
    case "single": return "单页内容";
    case "image-list": return "图片列表";
    case "text-list": return "图文列表";
    case "news-list": return "新闻列表";
  }
}
