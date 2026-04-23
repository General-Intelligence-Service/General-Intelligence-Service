"use client";

import { motion, useReducedMotion } from "framer-motion";
import { catalogEase } from "@/lib/catalog-motion";

/**
 * حركة دخول بسيطة للصفحة عند أول تحميل (تلاشي طفيف + انزلاق بسيط).
 */
export function SiteEntrance({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  return (
    <motion.div
      className="min-h-screen w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: catalogEase }}
    >
      {children}
    </motion.div>
  );
}
