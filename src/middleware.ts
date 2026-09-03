import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  AUTH_SECRET,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  authMode,
  isEmailAllowed,
} from "@/lib/supabase/config";
import { AUTH_COOKIE, computeAuthToken, safeEqual } from "@/lib/auth-cookie";

const PUBLIC_PREFIXES = ["/login", "/auth/", "/api/auth/", "/_next/"];
const isPublicPath = (pathname: string) =>
  pathname === "/favicon.ico" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

/**
 * 인증 게이트.
 *  - local    : 통과
 *  - password : APP_PASSWORD 쿠키 검사
 *  - supabase : Supabase 세션 + ALLOWED_EMAIL
 */
export async function middleware(req: NextRequest) {
  if (authMode === "local") return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  // ── 비밀번호 게이트 모드 ─────────────────────────────
  if (authMode === "password") {
    const token = req.cookies.get(AUTH_COOKIE)?.value ?? "";
    const expected = await computeAuthToken(AUTH_SECRET);
    if (token && safeEqual(token, expected)) return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // ── Supabase Auth 모드 ─────────────────────────────
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ok = user && isEmailAllowed(user.email);
  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
