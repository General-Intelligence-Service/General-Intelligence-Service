"use client";

import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ARCHIVE_CATEGORIES, getArchiveImageSrc } from "@/lib/archive-data";

export default function ArchivePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-2 text-3xl font-bold text-primary">أرشيف الصور</h1>
          <p className="mb-8 text-muted-foreground">
            معرض صور الهدايا والمنتجات حسب التصنيف.
          </p>

          <div className="space-y-12">
            {ARCHIVE_CATEGORIES.map((cat) => (
              <section key={cat.name}>
                <h2 className="mb-4 text-xl font-semibold border-b border-primary/30 pb-2">
                  {cat.name}
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {cat.images.map((filename) => (
                    <div
                      key={filename}
                      className="relative aspect-square overflow-hidden rounded-lg border bg-muted shadow-sm"
                    >
                      <Image
                        src={getArchiveImageSrc(cat.name, filename)}
                        alt={`${cat.name} - ${filename}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
