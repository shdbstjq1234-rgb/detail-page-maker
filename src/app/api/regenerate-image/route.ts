import { NextRequest } from "next/server";
import { getImageProvider } from "@/image-providers";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 섹션 이미지 1개(또는 N개 후보) 재생성.
 * body: { prompt, negativePrompt?, aspectRatio?, referenceImageUrl?, characterImageUrl?, count? }
 * → { ok, provider, images: {url,width,height,seed?}[] }
 *
 * IMAGE_PROVIDER + 키가 있으면 실제(Higgsfield/Nano Banana), 없으면 mock placeholder.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "JSON 본문 파싱 실패" }, 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return json({ ok: false, error: "prompt 는 필수입니다" }, 400);

  const ratio = (["1:1", "4:5", "3:4", "16:9", "9:16"] as const).includes(body.aspectRatio as never)
    ? (body.aspectRatio as "1:1" | "4:5" | "3:4" | "16:9" | "9:16")
    : "1:1"; // 기본 1:1 (1000×1000)
  const count = Math.min(6, Math.max(1, Number(body.count) || 3));
  const referenceImageUrl =
    typeof body.referenceImageUrl === "string" && body.referenceImageUrl ? body.referenceImageUrl : undefined;
  const characterImageUrl =
    typeof body.characterImageUrl === "string" && body.characterImageUrl ? body.characterImageUrl : undefined;

  try {
    const provider = await getImageProvider();
    const results = await provider.generate({
      prompt,
      negativePrompt: typeof body.negativePrompt === "string" ? body.negativePrompt : undefined,
      aspectRatio: ratio,
      referenceImageUrl,
      characterImageUrl,
      count,
      seed: Math.floor(Math.random() * 100000),
    });
    return json({
      ok: true,
      provider: provider.name,
      images: results.filter((r) => r.url).map((r) => ({ url: r.url, width: r.width, height: r.height, seed: r.seed })),
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
