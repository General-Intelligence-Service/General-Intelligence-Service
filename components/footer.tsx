import Link from "next/link";
import { siteConfig } from "@/lib/config";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="no-print lux-chrome-footer">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-base text-muted-foreground space-y-2">
          <p>
            <Link href="/login" className="underline hover:text-foreground">تسجيل الدخول</Link>
            <span className="mx-2">·</span>
            <span>© {currentYear} جميع الحقوق محفوظة.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

