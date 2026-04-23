"use client";

import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { OrderRecord } from "@/types/order";

const fontBase =
  typeof window !== "undefined"
    ? `${window.location.origin}/fonts/tajawal`
    : "/fonts/tajawal";

Font.register({
  family: "Tajawal",
  fonts: [
    { src: `${fontBase}/ArbFONTS-Tajawal-Regular.ttf`, fontWeight: 400 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Bold.ttf`, fontWeight: 700 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Black.ttf`, fontWeight: 900 },
  ],
});

const COLORS = {
  primary: "#0b443a",
  gold: "#baa97c",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Tajawal",
    padding: 28,
    direction: "rtl",
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.primary,
    marginHorizontal: -28,
    marginTop: -28,
    padding: 20,
    alignItems: "center",
  },
  headerLogo: {
    width: 260,
    height: 56,
    objectFit: "contain",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: COLORS.white,
    textAlign: "center",
  },
  headerSub: {
    fontSize: 10,
    color: "#d4c5a8",
    textAlign: "center",
    marginTop: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 900,
    color: COLORS.primary,
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f8faf9",
    borderRadius: 6,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 900,
    color: COLORS.primary,
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.white,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row-reverse",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableCell: {
    fontSize: 9,
    color: "#374151",
    textAlign: "center",
  },
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
});

const colWidths = { num: "8%", date: "12%", requester: "20%", gifts: "28%", pieces: "10%", notes: "22%" };

interface MonthlyReportPDFProps {
  orders: OrderRecord[];
  monthLabel: string;
  /** نوع التقرير للعرض في الهيدر (شهري / ربع سنوي / سنوي) */
  reportSubtitle?: string;
  /** رابط الشعار الكامل (من المتصفح) لتحميله في PDF */
  logoUrl?: string;
}

export function MonthlyReportPDF({
  orders,
  monthLabel,
  reportSubtitle = "تقرير الطلبات الشهري",
  logoUrl,
}: MonthlyReportPDFProps) {
  const totalPieces = orders.reduce((s, o) => s + (o.totalPieces ?? 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop
            <Image src={logoUrl} style={styles.headerLogo} />
          ) : null}
          <Text style={styles.headerTitle}>جهاز المخابرات العامة - قسم الهدايا الرسمية</Text>
          <Text style={styles.headerSub}>{reportSubtitle}</Text>
        </View>
        <Text style={styles.title}>{monthLabel}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>عدد الطلبات</Text>
            <Text style={styles.summaryValue}>{orders.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>إجمالي القطع</Text>
            <Text style={styles.summaryValue}>{totalPieces}</Text>
          </View>
        </View>
        <View style={[styles.tableHeader, { flexDirection: "row-reverse" }]}>
          <Text style={[styles.tableHeaderCell, { width: colWidths.num }]}>#</Text>
          <Text style={[styles.tableHeaderCell, { width: colWidths.date }]}>التاريخ</Text>
          <Text style={[styles.tableHeaderCell, { width: colWidths.requester }]}>الجهة الطالبة</Text>
          <Text style={[styles.tableHeaderCell, { width: colWidths.gifts }]}>الهدايا</Text>
          <Text style={[styles.tableHeaderCell, { width: colWidths.pieces }]}>القطع</Text>
          <Text style={[styles.tableHeaderCell, { width: colWidths.notes }]}>ملاحظات</Text>
        </View>
        {orders.map((o, i) => (
          <View key={o.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: colWidths.num }]}>{i + 1}</Text>
            <Text style={[styles.tableCell, { width: colWidths.date }]}>{o.date}</Text>
            <Text style={[styles.tableCell, { width: colWidths.requester }]}>{o.requesterName || "—"}</Text>
            <Text style={[styles.tableCell, { width: colWidths.gifts, textAlign: "right" }]}>
              {o.items?.length ? o.items.map((it) => `${it.name} (${it.quantity})`).join("، ") : "—"}
            </Text>
            <Text style={[styles.tableCell, { width: colWidths.pieces }]}>{o.totalPieces ?? 0}</Text>
            <Text style={[styles.tableCell, { width: colWidths.notes }]}>{o.notes || "—"}</Text>
          </View>
        ))}
        <View style={styles.footer}>
          <Text style={styles.footerText}>تم إنشاء التقرير آلياً من كتالوج الهدايا — {new Date().toLocaleDateString("ar-SA")}</Text>
        </View>
      </Page>
    </Document>
  );
}
