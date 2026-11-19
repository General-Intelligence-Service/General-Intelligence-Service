"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Copy, Download, Loader2, ShieldCheck, ShieldOff, KeyRound } from "lucide-react";
import { DashboardLayout } from "@/app/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";

type Status = {
  enabled: boolean;
  backupCodesRemaining: number;
  require2fa: boolean;
  dbReady: boolean;
  encryptionReady: boolean;
};

export default function SecurityPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // setup
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [manualSecret, setManualSecret] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  // disable
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  // regenerate
  const [regenCode, setRegenCode] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/2fa/status", { credentials: "include" });
      const json = await res.json();
      if (json.success) setStatus(json.data);
    } catch {
      notifyError("تعذر تحميل حالة الأمان");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    setBusy(true);
    setBackupCodes(null);
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) {
        notifyError(json.error || "فشل بدء التفعيل");
        return;
      }
      setQrDataUrl(json.data.qrDataUrl);
      setManualSecret(json.data.secret);
      setConfirmCode("");
    } catch {
      notifyError("فشل الاتصال");
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: confirmCode.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        notifyError(json.error || "رمز غير صحيح");
        return;
      }
      setBackupCodes(json.data.backupCodes as string[]);
      setQrDataUrl("");
      setManualSecret("");
      setConfirmCode("");
      notifySuccess("تم تفعيل التحقق الثنائي");
      await loadStatus();
    } catch {
      notifyError("فشل التأكيد");
    } finally {
      setBusy(false);
    }
  };

  const disable2fa = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        notifyError(json.error || "فشل التعطيل");
        return;
      }
      notifySuccess("تم تعطيل التحقق الثنائي");
      setDisablePassword("");
      setDisableCode("");
      setBackupCodes(null);
      await loadStatus();
    } catch {
      notifyError("فشل التعطيل");
    } finally {
      setBusy(false);
    }
  };

  const regenerateBackup = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/regenerate-backup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: regenCode.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        notifyError(json.error || "فشل إعادة التوليد");
        return;
      }
      setBackupCodes(json.data.backupCodes as string[]);
      setRegenCode("");
      notifySuccess("تم توليد رموز جديدة");
      await loadStatus();
    } catch {
      notifyError("فشل إعادة التوليد");
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    if (!backupCodes?.length) return;
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      notifySuccess("تم نسخ الرموز");
    } catch {
      notifyError("تعذر النسخ");
    }
  };

  const downloadCodes = () => {
    if (!backupCodes?.length) return;
    const blob = new Blob(
      [
        "رموز احتياطية للتحقق الثنائي — كتالوج الهدايا\n",
        "احفظها في مكان آمن. كل رمز يُستخدم مرة واحدة.\n\n",
        backupCodes.join("\n"),
        "\n",
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gis-2fa-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fieldClass =
    "h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-brand-green-dark/20";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-green-dark dark:text-brand-gold-light">
            الأمان والتحقق الثنائي
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            حماية لوحة التحكم برمز متغيّر من تطبيق المصادقة
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل...
          </div>
        ) : (
          <>
            {status && !status.dbReady && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                قاعدة البيانات غير مُعدّة. أضف POSTGRES_URL لتفعيل 2FA وسجل النشاط.
              </div>
            )}
            {status?.require2fa && !status.enabled && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                مطلوب تفعيل التحقق الثنائي قبل استخدام باقي صفحات اللوحة (REQUIRE_2FA).
              </div>
            )}

            <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-3">
                {status?.enabled ? (
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                ) : (
                  <ShieldOff className="h-6 w-6 text-muted-foreground" />
                )}
                <div>
                  <p className="font-semibold">
                    {status?.enabled ? "التحقق الثنائي مفعّل" : "التحقق الثنائي غير مفعّل"}
                  </p>
                  {status?.enabled && (
                    <p className="text-xs text-muted-foreground">
                      رموز احتياطية متبقية: {status.backupCodesRemaining}
                    </p>
                  )}
                </div>
              </div>

              {!status?.enabled && !qrDataUrl && (
                <Button
                  type="button"
                  disabled={busy || !status?.dbReady}
                  onClick={() => void startSetup()}
                  className="bg-brand-green-dark text-white hover:bg-[#145a48]"
                >
                  {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                  تفعيل التحقق الثنائي
                </Button>
              )}

              {qrDataUrl && (
                <div className="space-y-4 border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    امسح الرمز بتطبيق Google Authenticator أو Microsoft Authenticator
                  </p>
                  <div className="flex justify-center rounded-lg border bg-white p-4">
                    <Image
                      src={qrDataUrl}
                      alt="رمز QR للتحقق الثنائي"
                      width={240}
                      height={240}
                      unoptimized
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">أو أدخل السر يدوياً:</p>
                    <code
                      dir="ltr"
                      className="block break-all rounded-md bg-muted px-3 py-2 text-left text-sm font-mono"
                    >
                      {manualSecret}
                    </code>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      رمز التأكيد (6 أرقام)
                    </label>
                    <input
                      value={confirmCode}
                      onChange={(e) =>
                        setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className={cn(fieldClass, "dir-ltr text-center tracking-[0.3em]")}
                      dir="ltr"
                      placeholder="000000"
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={busy || confirmCode.length !== 6}
                    onClick={() => void confirmSetup()}
                    className="bg-brand-green-dark text-white"
                  >
                    تأكيد التفعيل
                  </Button>
                </div>
              )}
            </section>

            {backupCodes && backupCodes.length > 0 && (
              <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5 space-y-3 dark:border-amber-800 dark:bg-amber-950/30">
                <p className="font-semibold text-amber-950 dark:text-amber-100">
                  احفظ هذه الرموز في مكان آمن، لن تظهر مرة أخرى
                </p>
                <ul className="grid grid-cols-2 gap-2 font-mono text-sm dir-ltr text-left">
                  {backupCodes.map((c) => (
                    <li key={c} className="rounded bg-white/80 px-2 py-1.5 dark:bg-black/20">
                      {c}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => void copyCodes()}>
                    <Copy className="ml-2 h-4 w-4" />
                    نسخ
                  </Button>
                  <Button type="button" variant="outline" onClick={downloadCodes}>
                    <Download className="ml-2 h-4 w-4" />
                    تحميل كملف txt
                  </Button>
                </div>
              </section>
            )}

            {status?.enabled && (
              <>
                <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-3">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <KeyRound className="h-5 w-5" />
                    إعادة توليد الرموز الاحتياطية
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    يتطلب رمز التحقق الحالي. الرموز القديمة ستُلغى فوراً.
                  </p>
                  <input
                    value={regenCode}
                    onChange={(e) =>
                      setRegenCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="رمز 2FA"
                    className={cn(fieldClass, "max-w-xs text-center tracking-widest")}
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || regenCode.length !== 6}
                    onClick={() => void regenerateBackup()}
                  >
                    إعادة توليد الرموز الاحتياطية
                  </Button>
                </section>

                {!status.require2fa && (
                  <section className="rounded-xl border border-destructive/30 bg-card p-4 sm:p-5 space-y-3">
                    <h2 className="font-semibold text-destructive">تعطيل التحقق الثنائي</h2>
                    <input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="كلمة المرور"
                      className={fieldClass}
                      autoComplete="current-password"
                    />
                    <input
                      value={disableCode}
                      onChange={(e) =>
                        setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="رمز 2FA الحالي"
                      className={cn(fieldClass, "text-center tracking-widest")}
                      dir="ltr"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={busy || !disablePassword || disableCode.length !== 6}
                      onClick={() => void disable2fa()}
                    >
                      تعطيل التحقق الثنائي
                    </Button>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
