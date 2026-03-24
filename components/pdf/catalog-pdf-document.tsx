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
import type { Product } from "@/data/products";

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

const COLORS = {
  primary: "#0b443a",
  gold: "#baa97c",
  white: "#ffffff",
  gray50: "#f8faf9",
  gray200: "#e2e8e8",
  gray700: "#333333",
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
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 32,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { width: 112, height: 40, objectFit: "contain" },
  headerText: { flex: 1, marginHorizontal: 12, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: 800, color: COLORS.white, textAlign: "center" },
  headerSubtitle: { fontSize: 10, fontWeight: 500, color: "#d4c5a8", textAlign: "center", marginTop: 4 },
  meta: { marginTop: 14, marginBottom: 10 },
  metaText: { fontSize: 10, color: COLORS.gray700, textAlign: "right" },
  tableWrapper: {
    borderWidth: 1,
    borderColor: "#d9e2df",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 8,
  },
  tableHeaderRow: { flexDirection: "row-reverse", backgroundColor: "#0f5a4d" },
  th: {
    paddingVertical: 9,
    paddingHorizontal: 8,
    fontSize: 9.5,
    fontWeight: 800,
    color: COLORS.white,
    textAlign: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#1d6b5d",
  },
  tr: {
    flexDirection: "row-reverse",
    borderTopWidth: 1,
    borderTopColor: "#e5ece9",
    minHeight: 38,
    alignItems: "center",
  },
  trEven: { backgroundColor: COLORS.gray50 },
  td: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 9.5,
    color: "#374151",
    textAlign: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#edf2f0",
  },
  tdName: { textAlign: "right", color: "#111827", fontWeight: 700 },
});

export function CatalogPDFDocument({
  products,
  title,
  subtitle,
  dateStr,
  logoUrl,
}: {
  products: Product[];
  title: string;
  subtitle?: string;
  dateStr: string;
  logoUrl?: string;
}) {
  const col = { idx: "7%", sku: "18%", tier: "18%", cat: "17%", name: "40%" };
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop
              <Image src={logoUrl} style={styles.logo} />
            ) : (
              <View style={styles.logo} />
            )}
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>{subtitle || "قائمة الهدايا"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>تاريخ التصدير: {dateStr}</Text>
          <Text style={styles.metaText}>عدد الهدايا: {products.length}</Text>
        </View>

        <View style={styles.tableWrapper}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { width: col.idx }]}>#</Text>
            <Text style={[styles.th, { width: col.sku }]}>الكود</Text>
            <Text style={[styles.th, { width: col.tier }]}>التصنيف</Text>
            <Text style={[styles.th, { width: col.cat }]}>الفئة</Text>
            <Text style={[styles.th, { width: col.name, textAlign: "right" }]}>اسم الهدية</Text>
          </View>

          {products.map((p, i) => (
            <View key={p.slug} style={i % 2 === 1 ? [styles.tr, styles.trEven] : styles.tr}>
              <Text style={[styles.td, { width: col.idx }]}>{i + 1}</Text>
              <Text style={[styles.td, { width: col.sku }]}>{p.sku || "—"}</Text>
              <Text style={[styles.td, { width: col.tier }]}>{p.giftTier || "—"}</Text>
              <Text style={[styles.td, { width: col.cat }]}>{p.category || "—"}</Text>
              <Text style={[styles.td, styles.tdName, { width: col.name }]}>{p.name}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

