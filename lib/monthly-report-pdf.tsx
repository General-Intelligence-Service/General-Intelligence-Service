import { pdf } from "@react-pdf/renderer";
import { MonthlyReportPDF } from "@/components/pdf/monthly-report-pdf";
import type { OrderRecord } from "@/types/order";

export async function generateMonthlyReportBlob(
  orders: OrderRecord[],
  monthLabel: string
): Promise<Blob> {
  const doc = <MonthlyReportPDF orders={orders} monthLabel={monthLabel} />;
  return pdf(doc).toBlob();
}
