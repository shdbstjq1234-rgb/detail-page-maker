import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { authMode } from "@/lib/supabase/config";
import { AUTH_COOKIE } from "@/lib/auth-cookie";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (authMode === "supabase") {
    const sb = await getServerSupabase();
    if (sb) await sb.auth.signOut();
  }
  const res = NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
