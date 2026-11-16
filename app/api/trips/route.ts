import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import {
  createTrip,
  isTripsDbConfigured,
  listTrips,
  type TripInput,
  type TripGiftInput,
} from "@/lib/trips-db";

export const dynamic = "force-dynamic";

function parseGifts(raw: unknown): TripGiftInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((g) => {
    const item = g as Record<string, unknown>;
    return {
      giftType: item.giftType === "other" ? "other" : "catalog",
      productSlug: typeof item.productSlug === "string" ? item.productSlug : null,
      customName: typeof item.customName === "string" ? item.customName : null,
      quantity: typeof item.quantity === "number" ? item.quantity : Number(item.quantity ?? 1),
      deliveredTo: typeof item.deliveredTo === "string" ? item.deliveredTo : null,
      notes: typeof item.notes === "string" ? item.notes : null,
    };
  });
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    if (!isTripsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const trips = await listTrips();
    return NextResponse.json({ success: true, trips });
  } catch (e) {
    console.error("GET /api/trips:", e);
    return NextResponse.json({ success: false, error: "فشل في جلب الرحلات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    if (!isTripsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    const input: TripInput = {
      organization: String(body.organization ?? ""),
      recipient: String(body.recipient ?? ""),
      destination: String(body.destination ?? ""),
      tripDate: String(body.tripDate ?? ""),
      returnDate: typeof body.returnDate === "string" ? body.returnDate : null,
      status: "open",
      notes: typeof body.notes === "string" ? body.notes : null,
      gifts: parseGifts(body.gifts),
    };
    const trip = await createTrip(input, session.email);
    return NextResponse.json({ success: true, trip });
  } catch (e) {
    console.error("POST /api/trips:", e);
    const message = e instanceof Error ? e.message : "فشل في إنشاء الرحلة";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
