import type { LlmClient } from "./llm/client";
import { getLlmClient } from "./llm/client";
import { extractJson } from "@/lib/json";
import type {
  ProductInput,
  ProductAnalysis,
  USPSet,
  PagePlan,
  PlannedSection,
  SectionCopy,
} from "@/types/detail-page";

const SYSTEM = `너는 한국 이커머스 상세페이지 카피라이터다.
규칙:
- 헤드라인은 크고 짧고 즉각 이해되게. 12~20자.
- 긴 문단 금지. 불릿은 한 줄로.
- 한 섹션은 하나의 메시지만.
- 숫자·기능·장점은 크게 강조(stats 활용).
- 과장/허위 표현 금지. 근거 없는 최상급 표현 자제.
- 자연스러운 한국어 구어체. 번역투 금지.`;

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

  const user = `아래 섹션의 카피를 작성해 JSON 으로 답하라.

[상품] ${input.name} / ${analysis.category} / ${input.price ? input.price.toLocaleString() + "원" : "가격미정"}
[브랜드 톤] ${input.brandTone ?? "믿음직하고 깔끔한"}
[최강 USP] ${usp.primary.headline}
[핵심 기능] ${analysis.keyFeatures.join(", ")}
[고객 문제] ${analysis.customerProblems.join(", ")}

[이 섹션]
- type: ${section.type}
- 전달할 단 하나의 메시지: ${section.message}

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

  return {
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
