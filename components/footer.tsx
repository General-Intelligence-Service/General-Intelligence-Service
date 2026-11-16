import Link from "next/link";
import { siteConfig } from "@/lib/config";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="no-print lux-chrome-footer">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-base font-semibold text-brand-green-dark dark:text-brand-gold-light">
            {siteConfig.name}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{siteConfig.description}</p>
          <div className="mt-5 h-px w-16 mx-auto bg-brand-gold/50" aria-hidden />
          <p className="mt-5 text-sm text-muted-foreground">
            <Link href="/login" className="underline-offset-4 hover:text-foreground hover:underline">
              تسجيل الدخول
            </Link>
            <span className="mx-2 text-brand-gold/70">·</span>
            <span>© {currentYear} جميع الحقوق محفوظة</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
