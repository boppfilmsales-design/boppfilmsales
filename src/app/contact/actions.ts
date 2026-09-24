"use server";

import { db } from "@/db";
import { inquiries } from "@/db/schema";

/**
 * Result handed back to <InquiryForm> via useActionState. We deliberately do
 * NOT redirect any more: a redirect would discard the operator's field values
 * and it made the shared client component impossible to reuse.
 */
export type InquiryState = { status?: "sent" | "invalid" | "error"; error?: string };

function field(formData: FormData, name: string, max: number): string {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

export async function submitInquiry(
  _prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const contact = field(formData, "contact", 120);
  const email = field(formData, "email", 254).toLowerCase();
  const phone = field(formData, "phone", 50);
  const message = field(formData, "message", 5000);
  const lang = field(formData, "lang", 8) === "zh" ? "zh" : "en";
  const sourcePage = field(formData, "sourcePage", 120) || "/contact";

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!contact || !emailOk || message.length < 10) {
    return { status: "invalid" };
  }

  try {
    await db.insert(inquiries).values({
      // The single "Company or Name" box: store it in `contact`, and mirror it
      // into `company` so the admin table keeps showing something useful.
      company: contact,
      contact,
      email,
      phone,
      message,
      language: lang,
      sourcePage,
    });
  } catch (error) {
    console.error("submitInquiry failed:", error);
    return { status: "error", error: (error as Error).message };
  }

  return { status: "sent" };
}
