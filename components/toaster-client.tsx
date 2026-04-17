"use client";

import { Toaster } from "sonner";

export function ToasterClient() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      dir="rtl"
      expand={false}
      visibleToasts={5}
      toastOptions={{
        duration: 3200,
        classNames: {
          toast:
            "group items-start gap-3 border border-border/90 bg-background shadow-lg rounded-xl px-4 py-3.5 pr-11 text-right",
          title: "text-base font-semibold leading-snug text-right",
          description: "text-sm leading-relaxed text-right opacity-90 whitespace-pre-wrap",
          success: "border-emerald-200/80 dark:border-emerald-900/50",
          error: "border-red-200/90 dark:border-red-900/50",
          warning: "border-amber-200/90 dark:border-amber-900/50",
        },
      }}
    />
  );
}

