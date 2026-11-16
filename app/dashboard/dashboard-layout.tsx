"use client";

import React, { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export function DashboardLayout({
  children,
  extra,
}: {
  children?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F5F6F4] dark:bg-background">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      }
    >
      <DashboardShell extra={extra}>{children}</DashboardShell>
    </Suspense>
  );
}
