import { pdf } from "@react-pdf/renderer";
import { OrderPDFDocument } from "@/components/pdf/order-pdf-document";
import { siteConfig } from "@/lib/config";
import type { Product } from "@/data/products";

export interface OrderItem {
  product: Product;
  quantity: number;
}

export async function generatePDF(
  orderItems: OrderItem[],
  config: typeof siteConfig,
  notes?: string,
  requesterName?: string
): Promise<void> {
  try {
    const dateStr = new Date().toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const logoUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/LOGO_PDF.png`
        : undefined;

    const doc = (
      <OrderPDFDocument
        orderItems={orderItems}
        config={config}
        notes={notes}
        dateStr={dateStr}
        logoUrl={logoUrl}
        requesterName={requesterName?.trim() || undefined}
      />
    );

    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `طلبية-هدايا-${new Date().toISOString().split("T")[0]}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("حدث خطأ أثناء إنشاء ملف PDF");
  }
}
