import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, getServerSupabase } from "@/lib/supabase/server";
import { libDelete, libUpdate, specFor, type LibraryKind } from "@/lib/library-server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ kind: string; id: string }> };

async function guard(kind: string) {
  if (!specFor(kind)) return { err: NextResponse.json({ ok: false, error: "알 수 없는 라이브러리입니다." }, { status: 404 }) };
  const user = await getAuthedUser();
  if (!user) return { err: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  const sb = await getServerSupabase();
  if (!sb || user.local) return { err: NextResponse.json({ ok: false, error: "local-mode" }, { status: 400 }) };
  return { sb };
}

/** PUT /api/library/:kind/:id */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { kind, id } = await ctx.params;
  const g = await guard(kind);
  if (g.err) return g.err;
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ ok: true, item: await libUpdate(g.sb!, kind as LibraryKind, id, body) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 500 });
  }
}

/** DELETE /api/library/:kind/:id */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { kind, id } = await ctx.params;
  const g = await guard(kind);
  if (g.err) return g.err;
  try {
    await libDelete(g.sb!, kind as LibraryKind, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 500 });
  }
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
