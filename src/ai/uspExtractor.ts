import type { LlmClient } from "./llm/client";
import { getLlmClient } from "./llm/client";
import { extractJson, clampScore } from "@/lib/json";
import type { ProductInput, ProductAnalysis, USP, USPSet } from "@/types/detail-page";
import { productDepth } from "./productAnalyzer";

const SYSTEM = `너는 한국 이커머스 상세페이지 카피라이터다.
상품 분석 결과에서 "가장 잘 팔리는 한 문장"을 뽑는 것이 목표다.
USP 는 짧고, 즉각적으로 이해되고, 근거가 있어야 한다.
strength 는 이 USP 가 실제 구매전환에 얼마나 기여할지에 대한 0~100 점수다.`;

export async function extractUSP(
  input: ProductInput,
  analysis: ProductAnalysis,
  opts: { llm?: LlmClient } = {},
): Promise<USPSet> {
  const llm = opts.llm ?? (await getLlmClient());

  const depth = productDepth(input, analysis);
  const user = `아래 상품과 분석을 바탕으로 USP 를 뽑아 JSON 으로 답하라.
소구점 개수는 ${depth.usp}개 내외로. 정보가 부족하면 억지로 늘리지 말고 줄여라.

[상품]
${input.name} / ${analysis.category} / ${input.price ? input.price + "원" : "가격미정"}

[분석]
- 핵심 기능: ${analysis.keyFeatures.join(", ")}
- 차별점: ${analysis.differentiators.join(", ")}
- 구매 이유: ${analysis.purchaseReasons.join(", ")}
- 구매 장벽: ${analysis.purchaseBarriers.join(", ")}

[출력 JSON]
{
  "ranked": [
    {
      "headline": string,        // 12자 내외, 헤드라인용
      "rationale": string,       // 왜 이게 강력한가
      "proofPoints": string[],   // 뒷받침 근거(수치/인증/후기 등) 1~4개
      "strength": number         // 0~100
    }
  ]
}
strength 내림차순으로 정렬해서 줄 것.`;

  const text = await llm.complete({
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
    expectJson: true,
    maxTokens: 3000,
    label: `uspExtractor:${input.name}`,
  });

  const raw = extractJson<{ ranked?: Partial<USP>[]; primary?: Partial<USP> }>(text);

  let ranked: USP[] = (raw.ranked ?? []).map((u) => ({
    headline: (u.headline ?? "핵심 장점").trim(),
    rationale: (u.rationale ?? "").trim(),
    proofPoints: (u.proofPoints ?? []).map((p) => String(p).trim()).filter(Boolean),
    strength: clampScore(u.strength, 60),
  }));

  if (ranked.length === 0) {
    ranked = [
      {
        headline: analysis.differentiators[0] ?? analysis.keyFeatures[0] ?? input.name,
        rationale: "분석에서 가장 강한 차별점",
        proofPoints: analysis.keyFeatures.slice(0, 3),
        strength: 70,
      },
    ];
  }

  ranked.sort((a, b) => b.strength - a.strength);

  return { ranked, primary: ranked[0] };
}
