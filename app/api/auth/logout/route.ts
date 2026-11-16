import { NextResponse } from "next/server";
import { deleteSessionCookie } from "@/lib/auth-session";
import { withNoStore } from "@/lib/security-headers";

export const dynamic = "force-dynamic";

export async function POST() {
  await deleteSessionCookie();
  return NextResponse.json({ success: true, redirect: "/login" }, withNoStore({ status: 200 }));
}
