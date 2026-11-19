"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Shield } from "lucide-react";
import { formatAuditTime } from "@/lib/audit-labels";

type Summary = {
  lastLogin: { timestamp: string; ip: string | null } | null;
  failedLast24h: number;
  dbReady: boolean;
};

export function SecurityAlerts() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/audit/summary", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data);
      })
      .catch(() => {});
  }, []);

  if (!data?.dbReady) return null;

  return (
    <div className="mb-4 space-y-2">
      {data.lastLogin && (
        <div className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-dark dark:text-brand-gold" />
          <p>
            آخر دخول لك:{" "}
            <span className="font-medium">{formatAuditTime(data.lastLogin.timestamp)}</span>
            {data.lastLogin.ip ? (
              <>
                {" "}
                من{" "}
                <span className="dir-ltr inline-block font-mono text-xs">
                  {data.lastLogin.ip}
                </span>
              </>
            ) : null}
          </p>
        </div>
      )}
      {data.failedLast24h > 5 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {data.failedLast24h} محاولات دخول فاشلة اليوم.{" "}
            <Link
              href="/dashboard/activity?action=auth.login_failed"
              className="font-semibold underline underline-offset-2"
            >
              عرض السجل
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
