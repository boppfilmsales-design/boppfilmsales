import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { inquiries } from "@/db/schema";
import { logDbFallback } from "@/lib/db-log";

/**
 * 前台「客户留言墙」的数据层。
 *
 * 2026-10-02 起，留言墙改成与「新闻中心 → Employees Literary」同一套样式：
 * 列表页 + 每条留言的详情页（/message-wall/<id>）。这个模块给两个页面共用。
 *
 * ⚠️ 隐私红线：`email` 与 `phone` **从不**出现在 select 里。
 *    它们不进 SQL 结果，就不可能被模板误渲染到 HTML 上。
 */

/** 只有运营明确批准（is_public）且已回复（replied）的留言才会公开。 */
const PUBLIC_FILTER = and(eq(inquiries.isPublic, true), eq(inquiries.status, "replied"));

/** 列表用：不含正文全文，只要摘要所需字段。 */
export async function getPublicMessages(limit = 60) {
  try {
    return await db
      .select({
        id: inquiries.id,
        contact: inquiries.contact,
        company: inquiries.company,
        message: inquiries.message,
        reply: inquiries.reply,
        createdAt: inquiries.createdAt,
      })
      .from(inquiries)
      .where(PUBLIC_FILTER)
      .orderBy(desc(inquiries.createdAt))
      .limit(limit);
  } catch (error) {
    logDbFallback("message wall: failed to load messages", error);
    return [];
  }
}

/** 详情用：单条留言。未公开的留言返回 null（等同 404）。 */
export async function getPublicMessage(id: number) {
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const [row] = await db
      .select({
        id: inquiries.id,
        contact: inquiries.contact,
        company: inquiries.company,
        message: inquiries.message,
        reply: inquiries.reply,
        repliedAt: inquiries.repliedAt,
        createdAt: inquiries.createdAt,
      })
      .from(inquiries)
      .where(and(eq(inquiries.id, id), PUBLIC_FILTER))
      .limit(1);
    return row ?? null;
  } catch (error) {
    logDbFallback("message wall: failed to load message", error);
    return null;
  }
}

/**
 * 上一条 / 下一条。
 *
 * 列表按时间倒序（新的在前），所以：
 *   prev = 列表中排在当前这条**上面**的 → id 更大（更新）
 *   next = 排在**下面**的               → id 更小（更旧）
 * 用 id 比较即可，它是自增主键，与 created_at 同序。
 */
export async function getNeighbourMessages(id: number) {
  const cols = { id: inquiries.id, contact: inquiries.contact, company: inquiries.company };
  try {
    const [newer] = await db
      .select(cols)
      .from(inquiries)
      .where(and(PUBLIC_FILTER, gt(inquiries.id, id)))
      .orderBy(asc(inquiries.id))
      .limit(1);
    const [older] = await db
      .select(cols)
      .from(inquiries)
      .where(and(PUBLIC_FILTER, lt(inquiries.id, id)))
      .orderBy(desc(inquiries.id))
      .limit(1);
    return { prev: newer ?? null, next: older ?? null };
  } catch (error) {
    logDbFallback("message wall: failed to load neighbours", error);
    return { prev: null, next: null };
  }
}

export function fmtMessageDate(value: Date | string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

/** 有公司名就显示公司名，否则显示联系人。 */
export function displayName(company: string, contact: string): string {
  return (company && company !== contact ? company : contact) || "Customer";
}
