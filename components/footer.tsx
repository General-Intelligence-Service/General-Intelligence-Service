import Link from "next/link";
import { siteConfig } from "@/lib/config";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="no-print border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-base text-muted-foreground">
          <p>
            © {currentYear} جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
}

