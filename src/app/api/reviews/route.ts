import { NextRequest, NextResponse } from "next/server";
import { getLlmClient } from "@/ai/llm/client";
import { extractJson } from "@/lib/json";

export const runtime = "nodejs";
export const maxDuration = 90;

const ANGLES = ["사용감", "핵심 기능", "품질", "가성비"];

/**
 * AI 리뷰 초안 생성 (spec #13). 반환 리뷰는 모두 source:"demo".
 * 실제 판매 후기처럼 표시하지 않는다. 별점/판매량 등 실제 수치는 만들지 않는다.
 * body: { product: {name,category}, usp?: string, count?: number }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const product = (body.product ?? {}) as { name?: string; category?: string };
  const usp = typeof body.usp === "string" ? body.usp : "";
  const count = Math.min(6, Math.max(2, Number(body.count) || 4));
  const name = product.name?.trim() || "이 제품";

  const llm = await getLlmClient();

  if (llm.name === "mock") {
    return NextResponse.json({ ok: true, reviews: heuristic(name, count), source: "heuristic" });
  }

  try {
    const raw = await llm.complete({
      system:
        "너는 한국 이커머스 리뷰 작성 보조다. UI 확인용 '리뷰 초안'을 만든다. " +
        "실제 후기인 척하지 않는다. 과장된 수치나 없는 인증을 만들지 않는다. " +
        "서로 다른 구매 이유를 보여주는 리뷰를 만든다. JSON 으로만 답한다.",
      messages: [
        {
          role: "user",
          content:
            `상품: ${name} / ${product.category ?? "-"}\n핵심 USP: ${usp || "-"}\n` +
            `${count}개의 리뷰 초안을 만든다. 각 리뷰는 아래 관점 중 서로 다른 것을 다룬다: ${ANGLES.join(", ")}.\n\n` +
            `[출력 JSON]\n{ "reviews": [ { "body": string /* 2~3문장, 자연스러운 구어체 */,\n` +
            `  "tags": string[] /* 배송|품질|사용감|기능|가성비|디자인|재구매 중 1~2개 */,\n` +
            `  "author": string /* 예: "김**", "이용자" */ } ] }`,
        },
      ],
      expectJson: true,
      maxTokens: 1200,
      label: "reviews",
    });
    const parsed = extractJson<{ reviews?: { body?: string; tags?: string[]; author?: string }[] }>(raw);
    const reviews = (parsed.reviews ?? [])
      .filter((r) => r && typeof r.body === "string" && r.body.trim())
      .slice(0, count)
      .map((r, i) => ({
        source: "demo" as const,
        body: r.body!.trim(),
        tags: Array.isArray(r.tags) ? r.tags.map(String).slice(0, 2) : [ANGLES[i % ANGLES.length]],
        author: r.author?.slice(0, 12) || "이용자",
        rating: 5,
      }));
    return NextResponse.json({ ok: true, reviews: reviews.length ? reviews : heuristic(name, count), source: "llm" });
  } catch (e) {
    return NextResponse.json({ ok: true, reviews: heuristic(name, count), source: "heuristic", warn: e instanceof Error ? e.message : String(e) });
  }
}

function heuristic(name: string, count: number) {
  const templates = [
    { body: `${name} 며칠 써봤는데 손에 익으니 훨씬 편해요. 처음 걱정했던 부분이 실제로는 문제 없었습니다.`, tags: ["사용감"], author: "김**" },
    { body: `기대했던 기능이 실제로 잘 동작해서 만족합니다. 설명대로여서 재구매 의사 있어요.`, tags: ["기능", "재구매"], author: "이**" },
    { body: `마감이 생각보다 깔끔합니다. 저렴이 느낌 안 나고 오래 쓸 수 있을 것 같아요.`, tags: ["품질"], author: "박**" },
    { body: `이 가격대에서 이 정도면 가성비 좋다고 봅니다. 주변에도 추천했어요.`, tags: ["가성비"], author: "정**" },
    { body: `디자인이 사진이랑 똑같아요. 색감도 마음에 듭니다.`, tags: ["디자인"], author: "최**" },
    { body: `배송 빠르게 왔고 포장도 꼼꼼했어요. 바로 사용했습니다.`, tags: ["배송"], author: "이용자" },
  ];
  return templates.slice(0, count).map((t) => ({ source: "demo" as const, rating: 5, ...t }));
}
