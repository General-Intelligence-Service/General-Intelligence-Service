"use client";

import React from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export function DashboardLayout({
  children,
  extra,
}: {
  children?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30 min-h-screen">{children}</main>
      {extra}
    </div>
  );
}
