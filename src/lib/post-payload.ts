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

export function buildPostValues(payload: PostPayload, requireCategory: boolean) {
  const title = (payload.title ?? "").trim();
  if (!title) throw new Error("Title is required.");

  const rawHtml = (payload.bodyHtml ?? "").trim();
  const bodyHtml = rawHtml ? rawHtml : textToHtml((payload.bodyText ?? "").trim());
  const bodyText = (payload.bodyText ?? "").trim() || bodyHtml.replace(/<[^>]+>/g, " ");
  const excerpt = (payload.excerpt ?? "").trim() || bodyText.replace(/\s+/g, " ").slice(0, 260);
  const listDate = (payload.listDate ?? "").trim();
  const newsDate = (payload.newsDate ?? "").trim();

  const values: Record<string, unknown> = {
    title,
    listDate,
    newsDate,
    excerpt,
    bodyHtml,
    bodyText,
    image: (payload.image ?? "").trim(),
    sortDate: parseSortDate(listDate, newsDate),
    updatedAt: new Date(),
  };

  if (payload.isPublished !== undefined) values.isPublished = Boolean(payload.isPublished);
  // 只在显式提交时改写，避免"编辑标题顺手把置顶取消掉"。
  if (payload.isPinned !== undefined) values.isPinned = Boolean(payload.isPinned);

  if (requireCategory || payload.categoryId !== undefined) {
    const categoryId = Number.parseInt(String(payload.categoryId ?? ""), 10);
    if (!Number.isFinite(categoryId)) throw new Error("A valid category is required.");
    values.categoryId = categoryId;
  }

  return values;
}
