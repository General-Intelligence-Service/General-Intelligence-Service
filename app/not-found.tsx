import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "٤٠٤ — الصفحة غير موجودة",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  const logoSrc = `${siteConfig.logoPath}?v=${siteConfig.logoAssetVersion}`;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 flex items-center justify-center">
            <div className="relative h-12 w-[220px] sm:h-14 sm:w-[260px]">
              <Image
                src={logoSrc}
                alt={siteConfig.logoAlt}
                fill
                className="object-contain"
                priority
                sizes="(max-width: 640px) 220px, 260px"
              />
            </div>
          </div>

          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">HTTP 404</p>
          <h1 className="mb-2 text-4xl font-black text-brand-green-dark sm:text-5xl">٤٠٤</h1>
          <h2 className="mb-3 text-xl font-bold sm:text-2xl">الصفحة غير موجودة</h2>
          <p className="mb-8 text-sm leading-relaxed text-muted-foreground sm:text-base">
            الرابط غير صحيح، أو تم نقل الصفحة، أو أنك لا تملك صلاحية الوصول إليها.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-md bg-brand-green-dark px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-green-darker focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              العودة للرئيسية
            </Link>
            <Link
              href="/#products"
              className="inline-flex h-11 items-center justify-center rounded-md border border-brand-gold bg-background px-4 text-sm font-semibold text-brand-green-dark transition-colors hover:bg-brand-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              الانتقال إلى الكتالوج
            </Link>
            <Link
              href="/order"
              className="inline-flex h-11 items-center justify-center rounded-md border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:col-span-2"
            >
              صفحة الطلبية
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

