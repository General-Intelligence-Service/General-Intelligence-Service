import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SiteLogo } from "@/components/site-logo";

export const metadata: Metadata = {
  title: "٤٠٤ — الصفحة غير موجودة",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 flex items-center justify-center">
            <SiteLogo
              variant="default"
              layout="stacked"
              className="mx-auto"
              priority
            />
          </div>

          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">HTTP 404</p>
          <h1 className="mb-2 text-4xl font-black text-brand-green-dark sm:text-5xl">٤٠٤</h1>
          <h2 className="mb-3 text-xl font-bold sm:text-2xl">الصفحة غير موجودة</h2>
          <p className="mb-8 text-sm leading-relaxed text-muted-foreground sm:text-base">
            الرابط غير صحيح، أو تم نقل الصفحة، أو أنك لا تملك صلاحية الوصول إليها.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-brand-green-dark px-5 text-sm font-semibold text-white hover:bg-brand-green-darker"
            >
              العودة للرئيسية
            </Link>
            <Link
              href="/#products"
              className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium hover:bg-muted"
            >
              تصفّح الهدايا
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
