import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/supabase/config";

export const runtime = "nodejs";

/** OAuth / 매직링크 콜백: code → 세션 교환 후 허용 이메일이면 홈으로 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("from") || "/";
  const sb = await getServerSupabase();

  if (code && sb) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (user && isEmailAllowed(user.email)) {
        return NextResponse.redirect(new URL(next, url.origin));
      }
      await sb.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=not_allowed", url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
