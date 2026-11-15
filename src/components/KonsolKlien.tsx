"use client";

import dynamic from "next/dynamic";

// peta butuh WebGL dan window, jadi konsol cuma dirender di browser
const Konsol = dynamic(() => import("@/components/Konsol"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-bg" />,
});

export default function KonsolKlien() {
  return <Konsol />;
}
