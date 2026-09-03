import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sb = await getServerSupabase();
  if (sb) await sb.auth.signOut();
  return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
}
