import { NextResponse } from "next/server";
import { authMode } from "@/lib/supabase/config";

export const runtime = "nodejs";

/** 클라이언트(로그인 화면)가 어떤 인증 UI를 그릴지 결정하기 위한 정보 */
export async function GET() {
  return NextResponse.json({ ok: true, mode: authMode });
}
