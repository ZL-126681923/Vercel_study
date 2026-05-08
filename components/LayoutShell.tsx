"use client";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  return <main className="flex-1 pt-16">{children}</main>;
}
