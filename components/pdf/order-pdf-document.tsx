"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { Product } from "@/data/products";

// تسجيل خط Tajawal بجميع الأوزان (من public/fonts/tajawal)
const fontBase =
  typeof window !== "undefined"
    ? `${window.location.origin}/fonts/tajawal`
    : "/fonts/tajawal";

Font.register({
  family: "Tajawal",
  fonts: [
    { src: `${fontBase}/ArbFONTS-Tajawal-ExtraLight.ttf`, fontWeight: 200 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Light.ttf`, fontWeight: 300 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Regular.ttf`, fontWeight: 400 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Medium.ttf`, fontWeight: 500 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Bold.ttf`, fontWeight: 700 },
    { src: `${fontBase}/ArbFONTS-Tajawal-ExtraBold.ttf`, fontWeight: 800 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Black.ttf`, fontWeight: 900 },
  ],
});

export interface OrderPDFItem {
  product: Product;
  quantity: number;
}

interface OrderPDFDocumentProps {
  orderItems: OrderPDFItem[];
  config: { name: string };
  notes?: string;
  dateStr: string;
  /** رابط الشعار (كامل للتأكد من التحميل في PDF) */
  logoUrl?: string;
  /** اسم الجهة الطالبة للهدية */
  requesterName?: string;
}

const COLORS = {
  primary: "#0b443a",
  primaryLight: "#0d5549",
  gold: "#baa97c",
  goldLight: "#d4c5a8",
  white: "#ffffff",
  gray50: "#f8faf9",
  gray100: "#f1f5f5",
  summaryBg: "#E0E7E2", // لون شريط الإجمالي كما في التصميم
  gray200: "#e2e8e8",
  gray600: "#555",
  gray700: "#333",
  gray800: "#2c2c2c",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.white,
    fontFamily: "Tajawal",
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
    direction: "rtl",
  },
  header: {
    backgroundColor: COLORS.primary,
    marginHorizontal: -32,
    marginTop: -28,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 32,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    width: 76,
    height: 76,
    objectFit: "contain",
  },
  headerText: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: COLORS.white,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: 800,
    color: COLORS.goldLight,
    textAlign: "center",
    marginTop: 4,
  },
  headerLine: {
    height: 1.5,
    backgroundColor: COLORS.gold,
    marginTop: 14,
    opacity: 0.9,
  },
  meta: {
    marginTop: 18,
    marginBottom: 14,
  },
  dateText: {
    fontSize: 10,
    fontWeight: 800,
    color: COLORS.primary,
    textAlign: "right",
    marginBottom: 10,
  },
  dateValue: {
    fontWeight: 900,
    color: COLORS.primary,
  },
  requesterText: {
    fontSize: 10,
    fontWeight: 800,
    color: COLORS.primary,
    textAlign: "right",
    marginBottom: 10,
  },
  requesterValue: {
    fontWeight: 900,
    color: COLORS.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: 900,
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 10,
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: "#d9e2df",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 8,
  },
  table: {
    width: "100%",
  },
  tableHeaderRow: {
    flexDirection: "row-reverse",
    backgroundColor: "#0f5a4d",
  },
  tableHeaderCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 9.5,
    fontWeight: 900,
    color: COLORS.white,
    textAlign: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#1d6b5d",
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderTopWidth: 1,
    borderTopColor: "#e5ece9",
    minHeight: 42,
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#f8fbfa",
  },
  tableCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 9.5,
    fontWeight: 700,
    color: "#374151",
    textAlign: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#edf2f0",
  },
  tableCellName: {
    fontWeight: 800,
    textAlign: "right",
    color: "#111827",
  },
  tableCellSku: {
    fontWeight: 800,
    color: COLORS.primary,
  },
  tableCellQty: {
    fontWeight: 800,
    color: COLORS.primary,
  },
  notesBox: {
    marginTop: 14,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRightWidth: 4,
    borderRightColor: COLORS.primary,
    borderRadius: 6,
    padding: 12,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 800,
    color: COLORS.primary,
    marginBottom: 6,
    textAlign: "right",
  },
  notesContent: {
    fontSize: 9.5,
    fontWeight: 700,
    color: "#374151",
    textAlign: "right",
    lineHeight: 1.6,
  },
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5ece9",
  },
  footerText: {
    fontSize: 8.5,
    fontWeight: 800,
    color: "#8b9098",
    textAlign: "center",
  },
});

function giftTierLabel(tier: string): string {
  return tier === "luxury" ? "فاخرة" : tier === "premium" ? "مميزة" : "قياسية";
}

export function OrderPDFDocument({
  orderItems,
  config,
  notes,
  dateStr,
  logoUrl,
  requesterName,
}: OrderPDFDocumentProps) {
  const hasNotes = Boolean(notes && notes.trim());
  const hasRequester = Boolean(requesterName && requesterName.trim());
  const logoSource = logoUrl || (typeof window !== "undefined" ? `${window.location.origin}/LOGO_PDF.png` : "/LOGO_PDF.png");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* الهيدر */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
            <Image src={logoSource} style={styles.logo} />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>فرع الإعلام</Text>
              <Text style={styles.headerSubtitle}>قسم الهدايا الرسمية</Text>
            </View>
          </View>
          <View style={styles.headerLine} />
        </View>

        {/* التاريخ والجهة الطالبة والعنوان */}
        <View style={styles.meta}>
          <Text style={styles.dateText}>
            تاريخ الطلبية: <Text style={styles.dateValue}>{dateStr}</Text>
          </Text>
          {hasRequester && (
            <Text style={styles.requesterText}>
              الجهة الطالبة للهدية: <Text style={styles.requesterValue}>{requesterName?.trim()}</Text>
            </Text>
          )}
          <Text style={styles.title}>طلبية الهدايا</Text>
        </View>

        {/* الجدول — نسب ثابتة للأعمدة */}
        <View style={styles.tableWrapper}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: "8%" }]}>#</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>الكمية</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>التصنيف</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>الكود</Text>
              <Text style={[styles.tableHeaderCell, { width: "40%", textAlign: "right" }]}>
                اسم الهدية
              </Text>
            </View>
            {orderItems.map((item, index) => (
              <View
                key={item.product.slug}
                style={index % 2 === 1 ? [styles.tableRow, styles.tableRowEven] : styles.tableRow}
              >
                <Text style={[styles.tableCell, { width: "8%" }]}>{index + 1}</Text>
                <Text style={[styles.tableCell, styles.tableCellQty, { width: "12%" }]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {giftTierLabel(item.product.giftTier || "standard")}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellSku, { width: "20%" }]}>
                  {item.product.sku}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellName, { width: "40%" }]}>
                  {item.product.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* الملاحظات */}
        {hasNotes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>ملاحظات:</Text>
            <Text style={styles.notesContent}>{notes!.trim()}</Text>
          </View>
        )}

        {/* الفوتر */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            تم إنشاء هذه الطلبية من {config.name}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
