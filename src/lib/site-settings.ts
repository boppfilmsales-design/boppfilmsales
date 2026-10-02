import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * 2026-10-01: replaced the template vendor's placeholder company
 * (Hebei Xinguangxing) with this site's real details, both in the database
 * and in the fallback defaults below.
 *
 * Reads a slice of "高级管理 → 系统管理 → 站点设置" for the *front end*.
 *
 * Settings live in the `site_settings` key/value table and are edited from the
 * admin panel. Every getter is failure-tolerant: if the database is
 * unreachable (or the table does not exist yet, e.g. during a cold start
 * before `ensureSchema()` ran) the caller falls back to the built-in default,
 * so a DB hiccup can never take down a public page.
 */
export const DEFAULT_SETTINGS: Record<string, string> = {
  // 2026-10-01：原为模板作者的示例公司（Hebei Xinguangxing），已替换为本站真实信息。
  // 这些只是在数据库不可用时的兜底值，正常读取的是 site_settings 表。
  site_name: "Asia Pacific Industry Group Co., Limited",
  site_name_zh: "亚太工业集团有限公司",
  site_tagline: "BOPET,BOPP Film & Packaging Material Manufacturer",
  contact_person: "Mr Sunny Jiang",
  contact_phone: "+86-551-64687285",
  contact_mobile: "+86-18919654871",
  contact_email: "admin@apigcl.com, sales@boppfilmsales.com",
  contact_address: "No. 3399, Luzhou Ave.,baohe District, HeFei City, 230051, Anhui Province, China",
  contact_address_zh: "安徽省合肥市包河区庐州大道3399号",
  footer_copyright: "© 2026 Asia Pacific Industry Group All rights reserved.",
  footer_beian: "皖ICP备07010519号",
  /**
   * 头部「Website Old Version / 网站旧版」的链接目标。
   *
   * 旧服务器 2026 年底到期，这个入口是临时的：到期后到
   * 「高级管理 → 站点设置」把本项清空，链接就会从头部消失（无需改代码）。
   */
  header_old_site_url: "http://old.boppfilmsales.com/",
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
