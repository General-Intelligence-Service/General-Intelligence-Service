import { NextRequest, NextResponse } from "next/server";
import { auditRequestMeta, diffFields, writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-session";
import {
  deleteTrip,
  getTrip,
  isTripsDbConfigured,
  updateTrip,
  type TripGiftInput,
  type TripInput,
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

export async function GET(
  _request: NextRequest,
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
    const trip = await getTrip(params.id);
    if (!trip) {
      return NextResponse.json({ success: false, error: "الرحلة غير موجودة" }, { status: 404 });
    }
    return NextResponse.json({ success: true, trip });
  } catch (e) {
    console.error("GET /api/trips/[id]:", e);
    return NextResponse.json({ success: false, error: "فشل في جلب الرحلة" }, { status: 500 });
  }
}

export async function PUT(
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
    const before = await getTrip(params.id);
    const trip = await updateTrip(params.id, input, session.email);
    const changes = before
      ? diffFields(
          {
            organization: before.organization,
            recipient: before.recipient,
            destination: before.destination,
            tripDate: before.tripDate,
            returnDate: before.returnDate ?? null,
            notes: before.notes ?? null,
          },
          {
            organization: trip.organization,
            recipient: trip.recipient,
            destination: trip.destination,
            tripDate: trip.tripDate,
            returnDate: trip.returnDate ?? null,
            notes: trip.notes ?? null,
          },
          ["organization", "recipient", "destination", "tripDate", "returnDate", "notes"]
        )
      : {};
    await writeAuditLog({
      actorEmail: session.email,
      action: "trip.update",
      targetType: "رحلة",
      targetId: trip.id,
      targetLabel: trip.destination || trip.id,
      changes: Object.keys(changes).length ? changes : null,
      ...auditRequestMeta(request),
      result: "success",
    });
    return NextResponse.json({ success: true, trip });
  } catch (e) {
    console.error("PUT /api/trips/[id]:", e);
    const message = e instanceof Error ? e.message : "فشل في تحديث الرحلة";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
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
    const before = await getTrip(params.id);
    const ok = await deleteTrip(params.id, session.email);
    if (!ok) {
      return NextResponse.json({ success: false, error: "الرحلة غير موجودة" }, { status: 404 });
    }
    await writeAuditLog({
      actorEmail: session.email,
      action: "trip.delete",
      targetType: "رحلة",
      targetId: params.id,
      targetLabel: before?.destination || params.id,
      ...auditRequestMeta(request),
      result: "success",
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/trips/[id]:", e);
    const message = e instanceof Error ? e.message : "فشل في حذف الرحلة";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
