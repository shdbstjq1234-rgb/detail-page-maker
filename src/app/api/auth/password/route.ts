import { NextRequest, NextResponse } from "next/server";
import { APP_PASSWORD, AUTH_SECRET, authMode } from "@/lib/supabase/config";
import { AUTH_COOKIE, computeAuthToken, safeEqual } from "@/lib/auth-cookie";

export const runtime = "nodejs";

const YEAR = 60 * 60 * 24 * 365;

/** 비밀번호 로그인 */
export async function POST(req: NextRequest) {
  if (authMode !== "password") {
    return NextResponse.json({ ok: false, error: "비밀번호 로그인 모드가 아닙니다." }, { status: 400 });
  }
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const pw = (body.password ?? "").toString();
  if (!pw || !safeEqual(pw, APP_PASSWORD)) {
    return NextResponse.json({ ok: false, error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  const token = await computeAuthToken(AUTH_SECRET);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  });
  return res;
}

/** 로그아웃 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
