import type { LlmClient, LlmCompleteOptions } from "./client";
import { extractJson } from "@/lib/json";

/**
 * 결정적 목업 LLM.
 * ANTHROPIC_API_KEY 가 없을 때 자동으로 쓰인다.
 * label 로 파이프라인 단계를 구분해 그럴듯한 JSON 을 만들어 반환한다.
 * → 키 없이도 입력 → 최종 상세페이지까지 전 구간이 동작한다.
 */
export class MockLlmClient implements LlmClient {
  readonly name = "mock";
  readonly model = "mock-llm";

  /** productAnalyzer 호출에서 파싱한 상품 컨텍스트를 기억해 이후 단계에서 재사용 */
  private lastCtx: Ctx | null = null;

  async complete(options: LlmCompleteOptions): Promise<string> {
    const label = options.label ?? "";
    const lastUser = [...options.messages].reverse().find((m) => m.role === "user");
    const parsed = parseContext(lastUser?.content ?? "");
    const ctx = parsed.name !== "이 제품" ? parsed : (this.lastCtx ?? parsed);
    if (parsed.name !== "이 제품") this.lastCtx = parsed;

    if (label.startsWith("productAnalyzer")) return json(analysis(ctx));
    if (label.startsWith("uspExtractor")) return json(uspSet(ctx));
    if (label.startsWith("pagePlanner")) return json(pagePlan(ctx));
    if (label.startsWith("copyGenerator")) return json(copyFor(label, ctx));
    if (label.startsWith("imagePromptGenerator")) return json(imagePrompts(label, ctx));
    if (label.startsWith("imageSelector")) return json(selection(ctx));

    return json({ note: "mock", label });
  }
}

// ---------------------------------------------------------------------------

interface Ctx {
  name: string;
  category: string;
  price?: number;
  features: string[];
  brandTone: string;
  hook: string;
}

