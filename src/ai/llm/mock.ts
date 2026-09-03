import type { LlmClient, LlmCompleteOptions } from "./client";
import { extractJson } from "@/lib/json";
import { josa } from "@/lib/copy-voice";

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
  /** 카피에 노출할 짧은 카테고리 ("스포츠/양말" → "양말") */
  catShort: string;
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
  // 헤드라인 훅: 셀링포인트 > 설명 첫 문장 > 상황형 기본 훅.
  // 스펙 나열(78%, 250mm, 폴리에스터…)은 헤드라인으로 쓰지 않는다 — 제품 설명부터 하지 않는다.
  const cat = category.split("/").pop()!.replace(/\s+/g, "") || "제품";
  const firstSentence = desc ? desc.split(/[.\n·]/)[0].trim() : "";
  const hook =
    pickHook(sp[0]) ||
    pickHook(firstSentence) ||
    `${cat}, 이 부분이 은근히 중요합니다`;
  return {
    name,
    category,
    catShort: cat,
    price,
    features: features.length ? features : ["자주 쓰는 기능에 집중", "받자마자 쉬운 사용", "오래 쓰는 마감"],
    brandTone: str(obj.brandTone) || "믿음직하고 깔끔한",
    hook,
  };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
const json = (o: unknown) => JSON.stringify(o, null, 2);

/** 스펙 나열처럼 보이는 문자열 (헤드라인·소제목으로 쓰면 안 됨) */
function looksLikeSpec(s: string): boolean {
  if (!s) return true;
  const t = s.trim();
  if (t.length < 6 || t.length > 40) return true;
  // 숫자+단위, 퍼센트, 소재 나열, 쉼표 3개 이상
  if (/\d+\s*(%|mm|cm|ml|L|g|kg|호|구|W|V|인치)/i.test(t)) return true;
  if ((t.match(/,/g) || []).length >= 2) return true;
  if (/폴리에스터|스판덱스|나일론|면\s*\d|실리콘\s*\d|ABS|PP|PE|스테인리스/.test(t) && /\d/.test(t)) return true;
  return false;
}
/** 헤드라인으로 쓸 만하면 다듬어서 반환, 아니면 빈 문자열 */
function pickHook(s?: string): string {
  const t = (s || "").trim();
  return looksLikeSpec(t) ? "" : t;
}

