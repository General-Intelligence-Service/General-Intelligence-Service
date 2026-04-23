import { pdf } from "@react-pdf/renderer";
import { MonthlyReportPDF } from "@/components/pdf/monthly-report-pdf";
import { siteConfig } from "@/lib/config";
import type { OrderRecord } from "@/types/order";

export async function generateMonthlyReportBlob(
  orders: OrderRecord[],
  periodLabel: string,
  reportSubtitle?: string
): Promise<Blob> {
  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${siteConfig.pdfLogoPath}?v=${siteConfig.logoAssetVersion}`
      : undefined;
  const doc = (
    <MonthlyReportPDF
      orders={orders}
      monthLabel={periodLabel}
      reportSubtitle={reportSubtitle}
      logoUrl={logoUrl}
    />
  );
  return pdf(doc).toBlob();
}
