import { pdf } from "@react-pdf/renderer";
import {
  CatalogPDFDocument,
  type CatalogPdfOptions,
} from "@/components/pdf/catalog-pdf-document";
import { siteConfig } from "@/lib/config";
import { getSiteOriginForShare } from "@/lib/site-url";
import type { Product } from "@/data/products";

export type CatalogPdfGenerateOpts = {
  title?: string;
  subtitle?: string;
  pdfOptions?: CatalogPdfOptions;
};

export async function generateCatalogPDFBlob(
  products: Product[],
  config: typeof siteConfig,
  opts?: CatalogPdfGenerateOpts
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

  let mergedPdfOptions: CatalogPdfOptions | undefined = opts?.pdfOptions;
  if (mergedPdfOptions?.showQr && !mergedPdfOptions.baseUrl) {
    mergedPdfOptions = {
      ...mergedPdfOptions,
      baseUrl: getSiteOriginForShare(),
    };
  }

  const doc = (
    <CatalogPDFDocument
      products={products}
      title={opts?.title || "كتالوج الهدايا"}
      subtitle={opts?.subtitle || config.name}
      dateStr={dateStr}
      logoUrl={logoUrl}
      options={mergedPdfOptions}
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

/** كتالوج PDF للهدايا ذات التصنيف «فاخرة» فقط — يتضمن الكمية ورموز QR لصفحات الموقع */
export async function downloadLuxuryCatalogPDF(
  products: Product[],
  config: typeof siteConfig,
  filename?: string
): Promise<void> {
  const luxury = products.filter((p) => p.giftTier === "luxury");
  const origin = getSiteOriginForShare();
  const blob = await generateCatalogPDFBlob(luxury, config, {
    title: "كتالوج الهدايا الفاخرة",
    subtitle: "الكمية المتوفرة ورموز QR لصفحات الموقع",
    pdfOptions: {
      showQuantity: true,
      showQr: true,
      baseUrl: origin,
      rowsPerPage: 14,
    },
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename ||
    `كتالوج-الهدايا-الفاخرة-${new Date().toISOString().split("T")[0]}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

/** كتالوج PDF لجميع الهدايا الممرَّرة (مثلاً قائمة الداشبورد) — كمية + QR لصفحات الموقع */
export async function downloadFullCatalogWithQuantityAndQr(
  products: Product[],
  config: typeof siteConfig,
  filename?: string
): Promise<void> {
  const origin = getSiteOriginForShare();
  const blob = await generateCatalogPDFBlob(products, config, {
    title: "كتالوج الهدايا",
    subtitle: "الكمية المتوفرة ورموز QR لصفحات الموقع",
    pdfOptions: {
      showQuantity: true,
      showQr: true,
      baseUrl: origin,
      rowsPerPage: 14,
    },
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || `كتالوج-الهدايا-كمية-qr-${new Date().toISOString().split("T")[0]}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
