import type { LlmClient } from "./llm/client";
import { getLlmClient } from "./llm/client";
import { extractJson } from "@/lib/json";
import type {
  ProductInput,
  ProductAnalysis,
  USPSet,
  PagePlan,
  PlannedSection,
  SectionType,
  ImageRole,
} from "@/types/detail-page";
import { productDepth } from "./productAnalyzer";

const SECTION_TYPES: SectionType[] = [
  "hero",
  "usp",
  "problem",
  "solution",
  "feature",
  "featureDetail",
  "lifestyle",
  "comparison",
  "detail",
  "howToUse",
  "productInfo",
  "cta",
];

const IMAGE_ROLES: ImageRole[] = [
  "heroMain",
  "productCutout",
  "usageScene",
  "detailCloseup",
  "featureExplainer",
  "beforeAfter",
  "comparison",
  "lifestyle",
  "infographic",
  "structure",
  "ingredient",
  "sizeReference",
];

const SYSTEM = `너는 한국 이커머스 상세페이지 설계자다.
"어떻게 하면 더 잘 팔리는가"가 유일한 기준이다.
규칙:
- 가장 강한 USP 를 최상단에 배치한다.
- 한 섹션은 하나의 메시지만 전달한다.
- 상품 특성에 맞게 섹션 순서를 유동적으로 정한다. 불필요한 섹션은 뺀다.
- 스크롤만 해도 장점이 이해되도록 순서를 잡는다.
- 모바일 우선.`;

export async function planPage(
  input: ProductInput,
  analysis: ProductAnalysis,
  usp: USPSet,
  opts: { llm?: LlmClient } = {},
): Promise<PagePlan> {
  const llm = opts.llm ?? (await getLlmClient());

  const depth = productDepth(input, analysis);
  const user = `아래 정보로 상세페이지 섹션 구성을 설계해 JSON 으로 답하라.

[상품] ${input.name} / ${analysis.category}
[최강 USP] ${usp.primary.headline} — ${usp.primary.rationale}
[USP 목록] ${usp.ranked.map((u) => u.headline).join(" / ")}
[고객 문제] ${analysis.customerProblems.join(" / ")}
[구매 장벽] ${analysis.purchaseBarriers.join(" / ")}
[핵심 기능] ${analysis.keyFeatures.join(" / ")}

[사용 가능한 sectionType]
${SECTION_TYPES.join(", ")}

[사용 가능한 imageRole]
${IMAGE_ROLES.join(", ")}

[출력 JSON]
{
  "strategy": string,               // 전체 설계 의도 2~3문장
  "sections": [
    {
      "type": sectionType,
      "message": string,            // 이 섹션이 전달할 단 하나의 메시지
      "reason": string,             // 왜 이 위치인가
      "imageRoles": imageRole[]     // 이 섹션에 필요한 이미지 역할 0~3개
    }
  ]
}
섹션은 ${depth.sections}개 내외. 쓸데없이 늘리지 말고, 근거가 없는 섹션은 빼라. 첫 섹션은 반드시 hero, 마지막은 반드시 cta.`;

  const text = await llm.complete({
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
    expectJson: true,
    maxTokens: 4000,
    label: `pagePlanner:${input.name}`,
  });

  const raw = extractJson<{ strategy?: string; sections?: RawSection[] }>(text);

  let sections = normalizeSections(raw.sections ?? []);
  if (sections.length < 3) sections = fallbackSections();
  sections = enforceHeroCta(sections);

  return {
    strategy: raw.strategy?.trim() || "최강 USP → 공감 → 해결 → 근거 → 안심 순으로 배치",
    sections,
  };
}

interface RawSection {
  type?: string;
  message?: string;
  reason?: string;
  imageRoles?: string[];
}

function normalizeSections(raw: RawSection[]): PlannedSection[] {
  const seenType = new Map<string, number>();
  return raw
    .filter((s) => s.type && SECTION_TYPES.includes(s.type as SectionType))
    .map((s, i) => {
      const type = s.type as SectionType;
      const n = (seenType.get(type) ?? 0) + 1;
      seenType.set(type, n);
      return {
        id: `s-${type}${n > 1 ? `-${n}` : ""}`,
        type,
        message: s.message?.trim() || defaultMessage(type),
        reason: s.reason?.trim() || "",
        imageRoles: (s.imageRoles ?? [])
          .filter((r): r is ImageRole => IMAGE_ROLES.includes(r as ImageRole))
          .slice(0, 3),
      } satisfies PlannedSection;
    });
}

function enforceHeroCta(sections: PlannedSection[]): PlannedSection[] {
  let out = [...sections];
  if (out[0]?.type !== "hero") {
    out = out.filter((s) => s.type !== "hero");
    out.unshift({
      id: "s-hero",
      type: "hero",
      message: defaultMessage("hero"),
      reason: "첫 화면에서 제품 정체성 + 최강 USP 노출",
      imageRoles: ["heroMain"],
    });
  }
  if (out[out.length - 1]?.type !== "cta") {
    out = out.filter((s) => s.type !== "cta");
    out.push({
      id: "s-cta",
      type: "cta",
      message: defaultMessage("cta"),
      reason: "마지막 구매 푸시",
      imageRoles: [],
    });
  }
  return out;
}

function defaultMessage(type: SectionType): string {
  const map: Record<SectionType, string> = {
    hero: "제품 정체성과 가장 강한 장점",
    usp: "핵심 장점 3가지",
    problem: "고객이 겪는 불편",
    solution: "그 불편을 어떻게 해결했는가",
    feature: "핵심 기능 한눈에",
    featureDetail: "가장 중요한 기능 심화 설명",
    lifestyle: "사용 장면과 분위기",
    comparison: "일반 제품과의 차이",
    detail: "제품 디테일 클로즈업",
    howToUse: "사용 방법",
    productInfo: "제품 정보와 구성",
    review: "구매 고객 후기",
    cta: "지금 구매해야 하는 이유",
  };
  return map[type];
}

function fallbackSections(): PlannedSection[] {
  return (
    ["hero", "usp", "problem", "solution", "feature", "lifestyle", "comparison", "howToUse", "productInfo", "cta"] as SectionType[]
  ).map((type) => ({
    id: `s-${type}`,
    type,
    message: defaultMessage(type),
    reason: "기본 구조",
    imageRoles: defaultRoles(type),
  }));
}

function defaultRoles(type: SectionType): ImageRole[] {
  const map: Partial<Record<SectionType, ImageRole[]>> = {
    hero: ["heroMain"],
    usp: ["productCutout", "infographic"],
    problem: ["usageScene"],
    solution: ["featureExplainer"],
    feature: ["featureExplainer", "detailCloseup"],
    featureDetail: ["detailCloseup", "structure"],
    lifestyle: ["lifestyle"],
    comparison: ["comparison"],
    detail: ["detailCloseup"],
    howToUse: ["usageScene"],
    productInfo: ["productCutout", "sizeReference"],
    cta: [],
  };
  return map[type] ?? [];
}
