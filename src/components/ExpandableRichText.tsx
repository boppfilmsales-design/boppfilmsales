"use client";

import { useEffect, useRef, useState } from "react";
import { sanitizeRichHtml } from "@/lib/rich-text";

interface ExpandableRichTextProps {
  html: string;
  maxHeight?: number;
  expandLabel?: string;
  collapseLabel?: string;
  className?: string;
}

export default function ExpandableRichText({
  html,
  maxHeight = 240,
  expandLabel = "展开更多",
  collapseLabel = "收起",
  className = "",
}: ExpandableRichTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [needsExpand, setNeedsExpand] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    setNeedsExpand(el.scrollHeight > maxHeight);
  }, [html, maxHeight]);

  const cleanHtml = sanitizeRichHtml(html);

  return (
    <div className={className}>
      <div
        className="relative overflow-hidden transition-all duration-500"
        style={{ maxHeight: expanded ? undefined : maxHeight }}
      >
        <div
          ref={innerRef}
          className="news-body text-[15px] leading-[30px] text-[#5b6472]"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
        {!expanded && needsExpand && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/90 to-transparent" />
        )}
      </div>
      {needsExpand && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-[#c8102e] transition-colors hover:text-[#e31b3d] hover:underline"
        >
          {expanded ? collapseLabel : expandLabel}
          <span
            className="inline-block transition-transform duration-300"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▼
          </span>
        </button>
      )}
    </div>
  );
}
