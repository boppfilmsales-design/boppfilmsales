"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { inquiries } from "@/db/schema";

function field(formData: FormData, name: string, max: number): string {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

export async function submitInquiry(formData: FormData) {
  const company = field(formData, "company", 200);
  const contact = field(formData, "contact", 120);
  const email = field(formData, "email", 254).toLowerCase();
  const message = field(formData, "message", 5000);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!contact || !emailOk || message.length < 10) {
    redirect("/contact?status=invalid");
  }

  await db.insert(inquiries).values({ company, contact, email, message, language: "en" });
  redirect("/contact?status=sent");
}
