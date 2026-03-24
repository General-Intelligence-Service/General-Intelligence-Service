"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { products as initialProducts, type Product } from "@/data/products";

function loadProducts(): Product[] {
  if (typeof window === "undefined") return initialProducts;
  try {
    const saved = localStorage.getItem("products");
    if (!saved) return initialProducts;
    const parsed = JSON.parse(saved) as Product[];
    const merged = [...initialProducts];
    parsed.forEach((p) => {
      const i = merged.findIndex((e) => e.slug === p.slug);
      if (i >= 0) merged[i] = p;
      else merged.push(p);
    });
    return merged;
  } catch {
    return initialProducts;
  }
}

export function NavbarSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProducts(loadProducts());
  }, []);

  const q = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!q || q.length < 1) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [products, q]);

  const showDropdown = (focused || open) && suggestions.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/?q=${encodeURIComponent(query.trim())}#products`);
    setQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-[220px] md:max-w-[280px]">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="بحث عن هدية..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          className="w-full rounded-lg border border-input bg-muted/50 py-2 pr-10 pl-3 text-sm text-right placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          dir="rtl"
        />
      </form>
      {showDropdown && (
        <ul className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-lg border bg-background shadow-lg">
          {suggestions.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/products/${encodeURIComponent(p.slug)}`}
                className="block px-3 py-2.5 text-right text-sm hover:bg-muted"
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span className="font-medium">{p.name}</span>
                {p.sku && (
                  <span className="mr-2 text-muted-foreground">— {p.sku}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
