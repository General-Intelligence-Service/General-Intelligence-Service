import { pdf } from "@react-pdf/renderer";
import { CatalogPDFDocument } from "@/components/pdf/catalog-pdf-document";
import { siteConfig } from "@/lib/config";
import type { Product } from "@/data/products";

export async function generateCatalogPDFBlob(
  products: Product[],
  config: typeof siteConfig,
  opts?: { title?: string; subtitle?: string }
): Promise<Blob> {
  const dateStr = new Date().toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${siteConfig.pdfLogoPath}`
      : undefined;

  const doc = (
    <CatalogPDFDocument
      products={products}
      title={opts?.title || "كتالوج الهدايا"}
      subtitle={opts?.subtitle || config.name}
      dateStr={dateStr}
      logoUrl={logoUrl}
    />
  );

  return pdf(doc).toBlob();
}

export async function downloadCatalogPDF(
  products: Product[],
  config: typeof siteConfig,
  filename?: string
): Promise<void> {
  const blob = await generateCatalogPDFBlob(products, config);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || `كتالوج-الهدايا-${new Date().toISOString().split("T")[0]}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

