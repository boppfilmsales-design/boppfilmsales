import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { db } from "@/db";
import { inquiries } from "@/db/schema";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer Message Wall - Asia Pacific Industry Group",
  description:
    "Messages and enquiries from customers of Asia Pacific Industry Group Co., Limited — BOPP / BOPET film, tape and thermal laminating film.",
};

/**
 * Public message wall.
 *
 * Only rows an operator has explicitly approved (is_public = true) are ever
 * rendered. E-mail addresses and phone numbers are never selected from the
 * database in the first place, so they cannot leak into the HTML.
 */
async function getPublicMessages() {
  try {
    return await db
      .select({
        id: inquiries.id,
        contact: inquiries.contact,
        company: inquiries.company,
        message: inquiries.message,
        reply: inquiries.reply,
        language: inquiries.language,
        createdAt: inquiries.createdAt,
      })
      .from(inquiries)
      .where(and(eq(inquiries.isPublic, true), eq(inquiries.status, "replied")))
      .orderBy(desc(inquiries.createdAt))
      .limit(60);
  } catch (error) {
    console.error("message wall: failed to load messages", error);
    return [];
  }
}

function fmtDate(value: Date | string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

/** Show "Acme Corp" rather than a personal name when both are filled in. */
function displayName(company: string, contact: string): string {
  return (company && company !== contact ? company : contact) || "Customer";
}

export default async function MessageWallPage() {
  const messages = await getPublicMessages();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Contact" />

      <section className="border-b border-[#f0f0f0] bg-[#fafafa]">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <p className="text-[14px] leading-[55px] text-[#666]">
            <span className="mr-2 inline-block h-[14px] w-[3px] bg-[#e61d39] align-middle" />
            <span className="font-bold text-[#e61d39]">Home</span> / Message Wall
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <h1 className="text-center text-[30px] font-bold uppercase text-[#e61d39]">Message Wall</h1>
          <i className="mx-auto mt-[15px] block h-[5px] w-[92px] bg-[#e61d39]" />
          <p className="mx-auto mt-5 max-w-[720px] text-center text-[14px] leading-[26px] text-[#777]">
            Enquiries we have received and answered. Contact details are kept private.
          </p>

          {messages.length === 0 ? (
            <div className="mx-auto mt-10 max-w-[720px] border border-[#eee] bg-[#fafafa] py-14 text-center text-[14px] text-[#888]">
              No messages have been published yet.
            </div>
          ) : (
            <ul className="mx-auto mt-10 max-w-[900px] space-y-5">
              {messages.map((row) => (
                <li className="border border-[#eee] bg-white p-5" key={row.id}>
                  <div className="flex flex-wrap items-center gap-3 border-b border-[#f4f4f4] pb-3">
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#c8102e] text-[13px] font-bold text-white">
                      {displayName(row.company, row.contact).slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-[14px] font-bold text-[#333]">
                      {displayName(row.company, row.contact)}
                    </span>
                    <span className="ml-auto text-[12px] text-[#999]">{fmtDate(row.createdAt)}</span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-[13px] leading-[26px] text-[#555]">
                    {row.message}
                  </p>

                  {row.reply ? (
                    <div className="mt-3 border-l-[3px] border-[#c8102e] bg-[#fdf6f7] px-4 py-3">
                      <p className="text-[11px] font-bold text-[#c8102e]">Reply from Asia Pacific</p>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-[24px] text-[#555]">
                        {row.reply}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 text-center">
            <Link
              className="inline-block border border-[#c8102e] bg-white px-7 py-2.5 text-[14px] font-medium text-[#c8102e] transition hover:bg-[#c8102e] hover:text-white"
              href="/contact"
            >
              Send us your message
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
