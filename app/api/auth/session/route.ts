import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { withNoStore } from "@/lib/security-headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, withNoStore({ status: 401 }));
    }
    return NextResponse.json(
      { authenticated: true, email: session.email },
      withNoStore({ status: 200 })
    );
  } catch {
    return NextResponse.json({ authenticated: false }, withNoStore({ status: 401 }));
  }
}
