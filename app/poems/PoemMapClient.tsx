"use client";

import dynamic from "next/dynamic";

const PoemMap = dynamic(() => import("@/components/PoemMap"), { ssr: false });

export default function PoemMapClient() {
  return <PoemMap />;
}
