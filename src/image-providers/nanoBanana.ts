import type { ImageProvider, ImageGenRequest, ImageGenResult } from "./types";
import { ratioToSize } from "./types";

/**
 * Nano Banana = Google Gemini 2.5 Flash Image.
 *
 * 필요한 것: Google AI Studio API 키 하나 (https://aistudio.google.com/apikey).
 *   IMAGE_PROVIDER=nanobanana
 *   NANOBANANA_API_KEY=<Google API key>
 *   NANOBANANA_MODEL=gemini-2.5-flash-image   (선택)
 *
 * - 텍스트 프롬프트 + (선택) 레퍼런스 이미지(누끼컷) → 상세페이지용 연출컷
 * - 레퍼런스를 inline_data 로 함께 넣어 "제품 원형 유지" image-to-image 를 수행
 * - Nano Banana 는 호출당 1장 → count 만큼 병렬 호출
 * - 결과는 base64 → data URL 로 반환 (앱 전체에서 그대로 사용 가능)
 */

const DEFAULT_MODEL = "gemini-2.5-flash-image";
const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

// Gemini 2.5 Flash Image 가 지원하는 종횡비
const SUPPORTED_RATIOS = new Set(["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]);

export class NanoBananaProvider implements ImageProvider {
  readonly name = "nanobanana" as const;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey.trim();
    this.model = (process.env.NANOBANANA_MODEL || DEFAULT_MODEL).trim();
    this.baseUrl = (baseUrl || process.env.NANOBANANA_API_URL || DEFAULT_ENDPOINT).replace(/\/$/, "");
  }

  async generate(req: ImageGenRequest): Promise<ImageGenResult[]> {
    const n = Math.max(1, Math.min(4, req.count || 1));
    // 레퍼런스는 한 번만 base64 로 변환해 재사용
    const ref = req.referenceImageUrl ? await toInlineData(req.referenceImageUrl) : null;

    const settled = await Promise.allSettled(
      Array.from({ length: n }, (_, i) => this.one(req, i, ref)),
    );
    const ok = settled
      .filter((s): s is PromiseFulfilledResult<ImageGenResult> => s.status === "fulfilled")
      .map((s) => s.value);

    if (!ok.length) {
      const err = settled.find((s) => s.status === "rejected") as PromiseRejectedResult | undefined;
      throw new Error(
        err ? String((err.reason as Error)?.message ?? err.reason) : "Nano Banana: 이미지를 생성하지 못했습니다",
      );
    }
    return ok;
  }

  private async one(
    req: ImageGenRequest,
    i: number,
    ref: { mime_type: string; data: string } | null,
  ): Promise<ImageGenResult> {
    const { width, height } = ratioToSize(req.aspectRatio);

    const parts: Record<string, unknown>[] = [];
    if (ref) {
      parts.push({ inline_data: ref });
      parts.push({
        text:
          "Use the attached image ONLY as the exact product reference. " +
          "Reproduce the product's shape, proportions, colors, materials, logo and every detail identically. " +
          "Do not redesign, recolor or restyle the product itself.",
      });
    }
    const negative = req.negativePrompt ? `\n\nStrictly avoid: ${req.negativePrompt}.` : "";
    const vary =
      i === 0 ? "" : `\n\n(Alternative take ${i + 1}: vary the camera angle, crop and background slightly.)`;
    parts.push({ text: `${req.prompt}${negative}${vary}` });

    const generationConfig: Record<string, unknown> = {
      responseModalities: ["TEXT", "IMAGE"],
      temperature: 0.9,
    };
    if (SUPPORTED_RATIOS.has(req.aspectRatio)) {
      generationConfig.imageConfig = { aspectRatio: req.aspectRatio };
    }

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      let msg = t.slice(0, 500);
      try {
        msg = JSON.parse(t)?.error?.message ?? msg;
      } catch {
        /* keep raw */
      }
      // imageConfig 미지원 구버전 대비 1회 재시도
      if (res.status === 400 && /imageConfig|aspectRatio|Unknown name/i.test(msg) && generationConfig.imageConfig) {
        delete generationConfig.imageConfig;
        const retry = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig }),
        });
        if (retry.ok) return this.parse(await retry.json(), width, height);
      }
      throw new Error(`Nano Banana ${res.status}: ${msg}`);
    }

    return this.parse(await res.json(), width, height);
  }

  private parse(data: unknown, width: number, height: number): ImageGenResult {
    const d = data as {
      candidates?: { finishReason?: string; content?: { parts?: Record<string, unknown>[] } }[];
      promptFeedback?: { blockReason?: string };
    };
    const cand = d.candidates?.[0];
    const part = cand?.content?.parts?.find((p) => p.inlineData || p.inline_data);
    const inline = (part?.inlineData || part?.inline_data) as { mimeType?: string; mime_type?: string; data?: string } | undefined;

    if (!inline?.data) {
      const reason = cand?.finishReason || d.promptFeedback?.blockReason || "no image in response";
      if (/SAFETY|PROHIBITED|BLOCK/i.test(reason)) {
        throw new Error(`Nano Banana: 안전 필터에 걸렸습니다 (${reason}). 프롬프트를 순화해 주세요.`);
      }
      throw new Error(`Nano Banana: 이미지가 없습니다 (${reason})`);
    }
    const mime = inline.mimeType || inline.mime_type || "image/png";
    return { url: `data:${mime};base64,${inline.data}`, width, height, raw: { finishReason: cand?.finishReason } };
  }
}

/** data URL / http URL → { mime_type, data(base64) } */
async function toInlineData(src: string): Promise<{ mime_type: string; data: string } | null> {
  try {
    const m = /^data:([^;]+);base64,(.+)$/.exec(src);
    if (m) return { mime_type: m[1], data: m[2] };
    if (src.startsWith("data:")) return null;
    const res = await fetch(src);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { mime_type: res.headers.get("content-type") || "image/jpeg", data: buf.toString("base64") };
  } catch {
    return null;
  }
}
