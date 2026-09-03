import { NextRequest } from "next/server";
import { getLlmClient } from "@/ai/llm/client";
import { extractJson } from "@/lib/json";

export const runtime = "nodejs";
export const maxDuration = 120;

const SECTION_TYPES = [
  "hero", "usp", "problem", "solution", "feature", "featureDetail",
  "lifestyle", "comparison", "detail", "howToUse", "productInfo", "cta",
] as const;
type SectionType = (typeof SECTION_TYPES)[number];

interface Analysis {
  sectionOrder: SectionType[];
  tone: "light" | "gray" | "dark" | "accent";
  notes: string[];
  source: "llm" | "heuristic";
}

const HEURISTIC: Omit<Analysis, "source"> = {
  sectionOrder: ["hero", "usp", "problem", "solution", "feature", "featureDetail", "lifestyle", "comparison", "detail", "howToUse", "productInfo", "cta"],
  tone: "light",
  notes: [
    "ANTHROPIC_API_KEY 가 없어 기본(전환 최적화) 구조를 제안합니다.",
    "가장 강한 USP 를 상단(hero 직후)에 배치했습니다.",
    "한 섹션 = 한 메시지, 모바일 우선 세로 스크롤 구조입니다.",
  ],
};

/**
 * 레퍼런스 상세페이지 스크린샷(또는 URL)을 분석해 섹션 구조/톤을 제안한다.
 * body: { image?: dataURL, url?: string, product?: { name?, category? } }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "JSON 본문 파싱 실패" }, 400);
  }

  const image = typeof body.image === "string" && body.image.startsWith("data:image/") ? body.image : undefined;
  const url = typeof body.url === "string" && body.url.trim() ? body.url.trim() : undefined;
  const product = (body.product ?? {}) as { name?: string; category?: string };

  if (!image && !url) return json({ ok: false, error: "image(스크린샷) 또는 url 이 필요합니다" }, 400);

  const llm = await getLlmClient();
  if (llm.name === "mock") {
    return json({ ok: true, analysis: { ...HEURISTIC, source: "heuristic" as const } });
  }

  try {
    const raw = await llm.complete({
      system:
        "너는 한국 이커머스 상세페이지 구조 분석가다. 주어진 레퍼런스(경쟁사 상세페이지 스크린샷/URL)의 " +
        "세로 스크롤 구성을 위에서 아래로 분석하고, 우리 상품에 적용할 최적의 섹션 순서를 제안한다. JSON 으로만 답한다.",
      messages: [
        {
          role: "user",
          content:
            `우리 상품: ${product.name ?? "(미입력)"} / 카테고리: ${product.category ?? "(미입력)"}\n` +
            (url ? `레퍼런스 URL: ${url}\n` : "") +
            `\n사용 가능한 섹션 타입(이 값만 사용): ${SECTION_TYPES.join(", ")}\n\n` +
            `[출력 JSON]\n{\n` +
            `  "sectionOrder": SectionType[],   // 위→아래 순서, hero 로 시작, cta 로 종료\n` +
            `  "tone": "light" | "gray" | "dark" | "accent",  // 레퍼런스의 전반적 배경 톤\n` +
            `  "notes": string[]                // 레퍼런스에서 배울 점 3~5개 (한국어)\n}`,
        },
      ],
      images: image ? [image] : undefined,
      expectJson: true,
      maxTokens: 1200,
      label: "analyze-reference",
    });

    const parsed = extractJson<Partial<Analysis>>(raw);
    const order = (parsed.sectionOrder ?? []).filter((s): s is SectionType =>
      (SECTION_TYPES as readonly string[]).includes(s),
    );
    return json({
      ok: true,
      analysis: {
        sectionOrder: order.length ? order : HEURISTIC.sectionOrder,
        tone: (["light", "gray", "dark", "accent"] as const).includes(parsed.tone as never) ? parsed.tone! : "light",
        notes: (parsed.notes ?? []).slice(0, 6),
        source: "llm" as const,
      },
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
