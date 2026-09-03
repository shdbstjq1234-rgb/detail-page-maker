import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, getServerSupabase } from "@/lib/supabase/server";
import { libCreate, libList, specFor, type LibraryKind } from "@/lib/library-server";
import { OWNER_USER_ID } from "@/lib/supabase/config";

export const runtime = "nodejs";

/** GET  /api/library/:kind        목록 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!specFor(kind)) return NextResponse.json({ ok: false, error: "알 수 없는 라이브러리입니다." }, { status: 404 });
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const sb = await getServerSupabase();
  if (!sb) return NextResponse.json({ ok: true, items: [] });
  try {
    const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
    return NextResponse.json({ ok: true, items: await libList(sb, kind as LibraryKind, { projectId }) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 500 });
  }
}

/** POST /api/library/:kind        생성 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!specFor(kind)) return NextResponse.json({ ok: false, error: "알 수 없는 라이브러리입니다." }, { status: 404 });
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const sb = await getServerSupabase();
  if (!sb || user.local) return NextResponse.json({ ok: false, error: "local-mode" }, { status: 400 });
  try {
    const body = await req.json().catch(() => ({}));
    const item = await libCreate(sb, kind as LibraryKind, user.id || OWNER_USER_ID, body);
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 500 });
  }
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
