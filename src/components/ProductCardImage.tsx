"use client";

import { useState } from "react";
import { productImageUrl } from "@/lib/site";

export default function ProductCardImage({ image, title }: { image?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const src = image ? productImageUrl(image) : "";

  if (!src || failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_20%,#fff,#eef2f7)] text-slate-400">
        <span className="text-3xl font-light">◇</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Film solutions</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={title}
      className="h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-[1.04]"
      loading="lazy"
      onError={() => setFailed(true)}
      src={src}
    />
  );
}
