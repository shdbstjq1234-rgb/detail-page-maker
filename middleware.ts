import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isCloudMode, isEmailAllowed } from "@/lib/supabase/config";

/**
 * 클라우드 모드에서만 동작: 세션 쿠키 갱신 + 허용 이메일 게이트.
 * 로컬 모드(Supabase 미설정)면 그대로 통과.
 */
export async function middleware(req: NextRequest) {
  if (!isCloudMode) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // 로그인/콜백/정적 리소스는 통과
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

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
