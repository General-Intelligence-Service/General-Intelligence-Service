"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <div className="text-center">
        <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          للمسؤولين فقط - لوحة التحكم
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            البريد الإلكتروني المعتمد
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
            className="text-left"
            dir="ltr"
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
              placeholder="اختياري إذا لم تُضبط كلمة مرور"
              className="text-left pr-11"
              dir="ltr"
              autoComplete="current-password"
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
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "جاري الدخول..." : "دخول"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="underline hover:text-foreground">
          العودة للرئيسية
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="w-full max-w-sm rounded-lg border bg-card p-6 text-center text-muted-foreground">جاري التحميل...</div>}>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
