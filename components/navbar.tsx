"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { generateWhatsAppLinkGeneral } from "@/lib/whatsapp";
import { siteConfig } from "@/lib/config";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0">
            <Image
              src="/1.png"
              alt="شعار إدارة التأهيل والتدريب"
              fill
              className="object-contain text-[0px]"
              priority
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/#products"
            className="flex flex-col w-fit h-[29px] text-base font-medium transition-colors hover:text-brand-green-dark"
          >
            المنتجات
          </Link>
          <Link
            href="/dashboard"
            className="text-base font-medium transition-colors hover:text-brand-green-dark"
          >
            لوحة التحكم
          </Link>
        </div>

        {/* Mobile Navigation */}
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
              <Link
                href="/#products"
                onClick={() => setIsOpen(false)}
                className="text-lg font-medium transition-colors hover:text-brand-green-dark"
              >
                المنتجات
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="text-lg font-medium transition-colors hover:text-brand-green-dark"
              >
                لوحة التحكم
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

