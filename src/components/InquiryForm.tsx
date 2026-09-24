"use client";

import { useActionState } from "react";
import { submitInquiry, type InquiryState } from "@/app/contact/actions";

/**
 * The one and only customer message form.
 *
 * It is shared by the home page CONTACT block, /contact and /zh/contact so the
 * three entry points can never drift apart again. Previously the home page
 * posted a raw `method="POST" action="/contact"` — a request the App Router has
 * no handler for, so those messages were answered with a 405 and lost.
 */

const COPY = {
  en: {
    email: "Email",
    contact: "Company or Name",
    phone: "Tel or Mobile",
    message: "Leave a message",
    hint: "(Please send us your idea or plan)",
    submit: "Send Message",
    sent: "Thank you. Your inquiry has been saved and our sales team will contact you shortly.",
    invalid: "Please provide a valid email, your name or company, and a message of at least 10 characters.",
    failed: "Something went wrong while sending. Please try again, or e-mail us directly.",
  },
  zh: {
    email: "邮箱",
    contact: "公司或姓名",
    phone: "电话 / 手机",
    message: "留言内容",
    hint: "（请告诉我们您的需求或计划）",
    submit: "发送留言",
    sent: "感谢您的留言，我们已收到，销售团队会尽快与您联系。",
    invalid: "请填写有效的邮箱、公司或姓名，以及不少于 10 个字的留言内容。",
    failed: "提交时出现问题，请重试，或直接给我们发邮件。",
  },
} as const;

export default function InquiryForm({
  lang = "en",
  sourcePage = "/contact",
  compact = false,
  variant = "default",
}: {
  lang?: "en" | "zh";
  /** Recorded with the inquiry so the admin knows which page it came from. */
  sourcePage?: string;
  /** Tighter vertical rhythm for the home-page block. */
  compact?: boolean;
  /** "source" matches the legacy apigcl.com/contact.php inline form style. */
  variant?: "default" | "source";
}) {
  const t = COPY[lang];
  const [state, formAction, pending] = useActionState<InquiryState, FormData>(submitInquiry, {});

  const banner = state.status
    ? state.status === "sent"
      ? { cls: "border-emerald-200 bg-emerald-50 text-emerald-700", text: t.sent }
      : state.status === "invalid"
        ? { cls: "border-amber-200 bg-amber-50 text-amber-800", text: t.invalid }
        : { cls: "border-red-200 bg-red-50 text-red-700", text: t.failed }
    : null;

  if (variant === "source") {
    return (
      <form action={formAction}>
        <input name="lang" type="hidden" value={lang} />
        <input name="sourcePage" type="hidden" value={sourcePage} />

        {banner ? (
          <p className={`mb-5 rounded border px-4 py-3 text-[13px] ${banner.cls}`} role="status">
            {banner.text}
          </p>
        ) : null}

        {/* Three inline fields matching the source contact.php layout. */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
          <p className="flex flex-col gap-2 text-[14px]">
            <span className="text-[#333]">
              {t.email} <span className="text-[#c8102e]">*</span>
            </span>
            <input
              autoComplete="email"
              className="h-[36px] w-full rounded border border-[#dadada] px-3 text-[14px] text-[#555] outline-none focus:border-[#c8102e]"
              maxLength={254}
              name="email"
              required
              type="email"
            />
          </p>

          <p className="flex flex-col gap-2 text-[14px]">
            <span className="text-[#333]">{t.contact}</span>
            <input
              autoComplete="name"
              className="h-[36px] w-full rounded border border-[#dadada] px-3 text-[14px] text-[#555] outline-none focus:border-[#c8102e]"
              maxLength={120}
              name="contact"
            />
          </p>

          <p className="flex flex-col gap-2 text-[14px]">
            <span className="text-[#333]">{t.phone}</span>
            <input
              autoComplete="tel"
              className="h-[36px] w-full rounded border border-[#dadada] px-3 text-[14px] text-[#555] outline-none focus:border-[#c8102e]"
              maxLength={50}
              name="phone"
            />
          </p>
        </div>

        <p className="mt-4 flex flex-col gap-2 text-[14px]">
          <span className="text-[#333]">
            {t.message} <span className="text-[#888]">({t.hint})</span>
          </span>
          <textarea
            className="h-[140px] w-full rounded border border-[#dadada] px-3 py-[10px] text-[14px] text-[#555] outline-none focus:border-[#c8102e]"
            maxLength={5000}
            name="message"
            required
          />
        </p>

        <p className="mt-5">
          <button
            className="h-[45px] rounded border border-[#c8102e] bg-white px-10 text-[14px] font-medium text-[#c8102e] transition hover:bg-[#c8102e] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? "…" : t.submit}
          </button>
        </p>
      </form>
    );
  }

  return (
    <form action={formAction} className={compact ? "space-y-4" : "space-y-4"}>
      <input name="lang" type="hidden" value={lang} />
      <input name="sourcePage" type="hidden" value={sourcePage} />

      {banner ? (
        <p className={`rounded-lg border px-4 py-3 text-[13px] ${banner.cls}`} role="status">
          {banner.text}
        </p>
      ) : null}

      <div>
        <label className="block text-[13px] text-[#666] mb-1">
          {t.email} <span className="text-[#c8102e]">*</span>
        </label>
        <input
          autoComplete="email"
          className="w-full rounded border border-[#dfdfdf] bg-white px-3 py-[10px] text-[14px] focus:border-[#c8102e] focus:outline-none"
          maxLength={254}
          name="email"
          required
          type="email"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-[13px] text-[#666] mb-1">
            {t.contact} <span className="text-[#c8102e]">*</span>
          </label>
          <input
            autoComplete="name"
            className="w-full rounded border border-[#dfdfdf] bg-white px-3 py-[10px] text-[14px] focus:border-[#c8102e] focus:outline-none"
            maxLength={120}
            name="contact"
            required
          />
        </div>
        <div>
          <label className="block text-[13px] text-[#666] mb-1">{t.phone}</label>
          <input
            autoComplete="tel"
            className="w-full rounded border border-[#dfdfdf] bg-white px-3 py-[10px] text-[14px] focus:border-[#c8102e] focus:outline-none"
            maxLength={50}
            name="phone"
          />
        </div>
      </div>

      <div>
        <label className="block text-[13px] text-[#666] mb-1">
          {t.message} <span className="text-[#888] font-normal">{t.hint}</span>
        </label>
        <textarea
          className="h-[140px] w-full rounded border border-[#dfdfdf] bg-white px-3 py-[10px] text-[14px] focus:border-[#c8102e] focus:outline-none"
          maxLength={5000}
          name="message"
          required
        />
      </div>

      <div>
        <button
          className="rounded border border-[#c8102e] bg-white px-7 py-2.5 text-[14px] font-medium text-[#c8102e] transition hover:bg-[#c8102e] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "…" : t.submit}
        </button>
      </div>
    </form>
  );
}