function parseContext(raw: string): Ctx {
  // 첫 번째로 등장하는, 괄호 짝이 맞는 JSON 객체(= 상품 정보)를 추출한다.
  // 뒤에 이어지는 스키마 예시 JSON 은 무시된다.
  let obj: Record<string, unknown> = {};
  const MARK = "[상품 정보]";
  const marker = raw.indexOf(MARK);
  const slice = marker !== -1 ? raw.slice(marker + MARK.length) : raw;
  try {
    obj = extractJson<Record<string, unknown>>(slice);
  } catch {
    /* ignore */
  }
  const name = str(obj.name) || "이 제품";
  const category = str(obj.category) || "생활용품";
  const price = typeof obj.price === "number" ? obj.price : undefined;
  const features = arr(obj.specs).concat(arr(obj.sellingPoints)).slice(0, 6);
  const desc = str(obj.description);
  const sp = arr(obj.sellingPoints);
  // 헤드라인 훅: 셀링포인트 > 설명 첫 문장 > 첫 스펙
  const hook =
    (sp[0] && sp[0].trim()) ||
    (desc && desc.split(/[.\n·]/)[0].trim()) ||
    (features[0] && String(features[0]).trim()) ||
    `${name} 하나로 끝`;
  return {
    name,
    category,
    price,
    features: features.length ? features : [`${name}만의 설계`, "간편한 사용", "검증된 품질"],
    brandTone: str(obj.brandTone) || "믿음직하고 깔끔한",
    hook,
  };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
const json = (o: unknown) => JSON.stringify(o, null, 2);

function analysis(c: Ctx) {
  return {
    oneLiner: `${c.name} — 매일 쓰는 ${c.category}, 다시 고민 없이.`,
    category: c.category,
    keyFeatures: c.features,
    specs: c.features,
    targetCustomers: [
      { label: "20~30대 1인 가구", context: `${c.category}를 자주 쓰지만 관리가 번거로운 사람`, priority: "primary" },
      { label: "30~40대 주부", context: "가족이 매일 쓰는 물건은 검증된 걸 사고 싶은 사람", priority: "secondary" },
    ],
    customerProblems: [
      "비슷해 보이는 제품이 너무 많아 뭘 골라야 할지 모르겠다",
      "싼 걸 샀다가 금방 망가진 경험이 있다",
      "사용법이 복잡하거나 관리가 귀찮다",
    ],
    purchaseReasons: [
      "한 번 살 때 제대로 된 걸 사고 싶다",
      "후기와 재구매율이 높다",
      "쓰는 장면이 구체적으로 그려진다",
    ],
    purchaseBarriers: [
      "가격이 평균보다 조금 높다",
      "실물 품질을 직접 확인할 수 없다",
      "정말 내 상황에 맞는지 확신이 안 선다",
    ],
    differentiators: [
      `${c.features[0] ?? "핵심 설계"}로 경쟁 제품과 사용감이 다르다`,
      "실사용 기준으로 만든 디테일",
      "구매 후 케어까지 고려한 구성",
    ],
    pricePositioning: c.price
      ? `${c.price.toLocaleString()}원 — 저가 제품보다 높지만 교체 주기를 고려하면 오히려 합리적`
      : "가성비가 아니라 '제값' 포지션",
    referenceInsights: [],
  };
}

function uspSet(c: Ctx) {
  const ranked = [
    {
      headline: `${c.features[0] ?? "핵심 기능"}, 첫 사용부터 체감`,
      rationale: "가장 강한 차별점을 최상단에서 즉시 보여준다",
      proofPoints: ["실사용 후기 다수", "재구매율 상위", "3초 안에 이해되는 구조"],
      strength: 92,
    },
    {
      headline: "싼 제품과는 다른 마감",
      rationale: "품질 불안이라는 구매 장벽을 정면으로 해소",
      proofPoints: ["소재 스펙 공개", "내구 테스트", "1:1 비교컷"],
      strength: 78,
    },
    {
      headline: "관리가 거의 필요 없다",
      rationale: "번거로움이라는 이탈 요인 제거",
      proofPoints: ["세척 간편", "부품 교체 주기 김"],
      strength: 65,
    },
  ];
  return { ranked, primary: ranked[0] };
}

function pagePlan(c: Ctx) {
  const sections = [
    { id: "s-hero", type: "hero", message: `${c.name}, 한 장으로 이해되는 이유`, reason: "첫 화면에서 제품 정체성과 최강 USP 노출", imageRoles: ["heroMain"] },
    { id: "s-usp", type: "usp", message: "가장 강한 장점 3가지", reason: "스크롤 초반에 핵심 가치 압축 전달", imageRoles: ["productCutout", "infographic"] },
    { id: "s-problem", type: "problem", message: "이런 불편, 겪어봤다면", reason: "공감 → 몰입 유도", imageRoles: ["usageScene"] },
    { id: "s-solution", type: "solution", message: `그래서 ${c.name}은 이렇게 만들었다`, reason: "문제 바로 뒤에 해결 제시", imageRoles: ["featureExplainer"] },
    { id: "s-feature", type: "feature", message: "핵심 기능 한눈에", reason: "기능을 시각적으로 스캔 가능하게", imageRoles: ["featureExplainer", "detailCloseup"] },
    { id: "s-featureDetail", type: "featureDetail", message: "가장 중요한 기능 깊게 보기", reason: "구매 확신이 필요한 기능 1개 심화", imageRoles: ["detailCloseup", "structure"] },
    { id: "s-lifestyle", type: "lifestyle", message: "내 공간에 두면 이런 느낌", reason: "소유 후 장면 상상 유도", imageRoles: ["lifestyle", "usageScene"] },
    { id: "s-comparison", type: "comparison", message: "일반 제품 vs " + c.name, reason: "가격 장벽을 비교로 정당화", imageRoles: ["comparison"] },
    { id: "s-howToUse", type: "howToUse", message: "쓰는 법은 3단계", reason: "사용 난이도 우려 해소", imageRoles: ["usageScene"] },
    { id: "s-productInfo", type: "productInfo", message: "제품 정보 / 구성", reason: "구매 직전 사실 확인", imageRoles: ["productCutout", "sizeReference"] },
    { id: "s-cta", type: "cta", message: "지금이 가장 좋은 선택", reason: "마지막 구매 푸시", imageRoles: ["heroMain"] },
  ];
  return {
    sections,
    strategy: `${c.brandTone} 톤으로, 상단에 최강 USP → 공감 → 해결 → 근거 → 비교 → 안심 순으로 배치해 구매전환에 최적화`,
  };
}

function sectionTypeFromLabel(label: string): string {
  return label.split(":")[1] ?? "feature";
}
function sectionIdFromLabel(label: string): string {
  return label.split(":")[2] ?? "s-feature";
}

function copyFor(label: string, c: Ctx) {
  const type = sectionTypeFromLabel(label);
  const id = sectionIdFromLabel(label);
  const base = { sectionId: id, type };

  const f = c.features;
  const short = (s: string) => String(s).split(/[·,:\-—(]/)[0].trim().slice(0, 14);

  switch (type) {
    case "hero":
      return {
        ...base,
        headline: `${c.hook}`,
        subheadline: `${c.name} · ${c.category}`,
        bullets: f.slice(0, 3).map(short),
        cta: "지금 구매하기",
      };
    case "usp":
      return {
        ...base,
        headline: "숫자로 보는 이유",
        subheadline: `${c.name}을 고르는 이유는 단순합니다.`,
        bullets: f.slice(0, 3).map((x) => `${x}`),
        stats: [
          { value: `${f.length}`, label: "핵심 포인트" },
          { value: "1분", label: "관리 시간" },
          { value: "AS", label: "구매 후 보장" },
        ],
      };
    case "problem":
      return {
        ...base,
        headline: `${c.category}, 이런 게 늘 아쉬웠죠`,
        subheadline: "다들 그냥 참고 쓰던 것들.",
        bullets: [
          "비슷해 보여서 뭘 골라야 할지 몰랐다",
          "싼 걸 샀다가 금방 다시 사야 했다",
          "막상 쓰면 손이 자꾸 간다",
        ],
      };
    case "solution":
      return {
        ...base,
        headline: `그래서 ${c.name}은 다르게 만들었습니다`,
        subheadline: `${c.hook}`,
        bullets: f.slice(0, 4).map((x) => `${x}`),
      };
    case "feature":
      return {
        ...base,
        headline: "이 차이가 매일 느껴집니다",
        subheadline: "한 번 쓰면 전으로 못 돌아가는 이유.",
        bullets: f.map((x) => `${x}`),
      };
    case "featureDetail":
      return {
        ...base,
        headline: short(f[0] ?? "핵심 설계") + ", 왜 중요한가",
        subheadline: "가장 많이 물어보시는 그 부분.",
        body: `${c.name}의 ${short(f[0] ?? "핵심 설계")}는 눈에 잘 안 띄지만 매일 쓸 때 체감이 가장 큰 부분입니다. 실사용 기준으로 잡았습니다.`,
        stats: [
          { value: short(f[1] ?? "정밀"), label: "설계 기준" },
          { value: short(f[2] ?? "내구"), label: "품질 포인트" },
        ],
        bullets: f.slice(0, 3).map((x) => `${x}`),
      };
    case "lifestyle":
      return {
        ...base,
        headline: "당신의 하루에 자연스럽게",
        subheadline: "특별한 날이 아니라, 그냥 매일.",
        bullets: ["아침에도", "저녁에도", "주말에도"].map((t) => `${t} 어울리는 톤`),
      };
    case "comparison":
      return {
        ...base,
        headline: `일반 ${c.category} vs ${c.name}`,
        subheadline: "가격이 조금 더 나가는 이유는 여기 다 있습니다.",
        comparison: {
          columns: [c.name, "일반 제품"],
          rows: [
            { criterion: "마감 품질", values: [true, false] },
            { criterion: "관리 편의성", values: [true, false] },
            { criterion: "교체 주기", values: ["길다", "짧다"] },
            { criterion: "사용 설명", values: ["상세", "부족"] },
            { criterion: "구매 후 대응", values: [true, false] },
          ],
        },
        bullets: ["당장의 가격보다 총비용을 보면 오히려 합리적입니다."],
      };
    case "howToUse":
      return {
        ...base,
        headline: "쓰는 법은 3단계면 끝",
        subheadline: "설명서 안 봐도 됩니다.",
        steps: [
          { order: 1, title: "꺼내기", description: "패키지에서 꺼내 가볍게 닦아주세요." },
          { order: 2, title: "사용", description: "평소 쓰던 방식 그대로 사용합니다." },
          { order: 3, title: "관리", description: "물기만 말려두면 다음에도 그대로." },
        ],
      };
    case "productInfo":
      return {
        ...base,
        headline: "제품 정보",
        subheadline: "구매 전에 한 번만 확인해 주세요.",
        infoRows: [
          { label: "제품명", value: c.name },
          { label: "카테고리", value: c.category },
          { label: "구성", value: "본품 1 + 사용 가이드" },
          { label: "가격", value: c.price ? `${c.price.toLocaleString()}원` : "옵션별 상이" },
          ...f.slice(0, 3).map((x, i) => ({ label: ["소재/스펙", "특징", "옵션"][i] ?? "정보", value: String(x) })),
        ],
        bullets: [
          "모니터 환경에 따라 실제 색상과 차이가 있을 수 있습니다.",
          "제품 특성상 미세한 편차가 있을 수 있습니다.",
          "교환/반품은 수령 후 7일 이내, 사용 흔적이 없는 경우 가능합니다.",
        ],
      };
    case "cta":
      return {
        ...base,
        headline: "오늘 기준으로 고르세요",
        subheadline: "고민하는 사이에도 하루는 지나갑니다.",
        cta: "지금 구매하기",
        bullets: ["빠른 배송", "안심 교환", "국내 CS"],
      };
    default:
      return { ...base, headline: c.name, body: f.join(", ") };
  }
}

function imagePrompts(label: string, c: Ctx) {
  const id = sectionIdFromLabel(label);
  const type = sectionTypeFromLabel(label);
  const roleByType: Record<string, string[]> = {
    hero: ["heroMain"],
    usp: ["productCutout", "infographic"],
    problem: ["usageScene"],
    solution: ["featureExplainer"],
    feature: ["featureExplainer", "detailCloseup"],
    featureDetail: ["detailCloseup", "structure"],
    lifestyle: ["lifestyle"],
    comparison: ["comparison"],
    howToUse: ["usageScene"],
    productInfo: ["productCutout"],
    cta: ["heroMain"],
  };
  const roles = roleByType[type] ?? ["featureExplainer"];
  return {
    sectionId: id,
    prompts: roles.map((role) => ({
      role,
      prompt: `Korean e-commerce detail-page image for "${c.name}", ${role} shot, ${c.brandTone} mood, clean studio lighting, soft shadow, high resolution product photography, minimal background, centered composition`,
      negativePrompt: "text, watermark, logo, cluttered background, low quality, distortion",
      aspectRatio: role === "heroMain" ? "4:5" : "1:1",
      intent: `${type} 섹션에서 ${role} 역할`,
    })),
  };
}

function selection(c: Ctx) {
  return {
    chosenIndex: 0,
    reason: `구도와 조명이 ${c.brandTone} 톤에 가장 부합하고, 상세페이지 스크롤에서 시선을 끄는 대비가 좋음`,
    score: 82,
  };
}
