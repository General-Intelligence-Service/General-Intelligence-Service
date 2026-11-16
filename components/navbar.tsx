"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, MonitorPlay } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteConfig } from "@/lib/config";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteLogo } from "@/components/site-logo";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => {
        if (!cancelled) setIsAdmin(res.ok);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav className="no-print lux-chrome-header sticky top-0 z-50 w-full">
      <div className="container mx-auto flex h-[4.25rem] items-center justify-between px-4">
        <Link
          href="/"
          className="flex min-w-0 max-w-none items-center gap-2 sm:gap-3"
        >
          <SiteLogo
            variant="default"
            layout="inline"
            className="max-w-[min(100%,20rem)]"
            priority
          />
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/#products"
            className="text-sm font-semibold text-brand-green-dark transition-colors hover:text-brand-gold-dark dark:text-brand-gold-light"
          >
            الهدايا
          </Link>
          <Link
            href="/present"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-green-dark dark:hover:text-brand-gold-light"
          >
            <MonitorPlay className="h-4 w-4 shrink-0" aria-hidden />
            عرض تقديمي
          </Link>
          {isAdmin && (
            <Link
              href="/dashboard"
              className="rounded-md border border-brand-gold/40 px-3 py-1.5 text-xs font-medium text-brand-green-dark transition-colors hover:bg-brand-gold/15 dark:text-brand-gold-light"
            >
              لوحة التحكم
            </Link>
          )}
          <ThemeToggle />
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-brand-green-dark/10 hover:text-brand-green-dark h-12 w-12"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">فتح القائمة</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>{siteConfig.name}</SheetTitle>
            </SheetHeader>
            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">المظهر</span>
                <ThemeToggle />
              </div>
              <Link
                href="/#products"
                onClick={() => setIsOpen(false)}
                className="text-lg font-medium transition-colors hover:text-brand-green-dark"
              >
                الهدايا
              </Link>
              <Link
                href="/present"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-lg font-medium text-muted-foreground transition-colors hover:text-brand-green-dark"
              >
                <MonitorPlay className="h-5 w-5 shrink-0" aria-hidden />
                عرض تقديمي
              </Link>
              {isAdmin && (
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-medium text-brand-green-dark transition-colors hover:text-brand-gold-dark dark:text-brand-gold-light"
                >
                  لوحة التحكم
                </Link>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
