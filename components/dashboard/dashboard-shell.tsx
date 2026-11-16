"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  ClipboardList,
  Plane,
  QrCode,
  ScanLine,
  HardDriveDownload,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (pathname: string, tab?: string | null) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "الهدايا",
    icon: Package,
    match: (pathname, tab) =>
      pathname === "/dashboard" && (!tab || tab === "products"),
  },
  {
    href: "/dashboard?tab=orders",
    label: "الطلبات",
    icon: ClipboardList,
    match: (pathname, tab) => pathname === "/dashboard" && tab === "orders",
  },
  {
    href: "/dashboard/trips",
    label: "الرحلات",
    icon: Plane,
    match: (pathname) => pathname.startsWith("/dashboard/trips"),
  },
  {
    href: "/dashboard/qr-codes",
    label: "رموز QR",
    icon: QrCode,
    match: (pathname) => pathname.startsWith("/dashboard/qr-codes"),
  },
  {
    href: "/dashboard/gift-scanner",
    label: "مسح الهدايا",
    icon: ScanLine,
    match: (pathname) =>
      pathname.startsWith("/dashboard/gift-scanner") || pathname === "/scan",
  },
  {
    href: "/dashboard?focus=backup",
    label: "النسخ الاحتياطي",
    icon: HardDriveDownload,
    match: () => false,
  },
];

function shortenEmail(email: string): string {
  const e = (email ?? "").trim();
  if (!e) return "—";
  if (e.length <= 22) return e;
  const [user, domain] = e.split("@");
  if (!domain) return `${e.slice(0, 18)}…`;
  const u = user.length > 8 ? `${user.slice(0, 6)}…` : user;
  return `${u}@${domain}`;
}

function SidebarContent({
  pathname,
  tab,
  email,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  tab: string | null;
  email: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const logoSrc = `${siteConfig.logoDarkPath || siteConfig.logoPath}?v=${siteConfig.logoAssetVersion}`;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-5">
        <Link href="/dashboard" onClick={onNavigate} className="block">
          <Image
            src={logoSrc}
            alt={siteConfig.logoAlt}
            width={480}
            height={130}
            className="mx-auto h-auto w-full max-w-[180px] object-contain brightness-0 invert"
            priority
          />
        </Link>
        <p className="mt-3 text-center text-sm font-semibold text-white/90">لوحة التحكم</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const active = item.match?.(pathname, tab) ?? false;
          const Icon = item.icon;
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/75 hover:bg-white/5 hover:text-white"
              )}
            >
              {active && (
                <span
                  className="absolute inset-y-2 right-0 w-1 rounded-full bg-[#C4A574]"
                  aria-hidden
                />
              )}
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-4 space-y-3">
        <p className="truncate px-1 text-xs text-white/60" title={email}>
          {shortenEmail(email)}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onLogout}
          className="min-h-[44px] w-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          <LogOut className="ml-2 h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}

export function DashboardShell({
  children,
  extra,
}: {
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  const pathname = usePathname() || "/dashboard";
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { email?: string }) => {
        if (j?.email) setEmail(j.email);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, tab]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      //
    }
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#F5F6F4] dark:bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-60 bg-[#0c3328] text-white lg:flex lg:flex-col">
        <SidebarContent
          pathname={pathname}
          tab={tab}
          email={email}
          onLogout={() => void handleLogout()}
        />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="إغلاق القائمة"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(100%,240px)] flex-col bg-[#0c3328] text-white shadow-2xl">
            <button
              type="button"
              className="absolute left-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              pathname={pathname}
              tab={tab}
              email={email}
              onNavigate={() => setMobileOpen(false)}
              onLogout={() => void handleLogout()}
            />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen w-full flex-col lg:pr-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-[#F5F6F4]/90 px-3 backdrop-blur dark:bg-background/90 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-brand-green-dark dark:text-brand-gold-light">
            لوحة التحكم
          </span>
        </header>
        <main className="flex-1">{children}</main>
        {extra}
      </div>
    </div>
  );
}
