"use client";

import { usePathname } from "next/navigation";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isImmersive = pathname === "/taken";
  return <main className={isImmersive ? "flex-1" : "flex-1 pt-16"}>{children}</main>;
}
