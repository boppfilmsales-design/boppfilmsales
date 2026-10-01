import { parseSortDate } from "@/db/seed";
import { textToHtml } from "@/lib/api-auth";

export type PostPayload = {
  categoryId?: number | string;
  title?: string;
  listDate?: string;
  newsDate?: string;
  excerpt?: string;
  bodyHtml?: string;
  bodyText?: string;
  image?: string;
  isPublished?: boolean;
  /** 置顶：在后台与前台列表里排到最前，其余顺序不变。 */
  isPinned?: boolean;
};

/**
 * 把表单/局部更新的载荷转成可写库的字段集合。
 *
 * ⚠️ 这是【局部更新】语义：**只有载荷里显式出现的字段才会被改写**。
 *
 * 2026-10-01 事故：这里原先无条件把 `bodyHtml` / `bodyText` / `excerpt` 等都塞进
 * `values`。而后台列表行（`GET /api/admin/posts`）并不返回 `bodyHtml`，所以
 * `togglePin()` / `togglePublish()` 这种"整行回传 + 翻一个标志位"的调用会带上
 * `bodyHtml: undefined`，于是 `rawHtml` 成了空串，`textToHtml("")` 生成 `<p></p>`，
 * **正文被整段清空**。操作员点几次置顶就丢了几篇文章，而且没有任何报错。
 *
 * 现在改成按 `xxx !== undefined` 逐字段判断。注意 `title` 是例外：它必须有值
 * （否则会把文章标题清空），但仍然只在载荷提供时才校验。
 */
export function buildPostValues(payload: PostPayload, requireCategory: boolean) {
  const values: Record<string, unknown> = { updatedAt: new Date() };

  /** 载荷里显式给了这个字段吗？ */
  const given = (key: keyof PostPayload) => payload[key] !== undefined;

  // ── 标题 ────────────────────────────────────────────────────────────────
  if (given("title")) {
    const title = (payload.title ?? "").trim();
    if (!title) throw new Error("Title is required.");
    values.title = title;
  } else if (requireCategory) {
    // 新建文章必须给标题
    throw new Error("Title is required.");
  }

  // ── 正文 ────────────────────────────────────────────────────────────────
  // 只要 bodyHtml 或 bodyText 任一个出现，就重算正文；都没给就完全不动。
  if (given("bodyHtml") || given("bodyText")) {
    const rawHtml = (payload.bodyHtml ?? "").trim();
    const rawText = (payload.bodyText ?? "").trim();
    const bodyHtml = rawHtml ? rawHtml : textToHtml(rawText);
    const bodyText = rawText || bodyHtml.replace(/<[^>]+>/g, " ");
    values.bodyHtml = bodyHtml;
    values.bodyText = bodyText;

    // 摘要只在没显式给 excerpt 时才自动推导
    if (!given("excerpt")) {
      const excerpt = bodyText.replace(/\s+/g, " ").slice(0, 260);
      if (excerpt) values.excerpt = excerpt;
    }
  }

  // ── 其余可选字段 ────────────────────────────────────────────────────────
  if (given("excerpt")) values.excerpt = (payload.excerpt ?? "").trim();
  if (given("image")) values.image = (payload.image ?? "").trim();
  if (given("isPublished")) values.isPublished = Boolean(payload.isPublished);
  if (given("isPinned")) values.isPinned = Boolean(payload.isPinned);

  // ── 日期 ────────────────────────────────────────────────────────────────
  if (given("listDate") || given("newsDate")) {
    // 只改了一个日期时，另一个沿用库里的值：这里用载荷里的值重建排序时间戳
    const listDate = (payload.listDate ?? "").trim();
    const newsDate = (payload.newsDate ?? "").trim();
    if (given("listDate")) values.listDate = listDate;
    if (given("newsDate")) values.newsDate = newsDate;
    // 两个都给了才能可靠地重算 sort_date；只给一个时不覆盖，避免把排序打乱
    if (given("listDate") && given("newsDate")) {
      values.sortDate = parseSortDate(listDate, newsDate);
    }
  }

  // ── 栏目 ────────────────────────────────────────────────────────────────
  if (requireCategory || payload.categoryId !== undefined) {
    const categoryId = Number.parseInt(String(payload.categoryId ?? ""), 10);
    if (!Number.isFinite(categoryId)) throw new Error("A valid category is required.");
    values.categoryId = categoryId;
  }

  return values;
}
