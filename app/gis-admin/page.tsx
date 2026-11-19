"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { OtpInput } from "@/components/otp-input";

const shieldSrc = `${siteConfig.iconPath}?v=${siteConfig.logoAssetVersion}`;

function BrandPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex overflow-hidden text-white",
        compact
          ? "h-[220px] w-full flex-col items-center justify-center px-4"
          : "h-full min-h-screen w-full flex-col items-center justify-center px-8 py-10"
      )}
      style={{
        background:
          "radial-gradient(ellipse 80% 70% at 50% 40%, #1a5a48 0%, #0a2a21 72%)",
      }}
    >
      {/* نقش هندسي ذهبي خفيف */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]"
        aria-hidden
      >
        <defs>
          <pattern id="gis-geo" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M24 4 L28 20 L44 24 L28 28 L24 44 L20 28 L4 24 L20 20 Z"
              fill="none"
              stroke="#C9A96E"
              strokeWidth="1"
            />
            <path d="M0 24 H48 M24 0 V48" stroke="#C9A96E" strokeWidth="0.5" opacity="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gis-geo)" />
      </svg>

      <motion.div
        className="relative z-[1] flex flex-col items-center text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="relative mb-4 flex items-center justify-center sm:mb-5">
          <div
            className="absolute rounded-full"
            style={{
              width: compact ? 110 : 180,
              height: compact ? 110 : 180,
              background:
                "radial-gradient(circle, rgba(201,169,110,0.15) 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <Image
            src={shieldSrc}
            alt=""
            width={compact ? 72 : 120}
            height={compact ? 72 : 120}
            className={cn(
              "relative object-contain",
              compact ? "h-[72px] w-[72px]" : "h-[120px] w-[120px]"
            )}
            priority
            aria-hidden
          />
        </div>

        <h1
          className={cn(
            "font-bold tracking-tight text-white",
            compact ? "text-lg" : "text-2xl md:text-3xl"
          )}
        >
          جهاز الاستخبارات العامة
        </h1>
        <p
          className={cn(
            "mt-1.5 font-semibold uppercase tracking-[0.18em] text-[#C9A96E]",
            compact ? "text-[9px]" : "text-xs md:text-sm"
          )}
        >
          GENERAL INTELLIGENCE SERVICE
        </p>
        {!compact && (
          <>
            <div className="mx-auto mt-5 h-px w-12 bg-[#C9A96E]/80" aria-hidden />
            <p className="mt-5 text-sm text-white/70">نظام إدارة الهدايا الرسمية</p>
          </>
        )}
      </motion.div>

      {!compact && (
        <p className="absolute bottom-6 z-[1] text-center text-xs text-white/45">
          © {new Date().getFullYear()} جميع الحقوق محفوظة
        </p>
      )}
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // خطوة التحقق الثنائي (بعد نجاح كلمة المرور)
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorNext, setTwoFactorNext] = useState("");
  const [otp, setOtp] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState("");

  const resetToPassword = () => {
    setTwoFactorStep(false);
    setOtp("");
    setBackupCode("");
    setUseBackup(false);
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          next: nextUrl || undefined,
        }),
        credentials: "include",
      });
      const data = await res.json();

      if (data.success && data.twoFactor) {
        setTwoFactorNext(typeof data.next === "string" ? data.next : "/dashboard");
        setTwoFactorStep(true);
        setOtp("");
        return;
      }
      if (data.success) {
        router.push(data.redirect ?? "/dashboard");
        return;
      }
      setError(data.error ?? "فشل تسجيل الدخول");
    } catch {
      setError("حدث خطأ أثناء الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const submitTwoFactor = async (code: string) => {
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          useBackup,
          next: twoFactorNext || undefined,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        router.push(data.redirect ?? "/dashboard");
        return;
      }
      if (data.reset) {
        setError(data.error ?? "انتهت صلاحية التحقق. سجّل الدخول مجدداً.");
        resetToPassword();
        return;
      }
      setError(data.error ?? "رمز التحقق غير صحيح");
      setOtp("");
    } catch {
      setError("حدث خطأ أثناء الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTwoFactorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = useBackup ? backupCode.trim() : otp;
    if (!code) return;
    void submitTwoFactor(code);
  };

  // تسليم تلقائي عند اكتمال 6 أرقام
  const handleOtpChange = (digits: string) => {
    setOtp(digits);
    if (!useBackup && digits.length === 6) {
      void submitTwoFactor(digits);
    }
  };

  const fieldClass =
    "h-12 w-full rounded-[10px] border border-border bg-[var(--input-bg,#F7F8F6)] pl-3 pr-11 text-left text-sm text-foreground outline-none transition focus:border-brand-green-dark focus:ring-2 focus:ring-brand-green-dark/20 dark:border-white/10 dark:bg-[#161d1b] dark:focus:border-brand-gold dark:focus:ring-brand-gold/20";

  if (twoFactorStep) {
    return (
      <motion.div
        className="w-full max-w-[400px]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
      >
        <div className="mb-7 text-center lg:text-right">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green-dark/10 text-brand-green-dark dark:bg-brand-gold/10 dark:text-brand-gold-light lg:mx-0">
            <KeyRound className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="text-2xl font-bold text-brand-green-dark dark:text-brand-gold-light">
            أدخل رمز التحقق
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {useBackup
              ? "أدخل أحد الرموز الاحتياطية الثمانية (يُستخدم مرة واحدة)"
              : "أدخل الرمز المكوّن من 6 أرقام في تطبيق Google Authenticator أو Microsoft Authenticator"}
          </p>
        </div>

        <form onSubmit={handleTwoFactorSubmit} className="space-y-5">
          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}

          {useBackup ? (
            <input
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
              dir="ltr"
              autoComplete="off"
              placeholder="XXXX-XXXX"
              aria-label="رمز احتياطي"
              className={cn(fieldClass, "pr-3 text-center tracking-widest")}
              autoFocus
            />
          ) : (
            <OtpInput value={otp} onChange={handleOtpChange} disabled={submitting} />
          )}

          <button
            type="submit"
            disabled={submitting || (useBackup ? !backupCode.trim() : otp.length !== 6)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-brand-green-dark text-sm font-semibold text-white transition hover:bg-[#145a48] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-brand-gold dark:text-brand-green-darker dark:hover:bg-brand-gold-light"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                جاري التحقق...
              </>
            ) : (
              "تأكيد"
            )}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={resetToPassword}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
              رجوع
            </button>
            <button
              type="button"
              onClick={() => {
                setUseBackup((v) => !v);
                setError("");
                setOtp("");
                setBackupCode("");
              }}
              className="font-medium text-brand-green-dark underline-offset-4 hover:underline dark:text-brand-gold-light"
            >
              {useBackup ? "استخدام رمز التطبيق بدلاً من ذلك" : "استخدام رمز احتياطي بدلاً من ذلك"}
            </button>
          </div>
        </form>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-[400px]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
    >
      <div className="mb-7 text-center lg:text-right">
        <h2 className="text-2xl font-bold text-brand-green-dark dark:text-brand-gold-light">
          تسجيل الدخول
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          أدخل بياناتك للوصول إلى لوحة التحكم
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            البريد الإلكتروني
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              dir="ltr"
              autoComplete="username"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            كلمة المرور
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
              autoComplete="current-password"
              className={cn(fieldClass, "pl-11")}
            />
            <button
              type="button"
              className="absolute left-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-brand-green-dark text-sm font-semibold text-white transition hover:bg-[#145a48] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-brand-gold dark:text-brand-green-darker dark:hover:bg-brand-gold-light"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              جاري الدخول...
            </>
          ) : (
            "دخول"
          )}
        </button>
      </form>
    </motion.div>
  );
}

export default function GisAdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-[#0f1513] lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen flex-col lg:h-full lg:flex-row">
        {/* لوحة الهوية — يمين على الكمبيوتر (RTL)، شريط علوي على الجوال */}
        <div className="lg:w-1/2 lg:shrink-0">
          <div className="lg:hidden">
            <BrandPanel compact />
          </div>
          <div className="hidden h-full lg:block">
            <BrandPanel />
          </div>
        </div>

        {/* النموذج */}
        <div className="relative flex flex-1 items-start justify-center px-4 pb-10 lg:items-center lg:overflow-y-auto lg:px-8 lg:pb-0">
          <div className="-mt-8 w-full max-w-[400px] rounded-2xl border border-black/5 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-[#121a17] sm:p-8 lg:mt-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none dark:lg:bg-transparent">
            <Suspense
              fallback={
                <div className="py-10 text-center text-sm text-muted-foreground">
                  جاري التحميل...
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
