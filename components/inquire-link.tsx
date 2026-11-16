"use client";

import type { ReactNode } from "react";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

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
  const href = generateWhatsAppLink(name, sku);
  if (!href) {
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
    <a
      href={href}
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
