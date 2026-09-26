import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Reads a slice of "高级管理 → 系统管理 → 站点设置" for the *front end*.
 *
 * Settings live in the `site_settings` key/value table and are edited from the
 * admin panel. Every getter is failure-tolerant: if the database is
 * unreachable (or the table does not exist yet, e.g. during a cold start
 * before `ensureSchema()` ran) the caller falls back to the built-in default,
 * so a DB hiccup can never take down a public page.
 */
export const DEFAULT_SETTINGS: Record<string, string> = {
  site_name: "Hebei Xinguangxing Packing Material Co., Ltd.",
  site_name_zh: "河北新光兴包装材料有限公司",
  site_tagline: "BOPP Film & Packaging Material Manufacturer",
  contact_person: "Ms. Linda",
  contact_phone: "+86-311-88888888",
  contact_mobile: "+86-138-0000-0000",
  contact_email: "sales@apigcl.com",
  contact_address: "Xinguangxing Industrial Park, Shijiazhuang, Hebei, China",
  contact_address_zh: "中国河北省石家庄市新光兴工业园",
  footer_copyright: "© 2024 Hebei Xinguangxing Packing Material Co., Ltd. All rights reserved.",
  footer_beian: "冀ICP备00000000号",
  products_per_page: "9",
  news_per_page: "10",
  site_status: "online",
  maintenance_notice: "网站正在维护升级，请稍后访问。",
};

export type SiteSettingsMap = Record<string, string>;

/** Loads every setting in one round-trip. Never throws. */
export async function getSiteSettings(): Promise<SiteSettingsMap> {
  try {
    const rows = await db.all<{ key: string; value: string }>(
      sql`select key, value from site_settings`,
    );
    const map: SiteSettingsMap = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (row.key) map[row.key] = row.value ?? "";
    }
    return map;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Convenience accessor with an explicit fallback. */
export function setting(settings: SiteSettingsMap, key: string): string {
  return settings[key] ?? DEFAULT_SETTINGS[key] ?? "";
}

/** Parses a numeric setting (page size etc.), falling back when invalid. */
export function settingNumber(settings: SiteSettingsMap, key: string, fallback: number): number {
  const raw = Number.parseInt(settings[key] ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}
