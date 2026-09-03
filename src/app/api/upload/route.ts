import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, getServerSupabase } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 이미지 업로드.
 * body: { projectId, kind: "original" | "generated", filename, dataUrl }
 * - 클라우드 모드: Supabase Storage 에 저장 → 공개 URL 반환
 *     경로: projects/<uid>/<projectId>/<kind>/<ts>-<name>
 * - 로컬 모드: dataUrl 을 그대로 반환 (브라우저에 그대로 보관)
 */
export async function POST(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const dataUrl = String(body.dataUrl ?? "");
  const m = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/i.exec(dataUrl);
  if (!m) return NextResponse.json({ ok: false, error: "지원하지 않는 이미지 형식입니다. (JPG/PNG/WEBP)" }, { status: 400 });

  const sb = await getServerSupabase();
  if (!sb || user.local) {
    // 로컬 모드: 저장소 없이 그대로 사용
    return NextResponse.json({ ok: true, url: dataUrl, stored: false });
  }

  const ext = m[2].toLowerCase().replace("jpeg", "jpg");
  const kind = body.kind === "generated" ? "generated" : "original";
  const projectId = String(body.projectId ?? "misc").replace(/[^a-zA-Z0-9_-]/g, "");
  const safeName = String(body.filename ?? "image")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .slice(0, 40);
  const path = `projects/${user.id}/${projectId}/${kind}/${Date.now()}-${safeName}.${ext}`;
  const bytes = Buffer.from(m[3], "base64");

  const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType: m[1],
    upsert: false,
  });
  if (error) return NextResponse.json({ ok: false, error: `업로드 실패: ${error.message}` }, { status: 500 });

  const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl, path, stored: true });
}