function analysis(c: Ctx) {
  return {
    oneLiner: `${c.name} — 매일 쓰는 ${c.catShort}, 다시 고민 없이.`,
    category: c.category,
    keyFeatures: c.features,
    specs: c.features,
    targetCustomers: [
      { label: "20~30대 1인 가구", context: `${josa(c.catShort, "을를")} 자주 쓰지만 관리가 번거로운 사람`, priority: "primary" },
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
    { id: "s-solution", type: "solution", message: `그래서 ${josa(c.name, "은는")} 이렇게 만들었다`, reason: "문제 바로 뒤에 해결 제시", imageRoles: ["featureExplainer"] },
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
  const short = (s: string) => String(s).split(/[·,:\-—(]/)[0].trim().slice(0, 16);
  // "무엇을 해서 → 뭐가 편해지는지" 형태의 불릿
  const benefitLine = (feat: string) => {
    const k = short(feat);
    return `${k} — 쓰다 보면 이 부분에서 손이 덜 갑니다.`;
  };

  switch (type) {
    case "hero":
      return {
        ...base,
        headline: c.hook,
        subheadline: `매일 쓰는 ${c.catShort}, 이런 차이가 생각보다 큽니다.`,
        bullets: f.slice(0, 3).map(short),
        cta: "옵션 확인하기",
      };
    case "usp":
      return {
        ...base,
        headline: "왜 이걸 고르는지, 짧게 말하면",
        subheadline: `${josa(c.name, "을를")} 다시 찾게 되는 이유는 몇 가지로 좁혀집니다.`,
        bullets: f.slice(0, 3).map(benefitLine),
      };
    case "problem":
      return {
        ...base,
        headline: `${c.catShort}, 쓰다 보면 꼭 이 부분이 걸립니다`,
        subheadline: "큰 불편은 아닌데, 매일 반복되면 이야기가 달라집니다.",
        bullets: [
          "비슷해 보여서 뭘 골라야 할지 애매했습니다.",
          "저렴한 걸 샀다가 얼마 못 가 다시 산 적이 있습니다.",
          "막상 쓰면 정리하고 꺼내는 데 손이 자꾸 갑니다.",
        ],
      };
    case "solution":
      return {
        ...base,
        headline: `그래서 ${josa(short(c.name), "은는")} 이렇게 만들었습니다`,
        subheadline: "괜히 기능만 늘리지 않고, 자주 쓰는 부분에 집중했습니다.",
        bullets: f.slice(0, 4).map((x) => `${short(x)} — 실제 쓰는 상황을 기준으로 잡았습니다.`),
      };
    case "feature":
      return {
        ...base,
        headline: "한 번 써보면 왜 이렇게 만들었는지 느껴집니다",
        subheadline: "기능 자체보다, 쓸 때 뭐가 달라지는지를 보시면 됩니다.",
        bullets: f.map((x) => `${short(x)} — 필요할 때 바로, 쓰고 나면 간단하게.`),
      };
    case "featureDetail": {
      const detailTopic = f[0] && !looksLikeSpec(f[0]) && !/기능|사용|마감|품질/.test(f[0]) ? `${short(f[0])}, ` : "";
      return {
        ...base,
        headline: `${detailTopic}왜 이 부분을 신경 썼냐면`,
        subheadline: "눈에 잘 띄지는 않아도, 매일 쓸 때 체감이 가장 큰 부분입니다.",
        body: `${short(c.name)}에서 가장 많이 물어보시는 게 이 부분입니다. 처음엔 사소해 보여도, 반복해서 쓰다 보면 여기서 편함이 갈립니다. 그래서 실제 사용하는 자세와 상황을 기준으로 잡았습니다.`,
        bullets: f.slice(0, 3).map(short),
      };
    }
    case "lifestyle":
      return {
        ...base,
        headline: "특별한 날이 아니라, 그냥 매일",
        subheadline: "출근길에도, 집에서도, 주말에도 자연스럽게 손이 갑니다.",
        bullets: ["아침에 나갈 때 챙기기 좋습니다.", "책상 위에 둬도 부담이 없습니다.", "주말 나들이에도 그대로 들고 나갑니다."],
      };
    case "comparison":
      return {
        ...base,
        headline: "비슷해 보여도, 써보면 여기서 갈립니다",
        subheadline: "가격만 보면 작은 차이지만, 매일 쓰면 체감은 달라집니다.",
        comparison: {
          columns: [short(c.name), "일반 제품"],
          rows: [
            { criterion: "마감·소재", values: ["꼼꼼하게", "제각각"] },
            { criterion: "쓸 때 손이 가는 정도", values: ["적게", "자주"] },
            { criterion: "다시 사게 되는 주기", values: ["길게", "짧게"] },
            { criterion: "구매 전 정보", values: ["자세히", "부족"] },
            { criterion: "문제 생겼을 때", values: ["대응 가능", "애매함"] },
          ],
        },
        bullets: ["무엇을 더 넣었는지보다, 무엇을 편하게 만들었는지를 봐주세요."],
      };
    case "howToUse":
      return {
        ...base,
        headline: "설명서 안 봐도 됩니다",
        subheadline: "받자마자 바로 쓸 수 있게, 과정을 최대한 줄였습니다.",
        steps: [
          { order: 1, title: "꺼내서 한 번 닦기", description: "받으면 가볍게 닦아 물기만 말려주세요." },
          { order: 2, title: "평소처럼 쓰기", description: "쓰던 방식 그대로 쓰시면 됩니다. 따로 익힐 게 없습니다." },
          { order: 3, title: "쓰고 나면 정리", description: "물기만 말려 한쪽에 두면 다음에도 그대로입니다." },
        ],
      };
    case "productInfo":
      return {
        ...base,
        headline: "구매 전에 이 부분만 확인해 주세요",
        subheadline: "사진만으로 헷갈리는 부분까지 최대한 담았습니다.",
        infoRows: [
          { label: "제품명", value: c.name },
          { label: "카테고리", value: c.category },
          { label: "구성", value: "본품 + 사용 가이드" },
          { label: "가격", value: c.price ? `${c.price.toLocaleString()}원` : "옵션별로 다릅니다" },
          ...f.slice(0, 3).map((x, i) => ({ label: ["소재·스펙", "특징", "옵션"][i] ?? "정보", value: String(x) })),
        ],
        bullets: [
          "모니터 환경에 따라 실제 색상과 차이가 있을 수 있습니다.",
          "제품 특성상 미세한 사이즈 편차가 있을 수 있습니다.",
          "교환·반품은 수령 후 7일 이내, 사용 흔적이 없을 때 가능합니다.",
        ],
      };
    case "cta":
      return {
        ...base,
        headline: "필요했던 제품이라면, 더 미루지 않아도 됩니다",
        subheadline: "어차피 계속 쓰게 될 제품이라면, 오늘부터 조금 더 편하게 써보세요.",
        cta: "옵션 선택하기",
        bullets: ["평일 오후 3시 이전 주문 시 당일 출고", "단순 변심 교환 가능", "구매 후 문의는 국내 CS"],
      };
    default:
      return { ...base, headline: short(c.name), body: f.map(short).join(", ") };
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
