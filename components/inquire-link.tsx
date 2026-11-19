"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, Mail, X } from "lucide-react";
import {
  generateWhatsAppLink,
  getContactEmail,
  getInquireMailto,
  getWhatsAppNumber,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { notifySuccess } from "@/lib/notify";

type Props = {
  name: string;
  sku: string;
  className?: string;
  title?: string;
  children: ReactNode;
};

export function InquireLink({
  name,
  sku,
  className,
  title = "استفسر عن الهدية",
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const phone = getWhatsAppNumber();
  const email = getContactEmail();
  const waHref = phone ? generateWhatsAppLink(name, sku) : "";
  const mailHref = getInquireMailto(name, sku);

  const openFallback = () => {
    if (!email && !waHref) return;
    setOpen(true);
  };

  const copyEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      notifySuccess("تم نسخ البريد");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      //
    }
  };

  // واتساب مفضّل عند وجود الرقم
  if (waHref) {
    return (
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        aria-label={title}
        className={className}
      >
        {children}
      </a>
    );
  }

  if (!email) {
    return (
      <span
        title="اضبط NEXT_PUBLIC_WHATSAPP_NUMBER أو NEXT_PUBLIC_CONTACT_EMAIL"
        className={cn("cursor-not-allowed opacity-50", className)}
        aria-disabled
      >
        {children}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        title={title}
        aria-label={title}
        className={className}
        onClick={openFallback}
      >
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="إغلاق"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="بيانات التواصل"
            className="relative z-10 w-full max-w-sm rounded-xl border bg-background p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">استفسر عن الهدية</h2>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {name.trim()} · {sku.trim()}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground mb-1">البريد</p>
              <p className="text-sm font-medium break-all dir-ltr text-left" dir="ltr">
                {email}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void copyEmail()}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "تم النسخ" : "نسخ البريد"}
              </button>
              <a
                href={mailHref}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md bg-brand-green-dark px-3 text-sm font-medium text-white hover:bg-brand-green-darker"
              >
                <Mail className="h-4 w-4" />
                فتح البريد
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
