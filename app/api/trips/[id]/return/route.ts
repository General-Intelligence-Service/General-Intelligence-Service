import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import {
  completeTripReturn,
  isTripsDbConfigured,
  type TripReturnGiftInput,
} from "@/lib/trips-db";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    if (!isTripsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items: TripReturnGiftInput[] = rawItems.map((raw) => {
      const item = raw as Record<string, unknown>;
      return {
        giftId: String(item.giftId ?? ""),
        deliveredQty:
          typeof item.deliveredQty === "number" ? item.deliveredQty : Number(item.deliveredQty ?? 0),
        returnedQty:
          typeof item.returnedQty === "number" ? item.returnedQty : Number(item.returnedQty ?? 0),
        deliveredTo: typeof item.deliveredTo === "string" ? item.deliveredTo : null,
      };
    });

    const returnDate = typeof body.returnDate === "string" ? body.returnDate : null;
    const trip = await completeTripReturn(params.id, items, session.email, returnDate);
    return NextResponse.json({ success: true, trip });
  } catch (e) {
    console.error("POST /api/trips/[id]/return:", e);
    const message = e instanceof Error ? e.message : "فشل في تسجيل العودة";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
