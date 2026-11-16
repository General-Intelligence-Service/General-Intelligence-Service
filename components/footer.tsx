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
            © {currentYear} جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </footer>
  );
}
