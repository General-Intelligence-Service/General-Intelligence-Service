"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import {
  isExternalOrArchiveImageSrc,
  PLACEHOLDER_PRODUCT_IMAGE,
} from "@/data/products";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { cn } from "@/lib/utils";

export type ImageLightboxProps = {
  open: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
  /** عنصر لإعادة التركيز إليه عند الإغلاق */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

function normalizeImages(images: string[]): string[] {
  const list = (images ?? []).map((u) => (typeof u === "string" ? u.trim() : "")).filter(Boolean);
  return list.length > 0 ? list : [PLACEHOLDER_PRODUCT_IMAGE];
}

export function ImageLightbox({
  open,
  onClose,
  images,
  initialIndex = 0,
  title,
  subtitle,
  returnFocusRef,
}: ImageLightboxProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const list = normalizeImages(images);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    if (!open) return;
    const i = Math.max(0, Math.min(list.length - 1, initialIndex));
    setIndex(i);
    setLoaded(false);
  }, [open, initialIndex, list.length]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 20);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      returnFocusRef?.current?.focus?.();
    };
  }, [open, returnFocusRef]);

  const go = useCallback(
    (delta: 1 | -1) => {
      if (list.length <= 1) return;
      setDirection(delta);
      setLoaded(false);
      setIndex((i) => (i + delta + list.length) % list.length);
    },
    [list.length]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        // RTL: اليمين = السابق
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (list.length <= 1) return;
    const x = info.offset.x;
    const vx = info.velocity.x;
    // في RTL: السحب لليسار → التالي
    if (x < -70 || vx < -600) go(1);
    else if (x > 70 || vx > 600) go(-1);
  };

  const src = list[index] ?? PLACEHOLDER_PRODUCT_IMAGE;
  const multi = list.length > 1;

  return (
    <AnimatePresence>
      {open && list.length > 0 && (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center p-3 sm:p-6"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="absolute left-3 top-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="إغلاق المعاينة"
          >
            <X className="h-5 w-5" />
          </button>

          <motion.div
            className="relative flex max-h-[85vh] w-full max-w-[90vw] flex-col items-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex max-h-[min(70vh,720px)] w-full items-center justify-center">
              {multi && (
                <>
                  <button
                    type="button"
                    className="absolute right-0 z-10 hidden h-11 w-11 -translate-y-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:inline-flex md:right-2"
                    style={{ top: "50%", transform: "translateY(-50%)" }}
                    onClick={() => go(-1)}
                    aria-label="الصورة السابقة"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    className="absolute left-0 z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:inline-flex md:left-2"
                    style={{ top: "50%", transform: "translateY(-50%)" }}
                    onClick={() => go(1)}
                    aria-label="الصورة التالية"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                </>
              )}

              <div className="relative flex max-h-[min(70vh,720px)] w-full max-w-[90vw] items-center justify-center overflow-hidden rounded-xl">
                {!loaded && (
                  <div className="absolute inset-0 z-[1] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white/80" aria-hidden />
                    <span className="sr-only">جاري تحميل الصورة</span>
                  </div>
                )}
                <AnimatePresence initial={false} custom={direction} mode="wait">
                  <motion.div
                    key={src}
                    custom={direction}
                    initial={{ opacity: 0, x: direction > 0 ? 28 : -28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction > 0 ? -28 : 28 }}
                    transition={{ duration: 0.18 }}
                    className="relative max-h-[min(70vh,720px)] w-full"
                    drag={multi ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.14}
                    onDragEnd={onDragEnd}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- نحتاج onLoad للـ spinner مع object-contain الحر */}
                    <img
                      src={src}
                      alt={title ? `معاينة ${title}` : "معاينة الصورة"}
                      className={cn(
                        "mx-auto max-h-[min(70vh,720px)] max-w-[90vw] select-none rounded-xl object-contain transition-opacity duration-200",
                        loaded ? "opacity-100" : "opacity-0"
                      )}
                      draggable={false}
                      onLoad={() => setLoaded(true)}
                      onError={() => setLoaded(true)}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-3 w-full max-w-xl text-center text-white">
              {title && (
                <p id={titleId} className="text-base font-semibold sm:text-lg">
                  {title}
                </p>
              )}
              {subtitle && <p className="mt-0.5 text-sm text-white/75">{subtitle}</p>}
              {multi && (
                <p className="mt-1 text-xs text-white/60 tabular-nums">
                  {index + 1} / {list.length}
                </p>
              )}
            </div>

            {multi && (
              <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 px-1">
                {list.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    onClick={() => {
                      if (i === index) return;
                      setDirection(i > index ? 1 : -1);
                      setLoaded(false);
                      setIndex(i);
                    }}
                    className={cn(
                      "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition",
                      i === index ? "border-white" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                    aria-label={`الصورة ${i + 1}`}
                    aria-current={i === index}
                  >
                    <Image
                      src={img}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                      unoptimized={isExternalOrArchiveImageSrc(img)}
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type ProductImageThumbProps = {
  images: string[];
  name: string;
  sku?: string;
  className?: string;
  /** حجم الحاوية بالبكسل تقريباً */
  sizeClassName?: string;
  sizes?: string;
};

/** صورة مصغرة قابلة للضغط مع مؤشر تكبير ومعاينة Lightbox */
export function ProductImageThumb({
  images,
  name,
  sku,
  className,
  sizeClassName = "h-12 w-12",
  sizes = "48px",
}: ProductImageThumbProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const list = normalizeImages(images);
  const thumb = list[0]!;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`معاينة صورة ${name}`}
        className={cn(
          "group/thumb relative overflow-hidden rounded-md border bg-white dark:bg-muted cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-dark",
          sizeClassName,
          className
        )}
      >
        <Image
          src={thumb}
          alt=""
          fill
          className="object-cover"
          sizes={sizes}
          unoptimized={isExternalOrArchiveImageSrc(thumb)}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover/thumb:bg-black/25 group-hover/thumb:opacity-100 group-focus-visible/thumb:bg-black/25 group-focus-visible/thumb:opacity-100"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#0c3328] shadow-sm">
            <Search className="h-3.5 w-3.5" />
          </span>
        </span>
      </button>
      <ImageLightbox
        open={open}
        onClose={() => setOpen(false)}
        images={list}
        title={name}
        subtitle={sku ? `كود: ${sku}` : undefined}
        returnFocusRef={btnRef}
      />
    </>
  );
}
