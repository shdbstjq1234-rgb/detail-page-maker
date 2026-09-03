import type { LlmClient } from "./llm/client";
import { getLlmClient } from "./llm/client";
import { extractJson } from "@/lib/json";
import type { ProductInput, ProductAnalysis, ReferenceInsight } from "@/types/detail-page";

const SYSTEM = `너는 한국 이커머스(쿠팡/네이버 스마트스토어) 상세페이지 전문 MD이자 퍼포먼스 마케터다.
주어진 상품 정보를 분석해서 "무엇을, 누구에게, 왜 팔 수 있는가"를 구조화한다.
한국 소비자의 실제 구매 행동을 기준으로 판단한다. 과장·거짓 표현은 쓰지 않는다.`;

interface RawAnalysis extends Partial<ProductAnalysis> {}

export async function analyzeProduct(
  input: ProductInput,
  opts: { llm?: LlmClient; referenceInsights?: ReferenceInsight[] } = {},
): Promise<ProductAnalysis> {
  const llm = opts.llm ?? (await getLlmClient());

  const user = `아래 상품을 분석해 JSON 으로 답하라.

[상품 정보]
${JSON.stringify(
  {
    name: input.name,
    category: input.category,
    price: input.price,
    description: input.description,
    specs: input.specs,
    sellingPoints: input.sellingPoints,
    brandTone: input.brandTone,
  },
  null,
  2,
)}

${opts.referenceInsights?.length ? `[레퍼런스 분석 결과]\n${JSON.stringify(opts.referenceInsights, null, 2)}\n` : ""}
[출력 JSON 스키마]
{
  "oneLiner": string,                 // 상품을 한 문장으로
  "category": string,                 // 정규화된 카테고리
  "keyFeatures": string[],            // 핵심 기능/특징 3~6개
  "specs": string[],                  // 소재/성분/스펙
  "targetCustomers": [{ "label": string, "context": string, "priority": "primary"|"secondary" }],
  "customerProblems": string[],       // 고객이 겪는 불편 3~5개
  "purchaseReasons": string[],        // 구매 동기 3~5개
  "purchaseBarriers": string[],       // 구매 망설임 3~5개
  "differentiators": string[],        // 경쟁사 대비 차별점 3~5개
  "pricePositioning": string
}`;

  const text = await llm.complete({
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
    expectJson: true,
    maxTokens: 4000,
    label: `productAnalyzer:${input.name}`,
  });

  const raw = extractJson<RawAnalysis>(text);

  return {
    oneLiner: raw.oneLiner ?? input.name,
    category: raw.category ?? input.category ?? "기타",
    keyFeatures: nonEmpty(raw.keyFeatures, input.sellingPoints ?? input.specs ?? []),
    specs: nonEmpty(raw.specs, input.specs ?? []),
    targetCustomers:
      raw.targetCustomers?.length
        ? raw.targetCustomers.map((t) => ({
            label: t.label ?? "일반 고객",
            context: t.context ?? "",
            priority: t.priority === "secondary" ? "secondary" : "primary",
          }))
        : [{ label: "일반 고객", context: `${input.name} 구매를 고려하는 사람`, priority: "primary" }],
    customerProblems: nonEmpty(raw.customerProblems, ["기존 제품에 불편함이 있었다"]),
    purchaseReasons: nonEmpty(raw.purchaseReasons, ["필요를 충족한다"]),
    purchaseBarriers: nonEmpty(raw.purchaseBarriers, ["실물을 확인할 수 없다"]),
    differentiators: nonEmpty(raw.differentiators, ["차별화된 설계"]),
    pricePositioning: raw.pricePositioning,
    referenceInsights: opts.referenceInsights ?? raw.referenceInsights ?? [],
  };
}

function nonEmpty(v: string[] | undefined, fallback: string[]): string[] {
  const cleaned = (v ?? []).map((s) => String(s).trim()).filter(Boolean);
  return cleaned.length ? cleaned : fallback.filter(Boolean);
}
