"use client";

import Image from "next/image";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

export type SiteLogoVariant = "default" | "light" | "onDark";
export type SiteLogoLayout = "inline" | "stacked";

type SiteLogoProps = {
  /**
   * default — نص أخضر داكن (ذهبي في الوضع الداكن)
   * light — نص أبيض (Hero بخلفية خضراء)
   * onDark — نص أبيض (شريط لوحة التحكم)
   * الدرع دائماً بألوانه الأصلية بدون أي فلتر
   */
  variant?: SiteLogoVariant;
  /** inline = درع + نص بجانب بعض (الهيدر)، stacked = درع فوق النص (Hero / دخول) */
  layout?: SiteLogoLayout;
  className?: string;
  iconClassName?: string;
  priority?: boolean;
  /** للتوافق مع الاستدعاءات القديمة — يُتجاهل */
  width?: number;
  height?: number;
  sizes?: string;
};

const AR_TITLE = "جهاز الاستخبارات العامة";
const EN_TITLE = "GENERAL INTELLIGENCE SERVICE";

export function SiteLogo({
  variant = "default",
  layout = "inline",
  className,
  iconClassName,
  priority = false,
}: SiteLogoProps) {
  const iconSrc = `${siteConfig.iconPath}?v=${siteConfig.logoAssetVersion}`;

  const textClass =
    variant === "light" || variant === "onDark"
      ? "text-white"
      : "text-brand-green-dark dark:text-brand-gold-light";

  const enClass =
    variant === "light" || variant === "onDark"
      ? "text-white/85"
      : "text-brand-green-dark/80 dark:text-brand-gold-light/85";

  const shield = (
    <Image
      src={iconSrc}
      alt=""
      width={512}
      height={512}
      priority={priority}
      className={cn(
        "object-contain shrink-0",
        layout === "stacked"
          ? "h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24"
          : "h-10 w-10 sm:h-11 sm:w-11",
        iconClassName
      )}
      sizes={layout === "stacked" ? "96px" : "44px"}
      aria-hidden
    />
  );

  const titles = (
    <span className={cn("min-w-0 text-right", layout === "stacked" && "text-center")}>
      <span
        className={cn(
          "block font-bold leading-tight",
          layout === "stacked" ? "text-lg sm:text-xl md:text-2xl" : "text-sm sm:text-base",
          textClass
        )}
      >
        {AR_TITLE}
      </span>
      <span
        className={cn(
          "mt-0.5 block font-semibold uppercase tracking-[0.12em]",
          layout === "stacked" ? "text-[10px] sm:text-xs md:text-sm" : "text-[9px] sm:text-[10px]",
          enClass
        )}
      >
        {EN_TITLE}
      </span>
    </span>
  );

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2.5 sm:gap-3",
        layout === "stacked" && "flex-col gap-3 sm:gap-4",
        className
      )}
      role="img"
      aria-label={siteConfig.logoAlt}
    >
      {shield}
      {titles}
    </span>
  );
}
