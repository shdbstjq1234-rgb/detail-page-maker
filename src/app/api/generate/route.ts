import { NextRequest } from "next/server";
import { runPipeline } from "@/ai/pipeline";
import { MockImageProvider } from "@/image-providers/mock";
import type { PipelineEvent, ProductInput } from "@/types/detail-page";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 초기 상세페이지 생성은 mock(플레이스홀더) 이미지로 가볍고 빠르게 만든다.
 *  - 실제 이미지는 편집기의 "누끼컷으로 전체 이미지 제작"(Nano Banana)에서 생성해 Storage 에 저장한다.
 *  - data URL 이미지를 doc 에 넣으면 저장 용량(4.5MB 제한) 초과로 저장이 실패한다.
 *  - 초기 생성에도 실제 이미지 생성기를 쓰려면 GENERATE_USE_REAL_IMAGES=1
 */
function pipelineImageOpts() {
  if (process.env.GENERATE_USE_REAL_IMAGES === "1") return {};
  return { imageProviderOverride: new MockImageProvider() };
}

function normalizeInput(body: unknown): ProductInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || !b.name.trim()) return null;
  return {
    name: b.name.trim(),
    category: str(b.category),
    price: typeof b.price === "number" ? b.price : undefined,
    description: str(b.description),
    specs: strArr(b.specs),
    sellingPoints: strArr(b.sellingPoints),
    brandTone: str(b.brandTone),
    referenceUrls: strArr(b.referenceUrls),
    images: Array.isArray(b.images)
      ? (b.images as unknown[])
          .map((x) => (typeof x === "string" ? { url: x } : (x as Record<string, unknown>)))
          .filter((x) => x && typeof (x as { url?: unknown }).url === "string")
          .map((x) => ({ url: String((x as { url: string }).url), kind: str((x as { kind?: unknown }).kind) as never }))
      : undefined,
  };
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const strArr = (v: unknown) =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : undefined;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "JSON 본문을 파싱할 수 없습니다" }, 400);
  }

  const input = normalizeInput(body);
  if (!input) return json({ ok: false, error: "name(상품명)은 필수입니다" }, 400);

  const wantStream =
    req.nextUrl.searchParams.get("stream") === "1" ||
    req.headers.get("accept")?.includes("text/event-stream");

  if (wantStream) return streamResponse(input);

  const events: PipelineEvent[] = [];
  try {
    const page = await runPipeline(input, { onEvent: (e) => events.push(e), ...pipelineImageOpts() });
    return json({ ok: true, page, events });
  } catch (err) {
    return json({ ok: false, error: msg(err), events }, 500);
  }
}

function streamResponse(input: ProductInput) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        const page = await runPipeline(input, {
          onEvent: (e) => send({ type: "event", event: e }),
          ...pipelineImageOpts(),
        });
        send({ type: "done", page });
      } catch (err) {
        send({ type: "error", error: msg(err) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
function msg(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
