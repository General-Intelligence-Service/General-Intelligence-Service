"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/lib/config";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const logoSrc = `${siteConfig.logoDarkPath || siteConfig.logoPath}?v=${siteConfig.logoAssetVersion}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, next: nextUrl || undefined }),
        credentials: "include",
      });
      const data = await res.json();

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

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-4">
        <Image
          src={logoSrc}
          alt={siteConfig.logoAlt}
          width={480}
          height={130}
          className="mx-auto h-auto w-full max-w-[220px] object-contain"
          priority
        />
        <h1 className="text-2xl font-bold text-brand-green-dark dark:text-brand-gold-light">
          تسجيل الدخول
        </h1>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"
      >
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            البريد الإلكتروني
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
            className="text-left min-h-[44px]"
            dir="ltr"
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            كلمة المرور
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-left pr-11 min-h-[44px]"
              dir="ltr"
              autoComplete="current-password"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          className="w-full min-h-[44px] bg-brand-green-dark hover:bg-brand-green-darker"
          disabled={submitting}
        >
          {submitting ? "جاري الدخول..." : "دخول"}
        </Button>
      </form>
    </div>
  );
}

export default function GisAdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6F4] px-4 py-12 dark:bg-background">
      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 text-center text-muted-foreground">
            جاري التحميل...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
