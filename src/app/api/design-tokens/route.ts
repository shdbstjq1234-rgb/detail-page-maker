import { NextRequest, NextResponse } from "next/server";
import { getLlmClient } from "@/ai/llm/client";
import { extractJson } from "@/lib/json";
import { deriveTokens, type DesignTokens } from "@/lib/design-tokens";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 상품별 Color Design Token 생성. (spec #11)
 * body: { product: { name, category, brandTone } }
 * → { ok, tokens: DesignTokens, source }
 * 항상 휴리스틱 팔레트를 만든 뒤, 키가 있으면 Claude 로 보정.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const product = (body.product ?? {}) as { name?: string; category?: string; brandTone?: string };
  const base = deriveTokens(product);

  const llm = await getLlmClient();
  if (llm.name === "mock") {
    return NextResponse.json({ ok: true, tokens: base, source: "heuristic" });
  }

  try {
    const raw = await llm.complete({
      system:
        "너는 이커머스 상세페이지 아트디렉터다. 상품에 어울리는 색상 시스템을 만든다. " +
        "모든 색은 CSS 색상 문자열(hex 또는 hsl())이어야 한다. 배경은 아주 밝게, 텍스트는 충분히 어둡게. JSON 으로만 답한다.",
      messages: [
        {
          role: "user",
          content:
            `상품: ${product.name ?? "-"} / 카테고리: ${product.category ?? "-"} / 톤: ${product.brandTone ?? "-"}\n` +
            `참고(휴리스틱): ${JSON.stringify(base)}\n\n` +
            `[출력 JSON]\n{ "primary": string, "accent": string, "bg": string, "bgAlt": string, "surface": string,\n` +
            `  "text": string, "textMuted": string, "border": string, "dark": string,\n` +
            `  "mood": string /* 이미지 생성용 색·무드 영문 서술 */ }`,
        },
      ],
      expectJson: true,
      maxTokens: 600,
      label: "design-tokens",
    });
    const parsed = extractJson<Partial<DesignTokens>>(raw);
    const tokens: DesignTokens = {
      primary: str(parsed.primary) ?? base.primary,
      accent: str(parsed.accent) ?? base.accent,
      bg: str(parsed.bg) ?? base.bg,
      bgAlt: str(parsed.bgAlt) ?? base.bgAlt,
      surface: str(parsed.surface) ?? base.surface,
      text: str(parsed.text) ?? base.text,
      textMuted: str(parsed.textMuted) ?? base.textMuted,
      border: str(parsed.border) ?? base.border,
      dark: str(parsed.dark) ?? base.dark,
      mood: str(parsed.mood) ?? base.mood,
    };
    return NextResponse.json({ ok: true, tokens, source: "llm" });
  } catch (e) {
    return NextResponse.json({ ok: true, tokens: base, source: "heuristic", warn: e instanceof Error ? e.message : String(e) });
  }
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
