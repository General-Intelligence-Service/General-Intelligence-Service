import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function GisAdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
