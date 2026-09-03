import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, getServerSupabase } from "@/lib/supabase/server";
import { dbDeleteProject, dbGetProject, dbUpdateProject } from "@/lib/projects-server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const sb = await getServerSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "local-mode" }, { status: 400 });
  try {
    const project = await dbGetProject(sb, id);
    if (!project) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, project });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const sb = await getServerSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "local-mode" }, { status: 400 });
  try {
    const body = await req.json();
    const project = await dbUpdateProject(sb, id, {
      name: body.name,
      doc: body.doc,
      coverImage: body.coverImage ?? null,
    });
    return NextResponse.json({ ok: true, project });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const sb = await getServerSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "local-mode" }, { status: 400 });
  try {
    await dbDeleteProject(sb, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 500 });
  }
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
