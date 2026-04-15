"use client";

import { Toaster } from "sonner";

export function ToasterClient() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      dir="rtl"
      toastOptions={{
        duration: 2500,
      }}
    />
  );
}

