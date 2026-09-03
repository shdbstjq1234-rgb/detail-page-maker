import type { LlmClient } from "./llm/client";
import { getLlmClient } from "./llm/client";
import { extractJson } from "@/lib/json";
import { COPY_SYSTEM, humanizeCopy } from "@/lib/copy-voice";
import { detectPreset } from "@/lib/category-presets";
import type {
  ProductInput,
  ProductAnalysis,
  USPSet,
  PagePlan,
  PlannedSection,
  SectionCopy,
} from "@/types/detail-page";

const SYSTEM = COPY_SYSTEM;

/** 구간별 추가 지시 */
const SECTION_HINT: Partial<Record<string, string>> = {
  hero: "제품 이름·스펙부터 말하지 마라. 이 제품을 찾게 되는 '상황'이나 '고민'을 한 문장으로 건드려라. subheadline 에서 살짝 풀어준다.",
  usp: "가장 강한 이유 2~3개. 각 불릿은 '무엇을 해서 → 뭐가 편해지는지'. stats 는 진짜 근거(스펙/구성) 있을 때만.",
  problem: "겁주지 말고 공감시켜라. '쓰다 보면 가장 먼저 불편해지는 부분' 같은 말투. 불릿 3개 정도.",
  solution: "problem 바로 뒤. '그래서 이렇게 만들었습니다' 흐름. 해결 방식 + 그래서 달라지는 점.",
  feature: "기능명만 나열 금지. 불릿마다 '기능 → 실제 쓰는 장면 → 얻는 변화'.",
  featureDetail: "구매 확신이 필요한 기능 1개를 깊게. body 에 '왜 이 부분을 신경 썼는지'를 사람 말투로.",
  lifestyle: "이 제품이 있는 하루의 장면. 특별한 날 말고 그냥 매일.",
  comparison: "경쟁 제품 깎아내리지 마라. '비슷해 보여도 써보면 차이가 난다' 톤. rows 는 기준 4~6개.",
  howToUse: "'설명서 안 봐도 된다' 톤. steps 3개, 각 description 은 한 문장.",
  productInfo: "감성 빼고 사실만. infoRows 로. bullets 에는 색상·편차·교환/반품 유의사항.",
  cta: "압박 금지. '필요했던 제품이라면 더 미루지 않아도 됩니다' 류. bullets 는 배송/교환/CS 한 줄씩.",
};

export async function generateSectionCopy(
  section: PlannedSection,
  ctx: {
    input: ProductInput;
    analysis: ProductAnalysis;
    usp: USPSet;
    plan: PagePlan;
  },
  opts: { llm?: LlmClient } = {},
): Promise<SectionCopy> {
  const llm = opts.llm ?? (await getLlmClient());
  const { input, analysis, usp } = ctx;
  const preset = detectPreset({ name: input.name, category: input.category ?? analysis.category, description: input.description });

  const user = `아래 섹션의 카피를 작성해 JSON 으로 답하라.

[상품] ${input.name} / ${analysis.category} / ${input.price ? input.price.toLocaleString() + "원" : "가격미정"}
[브랜드 톤] ${input.brandTone ?? "믿음직하고 담백한"}
[한 줄 요약] ${analysis.oneLiner}
[최강 USP] ${usp.primary.headline} — ${usp.primary.rationale}
[핵심 기능] ${analysis.keyFeatures.join(" / ")}
[고객이 겪는 불편] ${analysis.customerProblems.join(" / ")}
[사는 이유] ${analysis.purchaseReasons.join(" / ")}
[망설이는 이유] ${analysis.purchaseBarriers.join(" / ")}
[주요 타깃] ${analysis.targetCustomers.map((t) => t.label).join(", ")}

[${preset.label} 카테고리에서 소비자가 실제로 보는 것]
- 소구점: ${preset.sellingPoints.join(" / ")}
- 구매 전 걱정: ${preset.anxieties.join(" / ")}
- 비교 기준: ${preset.comparison.join(", ")}
※ 이 중 이 섹션에 해당하는 것만 골라 쓴다. 근거 없는 수치·인증은 절대 만들지 않는다.

[이 섹션]
- type: ${section.type}
- 전달할 단 하나의 메시지: ${section.message}
- 이 섹션 지침: ${SECTION_HINT[section.type] ?? "이 메시지 하나만, 사람 말투로."}

[출력 JSON — 해당 섹션 type 에 필요한 필드만 채운다]
{
  "headline": string,
  "subheadline": string,            // 선택
  "bullets": string[],              // 선택, 한 줄씩
  "stats": [{ "value": string, "label": string }],   // 선택, usp/feature 등
  "cta": string,                    // cta/hero 섹션
  "comparison": {                   // comparison 섹션만
    "columns": [string, string],
    "rows": [{ "criterion": string, "values": [string|boolean, string|boolean] }]
  },
  "steps": [{ "order": number, "title": string, "description": string }],  // howToUse 섹션만
  "infoRows": [{ "label": string, "value": string }]                        // productInfo 섹션만
}`;

  const text = await llm.complete({
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
    expectJson: true,
    maxTokens: 2500,
    label: `copyGenerator:${section.type}:${section.id}`,
  });

  const raw = extractJson<Partial<SectionCopy>>(text);

  const assembled: SectionCopy = {
    sectionId: section.id,
    type: section.type,
    headline: (raw.headline ?? section.message).trim(),
    subheadline: raw.subheadline?.trim() || undefined,
    bullets: clean(raw.bullets),
    stats: Array.isArray(raw.stats)
      ? raw.stats
          .filter((s) => s && s.value && s.label)
          .map((s) => ({ value: String(s.value), label: String(s.label) }))
      : undefined,
    cta: raw.cta?.trim() || (section.type === "cta" || section.type === "hero" ? "지금 구매하기" : undefined),
    comparison: raw.comparison && Array.isArray(raw.comparison.rows) ? raw.comparison : undefined,
    steps: Array.isArray(raw.steps)
      ? raw.steps
          .filter((s) => s && s.title)
          .map((s, i) => ({ order: s.order ?? i + 1, title: String(s.title), description: String(s.description ?? "") }))
      : undefined,
    infoRows: Array.isArray(raw.infoRows)
      ? raw.infoRows.filter((r) => r && r.label).map((r) => ({ label: String(r.label), value: String(r.value ?? "") }))
      : undefined,
    body: raw.body?.trim() || undefined,
  };

  // 어떤 소스(Claude/목업)든 마지막에 사람 말투로 후처리
  return humanizeCopy(assembled);
}

/** 모든 섹션 카피를 병렬로 생성 */
export async function generateAllCopy(
  ctx: { input: ProductInput; analysis: ProductAnalysis; usp: USPSet; plan: PagePlan },
  opts: { llm?: LlmClient } = {},
): Promise<SectionCopy[]> {
  const llm = opts.llm ?? (await getLlmClient());
  return Promise.all(ctx.plan.sections.map((s) => generateSectionCopy(s, ctx, { llm })));
}

function clean(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((s) => String(s).trim()).filter(Boolean);
  return out.length ? out : undefined;
}
