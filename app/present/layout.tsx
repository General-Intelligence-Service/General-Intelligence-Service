import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "عرض تقديمي",
  description: `عرض الكتالوج بملء الشاشة — ${siteConfig.name}`,
  robots: { index: false, follow: false },
};

export default function PresentLayout({ children }: { children: ReactNode }) {
  return children;
}
