import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, getServerSupabase } from "@/lib/supabase/server";
import { dbCreateProject, dbListProjects } from "@/lib/projects-server";
import { emptyDoc } from "@/lib/editor-doc";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const sb = await getServerSupabase();
  if (!sb) return NextResponse.json({ ok: true, projects: [] }); // 로컬 모드는 클라이언트가 처리
  try {
    return NextResponse.json({ ok: true, projects: await dbListProjects(sb) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const sb = await getServerSupabase();
  if (!sb || user.local) return NextResponse.json({ ok: false, error: "local-mode" }, { status: 400 });
  try {
    const body = await req.json().catch(() => ({}));
    const project = await dbCreateProject(sb, user.id, {
      name: typeof body.name === "string" ? body.name : "새 상세페이지",
      doc: body.doc ?? emptyDoc(),
    });
    return NextResponse.json({ ok: true, project });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 500 });
  }
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
