"use client";

import Link from "next/link";
import React, { useState } from "react";
import { sanitizeRichHtml } from "@/lib/rich-text";

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return isExternalUrl(href) ? (
    <a className="text-red-600 hover:text-[#c9a227] hover:underline" href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  ) : (
    <Link className="text-red-600 hover:text-[#c9a227] hover:underline" href={href}>
      {children}
    </Link>
  );
}

interface AccordionItemProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function AccordionSection({ title, defaultOpen = false, children }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-2 overflow-hidden rounded bg-[#c8102e] shadow-sm ring-1 ring-inset ring-[#f2d66c]/30">
      {/* 标题栏：完美对齐源站的红底白字、白色圆点与加减号 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-3 text-left font-bold text-white transition hover:bg-[#a30d25]"
      >
        <span className="flex items-center gap-2.5 text-xs tracking-wider uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-white inline-block"></span>
          {title}
        </span>
        <span className="text-base font-normal text-white">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {/* 内容展开区：白底黑字 */}
      {isOpen && (
        <div className="bg-white p-6 text-xs leading-relaxed text-gray-700 space-y-4 border-t border-red-700">
          {children}
        </div>
      )}
    </div>
  );
}

interface ProductDetailSectionProps {
  description?: string;
  parameters?: Array<{ key: string; value: string }>;
  technicalDetails?: string;
  offerDetails?: string;
  inquiryContent?: React.ReactNode;
  helpfulLinks?: Array<{ title: string; url: string }>;
}

export default function ProductDetailSection({
  description,
  parameters,
  technicalDetails,
  offerDetails,
  inquiryContent,
  helpfulLinks,
}: ProductDetailSectionProps) {
  return (
    <div className="mt-8 space-y-1">
      {/* 1. DESCRIPTION */}
      <AccordionSection title="DESCRIPTION" defaultOpen={true}>
        <div 
          className="prose max-w-none text-xs text-gray-700 leading-relaxed whitespace-pre-line"
          dangerouslySetInnerHTML={{
            __html: sanitizeRichHtml(description) || "Detailed product description coming soon."
          }}
        />
      </AccordionSection>

      {/* 2. TECHNICAL PARAMETERS */}
      <AccordionSection title="TECHNICAL PARAMETERS" defaultOpen={false}>
        {technicalDetails ? (
          <div className="prose max-w-none text-xs text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(technicalDetails) }} />
        ) : parameters && parameters.length > 0 ? (
          <table className="w-full text-left text-xs">
            <tbody>
              {parameters.map((param, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2.5 font-medium text-gray-600 w-1/3">{param.key}</td>
                  <td className="py-2.5 text-gray-800">{param.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 italic">Standard technical data sheets apply to this product grade.</p>
        )}
      </AccordionSection>

      {/* 3. OFFER DETAILS */}
      <AccordionSection title="OFFER DETAILS" defaultOpen={false}>
        <div
          className="prose max-w-none text-xs text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: sanitizeRichHtml(offerDetails) || "<p>We offer competitive pricing (FOB / CNF terms available). Minimum order quantity (MOQ) and customized slitting/packaging options can be negotiated based on specific requirements. Contact our sales team for an updated quotation.</p>",
          }}
        />
      </AccordionSection>

      {/* 4. MAKE AN INQUIRY */}
      <AccordionSection title="MAKE AN INQUIRY" defaultOpen={false}>
        <div className="text-gray-700 space-y-3">
          <p>Interested in this product? Send us your inquiry directly, and our export team will respond within 24 hours.</p>
          {inquiryContent || (
            <div className="pt-2">
              <Link
                href="/contact"
                className="inline-block rounded bg-[#c8102e] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white transition hover:bg-[#a30d25]"
              >
                Submit Inquiry Form
              </Link>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* 5. HELPFUL LINKS */}
      <AccordionSection title="HELPFUL LINKS" defaultOpen={false}>
        <ul className="list-disc pl-5 space-y-2 text-gray-600">
          {helpfulLinks && helpfulLinks.length > 0 ? (
            helpfulLinks.map((link, idx) => (
              <li key={idx}>
                <NavLink href={link.url}>{link.title}</NavLink>
              </li>
            ))
          ) : (
            <>
              <li><NavLink href="/products">Browse All BOPP / BOPET Film Products</NavLink></li>
              <li><NavLink href="/contact">Contact Sales Representative for Custom Quotes</NavLink></li>
              <li><NavLink href="/downloads">Download Company Catalogs & Certificates</NavLink></li>
            </>
          )}
        </ul>
      </AccordionSection>
    </div>
  );
}