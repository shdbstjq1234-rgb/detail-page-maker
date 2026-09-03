import { NextResponse } from "next/server";
import { activeProviderName } from "@/image-providers";

export const runtime = "nodejs";

/** 현재 활성 이미지 생성기 (키는 절대 노출하지 않음) */
export async function GET() {
  const provider = activeProviderName();
  const label = { nanobanana: "Nano Banana (Gemini)", higgsfield: "Higgsfield", mock: "미리보기(mock)" }[provider];
  return NextResponse.json({
    ok: true,
    provider,
    label,
    ready: provider !== "mock",
    model: provider === "nanobanana" ? process.env.NANOBANANA_MODEL || "gemini-2.5-flash-image" : undefined,
  });
}
