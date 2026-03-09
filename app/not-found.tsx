import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-6xl font-bold">404</h1>
          <h2 className="mb-4 text-2xl font-semibold">الصفحة غير موجودة</h2>
          <p className="mb-8 text-muted-foreground">
            عذراً، الصفحة التي تبحث عنها غير موجودة.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-brand-green-dark text-white hover:bg-brand-green-darker h-11 px-5 py-2.5"
          >
            العودة للرئيسية
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

