import { NextRequest, NextResponse } from "next/server";
import { getFirestore, getAuth } from "@/lib/firebase-admin";
import type { OrderPayload, OrderRecord } from "@/types/order";

const ORDERS_COLLECTION = "orders";

/** استخراج وتحقيف توكن Firebase من الهيدر */
async function getUserIdFromToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

/** التحقق من أن المستخدم مسؤول (قائمة UIDs من env) */
function isAdmin(uid: string): boolean {
  const admins = process.env.FIREBASE_ADMIN_UIDS ?? "";
  return admins.split(",").map((u) => u.trim()).includes(uid);
}

/** POST: حفظ طلبية جديدة */
export async function POST(request: NextRequest) {
  try {
    const db = getFirestore();
    const body = await request.json();

    const payload: OrderPayload = {
      date: body.date ?? new Date().toISOString().split("T")[0],
      requesterName: body.requesterName ?? "",
      notes: body.notes,
      items: Array.isArray(body.items) ? body.items : [],
      totalPieces: Number(body.totalPieces) || 0,
      createdAt: new Date().toISOString(),
    };

    const userId = await getUserIdFromToken(request);
    if (userId) {
      payload.userId = userId;
      payload.userEmail = body.userEmail;
    }

    const ref = await db.collection(ORDERS_COLLECTION).add(payload);
    return NextResponse.json({
      success: true,
      orderId: ref.id,
      message: "تم حفظ الطلبية",
    });
  } catch (error) {
    console.error("Error saving order:", error);
    return NextResponse.json(
      { success: false, error: "فشل في حفظ الطلبية" },
      { status: 500 }
    );
  }
}

/** GET: قائمة الطلبيات (مسؤول فقط) مع بحث وتصفية */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }
    const decoded = await getAuth().verifyIdToken(token);
    if (!isAdmin(decoded.uid)) {
      return NextResponse.json({ success: false, error: "غير مسموح" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom")?.trim();
    const dateTo = searchParams.get("dateTo")?.trim();
    const requester = searchParams.get("requester")?.trim();

    const db = getFirestore();
    const snapshot = await db
      .collection(ORDERS_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();

    let orders: OrderRecord[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as OrderRecord[];

    if (dateFrom) {
      const from = new Date(dateFrom).toISOString();
      orders = orders.filter((o) => (o.createdAt ?? "") >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59.999Z").toISOString();
      orders = orders.filter((o) => (o.createdAt ?? "") <= to);
    }
    if (requester) {
      const r = requester.toLowerCase();
      orders = orders.filter((o) =>
        (o.requesterName ?? "").toLowerCase().includes(r)
      );
    }

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, error: "فشل في جلب الطلبيات" },
      { status: 500 }
    );
  }
}
