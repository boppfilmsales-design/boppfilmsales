export const SITE = {
  name: "Asia Pacific Industry Group Co., Limited",
  nameZh: "亚太工业集团有限公司",
  tel: "86-551-64687285",
  mobile: "86-18919654871",
  email: "sales@boppfilmsales.com",
  email2: "admin@apigcl.com",
  address: "NO.3399 LUZHOU AVE., BAOHE DIST., 230051, HEFEI, ANHUI, CHINA",
  skype: ["asiapacificsale", "boppfilmsales", "boppfilm sale"],
  qq: ["840715367", "2538474128", "156641365", "2500526557"],
  whatsapp: ["18919654871", "18919659471", "18955113807"],
};

export function productImageUrl(value: string): string {
  const source = (value ?? "").trim();
  if (!source) return "";
  if (source.startsWith("/")) return source;
  if (/^https?:\/\//i.test(source)) return source;
  return `/uploads/products/${source}`;
}

export function contentImageUrl(value: string): string {
  const source = (value ?? "").trim();
  if (!source) return "";
  if (source.startsWith("/")) return source;
  if (/^https?:\/\//i.test(source)) return source;
  return `/uploads/content/${source}`;
}

export function stripHtml(value: string, max = 220): string {
  const text = (value ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export const CATEGORY_ZH: Record<number, string> = {
  34: "BOPET薄膜（聚酯薄膜）",
  48: "BOPP薄膜（聚丙烯薄膜）",
  57: "BOPP封箱胶带母卷",
  58: "BOPP/BOPET预涂膜",
  59: "POF收缩膜（聚烯烃）",
  60: "BOPS窗口信封膜",
  61: "CPP薄膜",
  62: "PE、PVC薄膜",
  64: "复印纸、相纸",
  65: "铝箔及钢材",
  67: "不干胶标签及条码碳带",
  68: "自粘撕裂带",
  69: "撕裂扣及捆扎带",
  70: "BOPS片材",
  152: "BOPA薄膜",
  178: "薄膜设备生产线",
  184: "安装与维护工程师",
  200: "电流互感器",
};

export const CONTENT_NAME_ZH: Record<number, string> = {
  13: "关于我们",
  55: "主营产品",
  16: "荣誉",
  56: "企业文化",
  169: "分公司",
  171: "工厂与仓储",
  172: "发展历程",
  202: "SEAGULL_LFI_TEST",
  17: "证书",
  50: "致客户",
  51: "认证报告",
  79: "实用链接服务",
  141: "公司公告",
  148: "实用知识",
  199: "船公司航线",
  45: "包装薄膜生产线",
  142: "BOPP薄膜生产线",
  143: "BOPET薄膜生产线",
  144: "胶带生产线",
  149: "预涂膜生产线",
  164: "布鲁克纳生产线（德国）",
  165: "三菱生产线（日本）",
  167: "复印纸生产线",
  173: "镀铝膜生产线",
  174: "POF薄膜生产线",
  54: "发展案例",
  145: "致客户",
  146: "致市场",
  147: "致自己",
  43: "公司公告",
  76: "技术资料下载",
  157: "证书下载",
  158: "MSDS下载",
};

export function categoryNameZh(sourceId: number | string): string | undefined {
  return CATEGORY_ZH[Number(sourceId)];
}

export function contentNameZh(sourceId: number | string): string | undefined {
  return CONTENT_NAME_ZH[Number(sourceId)];
}

export function subNameZh(sub: { nameZh?: string; name: string }): string {
  return sub.nameZh || sub.name;
}
