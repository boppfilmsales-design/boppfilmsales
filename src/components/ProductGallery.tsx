"use client";

import { useMemo, useState } from "react";
import { productImageUrl } from "@/lib/site";

type Props = {
  images?: string[];
  title: string;
  noImageLabel?: string;
};

export default function ProductGallery({ images = [], title, noImageLabel = "Image unavailable" }: Props) {
  const sources = useMemo(() => images.map(productImageUrl).filter(Boolean), [images]);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const available = sources.map((src, index) => ({ src, index })).filter(({ index }) => !failed.has(index));
  const selected = available.find(({ index }) => index === active) ?? available[0];

  function markFailed(index: number) {
    setFailed((current) => new Set(current).add(index));
  }

  return (
    <div className="product-gallery rounded-[28px] border border-slate-200/80 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_50%_30%,#fff_0%,#f1f5f9_75%)] sm:h-[480px]">
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={title}
            className="h-full w-full object-contain p-4 transition-all duration-300"
            onError={() => markFailed(selected.index)}
            src={selected.src}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl">◇</span>
            <span className="text-xs font-bold uppercase tracking-[0.18em]">{noImageLabel}</span>
          </div>
        )}
        {available.length > 0 && (
          <span className="absolute left-4 top-4 rounded-full bg-slate-950/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur">
            Product gallery · {available.length}
          </span>
        )}
      </div>
      {available.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1" aria-label="Product gallery thumbnails">
          {available.map(({ src, index }) => (
            <button
              aria-label={`View image ${index + 1}`}
              className={`h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border-2 bg-slate-50 p-1 transition ${
                selected?.index === index ? "border-[#c8102e] shadow-md" : "border-transparent hover:border-slate-300"
              }`}
              key={`${src}-${index}`}
              onClick={() => setActive(index)}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="h-full w-full object-cover" onError={() => markFailed(index)} src={src} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
