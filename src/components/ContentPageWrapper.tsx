"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ContentColumnPage } from "@/components/pages/Sections";

type Props = {
  kind: "about" | "lines" | "honor" | "service" | "cases";
};

function ContentWithParams({ kind }: Props) {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? searchParams.get("c_id") ?? undefined;
  const sourceId = id ? Number(id) : undefined;
  return <ContentColumnPage kind={kind} sourceId={sourceId} />;
}

export default function ContentPageWrapper({ kind }: Props) {
  return (
    <Suspense fallback={null}>
      <ContentWithParams kind={kind} />
    </Suspense>
  );
}
