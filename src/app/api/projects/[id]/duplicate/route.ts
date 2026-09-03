import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, getServerSupabase } from "@/lib/supabase/server";
import { dbCreateProject, dbGetProject } from "@/lib/projects-server";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const sb = await getServerSupabase();
  if (!sb || user.local) return NextResponse.json({ ok: false, error: "local-mode" }, { status: 400 });
  try {
    const src = await dbGetProject(sb, id);
    if (!src) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    const project = await dbCreateProject(sb, user.id, {
      name: `${src.name} 복사본`,
      doc: src.doc,
      coverImage: src.coverImage,
    });
    return NextResponse.json({ ok: true, project });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
