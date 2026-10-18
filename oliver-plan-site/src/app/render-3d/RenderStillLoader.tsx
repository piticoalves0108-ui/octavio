"use client";

import dynamic from "next/dynamic";

const RenderStill = dynamic(() => import("@/components/three/RenderStill"), { ssr: false });

export function RenderStillLoader({ id }: { id: string }) {
  return <RenderStill id={id} />;
}
