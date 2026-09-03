/**
 * 편집기 문서(EditorDoc) — 3단 편집기가 다루는 상태.
 *
 * DetailPage 와 호환되지만 analysis/usp/plan 은 AI 생성 시에만 채워진다.
 * 스크래치에서 시작하면 product + sections 만 있으면 렌더/편집이 된다.
 */
import type {
  DetailImage,
  DetailPage,
  DetailSectionData,
  ImageRole,
  ProductInput,
  SectionCopy,
  SectionType,
} from "@/types/detail-page";
import type { SectionLayoutOverride } from "@/components/detail-page/_shared";
import type { DesignTokens } from "./design-tokens";
import { IMAGE_PRESETS, presetByKey, type AspectRatio } from "./image-presets";

/** 섹션별 배경/정렬/여백/크기 오버라이드 (렌더러 컨텍스트와 동일 타입) */
export type SectionLayout = SectionLayoutOverride;

/** AI 이미지 스튜디오의 이미지 슬롯 하나 */
export interface ImageSlot {
  id: string;
  presetKey: string;
  label: string;
  role: ImageRole;
  /** 자동 배치 대상 섹션 (없으면 미배치) */
  sectionId: string | null;
  /** 왜 이 이미지가 필요한지 (추천 이유) */
  purpose: string;
  /** 사용자가 켠 이미지만 생성 */
  enabled: boolean;
  ratio: AspectRatio;
  /** Higgsfield 최종 프롬프트 (편집 가능) */
  prompt: string;
  negativePrompt?: string;
  /** Claude 프롬프트 기획 결과 (읽기용 텍스트) */
  planDetail?: string;
  /** 이 슬롯 전용 레퍼런스 이미지 (기본: 대표 상품사진) */
  referenceUrl?: string;
  status: "idle" | "planning" | "generating" | "done" | "error";
  candidates: string[];
  chosen?: string;
  versions: { url: string; prompt: string; at: string }[];
  error?: string;
}

export const REVIEW_TAGS = ["배송", "품질", "사용감", "기능", "가성비", "디자인", "재구매"] as const;
export type ReviewTag = (typeof REVIEW_TAGS)[number];

export interface Review {
  id: string;
  /** real = 실제 구매 후기, demo = AI가 만든 UI 확인용 초안 */
  source: "real" | "demo";
  author?: string;
  /** 1~5. real 에서만 의미 있음 */
  rating?: number;
  body: string;
  tags: string[];
  images?: string[];
  at: string;
}

export interface EditorDoc {
  product: ProductInput;
  sections: EditorSection[];
  meta: DetailPage["meta"];
  /** AI 생성 시 채워지는 부가 산출물 (JSON 보기용) */
  analysis?: DetailPage["analysis"];
  usp?: DetailPage["usp"];
  plan?: DetailPage["plan"];
  /** 상품별 색상 디자인 토큰 */
  designTokens?: DesignTokens;
  /** AI 이미지 스튜디오 이미지 계획 */
  imagePlan?: ImageSlot[];
  /** 리뷰 (실제 + demo) */
  reviews?: Review[];
}

/** DetailSectionData + 편집기 전용 레이아웃 설정 */
export type EditorSection = DetailSectionData & { layout?: SectionLayout };

// ---------------------------------------------------------------------------

export const SECTION_TYPES: SectionType[] = [
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
  "review",
  "cta",
];

export const SECTION_LABEL: Record<SectionType, string> = {
  hero: "히어로",
  usp: "핵심 USP",
  problem: "고객 문제",
  solution: "해결책",
  feature: "주요 기능",
  featureDetail: "기능 상세",
  lifestyle: "라이프스타일",
  comparison: "비교",
  detail: "디테일 컷",
  howToUse: "사용 방법",
  productInfo: "제품 정보",
  review: "리뷰",
  cta: "구매 유도(CTA)",
};

/** 섹션 타입이 기본으로 쓰는 이미지 역할 (AI 재생성 프롬프트 기본값에 사용) */
export const SECTION_IMAGE_ROLE: Record<SectionType, ImageRole> = {
  hero: "heroMain",
  usp: "infographic",
  problem: "usageScene",
  solution: "featureExplainer",
  feature: "featureExplainer",
  featureDetail: "detailCloseup",
  lifestyle: "lifestyle",
  comparison: "comparison",
  detail: "detailCloseup",
  howToUse: "usageScene",
  productInfo: "productCutout",
  review: "lifestyle",
  cta: "heroMain",
};

export const IMAGE_ROLES: ImageRole[] = [
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

// ---------------------------------------------------------------------------

let seq = 0;
export const uid = (p = "s") =>
  `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

const SAMPLE_COPY: Partial<Record<SectionType, SectionCopy>> = {
  hero: {
    sectionId: "",
    type: "hero",
    headline: "제목을 입력하세요",
    subheadline: "제품을 한 문장으로 설명하세요",
    cta: "지금 구매하기",
  },
  cta: {
    sectionId: "",
    type: "cta",
    headline: "지금 시작하세요",
    subheadline: "",
    cta: "구매하기",
  },
};

/** 빈 섹션 하나 생성 */
export function makeSection(type: SectionType): EditorSection {
  const id = uid();
  const base = SAMPLE_COPY[type];
  const copy: SectionCopy = base
    ? { ...base, sectionId: id }
    : {
        sectionId: id,
        type,
        headline: `${SECTION_LABEL[type]} 제목`,
        subheadline: "",
        bullets: ["항목 1", "항목 2", "항목 3"],
      };
  return { id, type, copy, images: [] };
}

export function makeImage(url: string, role: ImageRole, alt = ""): DetailImage {
  return { url, width: 1024, height: 1280, alt, role };
}

/** 완전히 빈 새 문서 */
export function emptyDoc(): EditorDoc {
  return {
    product: {
      name: "",
      category: "",
      price: undefined,
      description: "",
      specs: [],
      sellingPoints: [],
      features: [],
      brandTone: "",
      salesChannel: "",
      material: "",
      size: "",
      components: "",
      targetCustomer: "",
      extraRequest: "",
      images: [],
    },
    sections: [makeSection("hero"), makeSection("usp"), makeSection("cta")],
    meta: { generatedAt: new Date().toISOString(), llmModel: "-", imageProvider: "mock" },
  };
}

/** 섹션 타입별 기본 이미지 배치 (시각 리듬용 · 사용자가 오버라이드 가능) */
const DEFAULT_MEDIA: Partial<Record<SectionType, SectionLayout["media"]>> = {
  problem: "full",
  solution: "split",
  featureDetail: "grid2",
  lifestyle: "carousel",
  detail: "grid3",
  howToUse: "full",
};

/**
 * 파이프라인 결과 DetailPage → EditorDoc. prevProduct 를 주면 편집기 입력 필드를 유지한다.
 * TEXT/PHOTO 가 단조롭게 반복되지 않도록 섹션별 기본 배치·톤을 얹는다. (기존 layout 은 유지)
 */
export function fromDetailPage(page: DetailPage, prevProduct?: ProductInput): EditorDoc {
  let toneToggle = 0;
  const sections: EditorSection[] = page.sections.map((s) => {
    // data URL(base64) 이미지는 doc 을 비대하게 만들어 저장을 실패시킨다 → 제거하고
    // 편집기의 "누끼컷으로 전체 이미지 제작"에서 Storage 저장본으로 채우게 한다.
    const sec: EditorSection = { ...s, images: (s.images ?? []).filter((im) => !im.url?.startsWith("data:")) };
    const media = DEFAULT_MEDIA[s.type];
    const existing = sec.layout ?? {};
    const layout: SectionLayout = { ...existing };
    if (media && existing.media == null) layout.media = media;
    // hero/cta/problem 은 자체 톤이 강하므로 건드리지 않고, 나머지를 흰/회색으로 번갈아
    if (existing.tone == null && !["hero", "cta", "problem", "comparison", "review"].includes(s.type)) {
      layout.tone = toneToggle++ % 2 === 1 ? "gray" : "light";
    }
    if (Object.keys(layout).length) sec.layout = layout;
    return sec;
  });
  return {
    product: prevProduct
      ? { ...prevProduct, images: prevProduct.images ?? page.product.images }
      : page.product,
    sections,
    meta: page.meta,
    analysis: page.analysis,
    usp: page.usp,
    plan: page.plan,
  };
}

/**
 * 편집기 doc → 파이프라인 입력 ProductInput.
 * 편집기 전용 필드(재질/크기/구성품/타깃/추가요청)는 description·specs 로 접어서 넣어
 * 기존 파이프라인이 그대로 활용하도록 한다.
 */
export function toProductInput(p: ProductInput): ProductInput {
  const clean = (s?: string) => (s ?? "").trim();
  const descParts = [
    clean(p.description),
    clean(p.targetCustomer) && `타깃 고객: ${clean(p.targetCustomer)}`,
    clean(p.salesChannel) && `판매 채널: ${clean(p.salesChannel)}`,
    clean(p.extraRequest) && `추가 요청사항: ${clean(p.extraRequest)}`,
  ].filter(Boolean);

  const specs = [
    ...(p.specs ?? []),
    ...(p.features ?? []),
    clean(p.material) && `재질: ${clean(p.material)}`,
    clean(p.size) && `크기: ${clean(p.size)}`,
    clean(p.components) && `구성품: ${clean(p.components)}`,
  ]
    .map((s) => String(s).trim())
    .filter(Boolean);

  return {
    name: p.name?.trim() || "새 상품",
    category: p.category?.trim() || undefined,
    price: typeof p.price === "number" && !Number.isNaN(p.price) ? p.price : undefined,
    description: descParts.join(" / ") || undefined,
    specs,
    sellingPoints: (p.sellingPoints ?? []).map((s) => s.trim()).filter(Boolean),
    brandTone: p.brandTone?.trim() || undefined,
    images: (p.images ?? []).filter((i) => i.url),
    referenceUrls: (p.referenceUrls ?? []).filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// AI 이미지 스튜디오 — 슬롯 생성 / 추천

const PRODUCT_LOCK =
  "keep the exact product shape, proportions, color, material, pattern, buttons, ports, handles, logo and label from the reference — do not redesign the product";
const NEGATIVE_DEFAULT =
  "distorted product, changed product color, altered product structure, warped logo, extra accessories, deformed hands, extra fingers, malformed body, garbled text, watermark, lowres";

export function defaultSlotPrompt(presetKey: string, product: ProductInput, tokens?: DesignTokens): string {
  const preset = presetByKey(presetKey);
  const name = product.name?.trim() || "the product";
  const mood = tokens?.mood ? `, color mood: ${tokens.mood}` : "";
  const scene = preset?.scene ?? "premium commercial product photo";
  return `${name}, ${scene}, Korean e-commerce detail page image, photorealistic commercial photography, high detail${mood}. ${PRODUCT_LOCK}.`;
}

/** 이미지 생성 기본 비율 — 1:1 (1000×1000). 상세페이지에 들어갈 때 섹션 비율로 자동 크롭됨. */
export const DEFAULT_IMAGE_RATIO: AspectRatio = "1:1";

export function makeSlot(
  presetKey: string,
  product: ProductInput,
  sectionId: string | null,
  tokens?: DesignTokens,
): ImageSlot {
  const preset = presetByKey(presetKey);
  return {
    id: uid("img"),
    presetKey,
    label: preset?.label ?? presetKey,
    role: preset?.role ?? "featureExplainer",
    sectionId,
    purpose: preset?.purpose ?? "상세페이지 이미지",
    enabled: Boolean(preset?.defaultOn),
    ratio: DEFAULT_IMAGE_RATIO,
    prompt: defaultSlotPrompt(presetKey, product, tokens),
    negativePrompt: NEGATIVE_DEFAULT,
    referenceUrl: (product.images ?? [])[0]?.url,
    status: "idle",
    candidates: [],
    versions: [],
  };
}

/**
 * plan.sections + 카테고리 키워드로 필요한 이미지 슬롯을 추천한다.
 * 모든 상품에 같은 목록을 강제하지 않는다. (spec #7)
 */
export function recommendSlots(doc: EditorDoc): ImageSlot[] {
  const cat = `${doc.product.category ?? ""} ${doc.product.name ?? ""} ${(doc.product.specs ?? []).join(" ")}`;
  const sections = doc.sections;
  const slots: ImageSlot[] = [];
  const used = new Set<string>();

  const add = (presetKey: string, sectionId: string | null, forceOn = false) => {
    if (used.has(presetKey)) return;
    used.add(presetKey);
    const s = makeSlot(presetKey, doc.product, sectionId, doc.designTokens);
    if (forceOn) s.enabled = true;
    slots.push(s);
  };

  // 1) 각 섹션의 imageRoles 를 만족하는 프리셋
  for (const sec of sections) {
    if (sec.type === "review" || sec.type === "cta") continue;
    const preset = IMAGE_PRESETS.find(
      (p) => p.sections.includes(sec.type) && (!p.categories || p.categories.test(cat)) && p.group !== "모델",
    );
    if (preset) add(preset.key, sec.id, ["hero", "usp", "feature", "lifestyle"].includes(sec.type));
  }

  // 2) 카테고리에 맞는 연출/모델/디테일 프리셋 추가 (기본 OFF, 사용자가 선택)
  for (const p of IMAGE_PRESETS) {
    if (used.has(p.key) || p.group === "리뷰") continue;
    if (p.categories && p.categories.test(cat)) {
      const target = sections.find((s) => p.sections.includes(s.type))?.id ?? null;
      add(p.key, target);
    }
  }

  // 3) 항상 있으면 좋은 기본 컷 보강
  for (const key of ["heroMain", "lifestyle", "detail", "featureExplain"]) {
    if (!used.has(key)) {
      const preset = presetByKey(key)!;
      const target = sections.find((s) => preset.sections.includes(s.type))?.id ?? null;
      add(key, target, true);
    }
  }

  return slots;
}

/** 생성/배치된 이미지 URL 을 중복 없이 모은다 (ZIP 다운로드용). */
export function collectGeneratedImages(doc: EditorDoc): { name: string; url: string }[] {
  const seen = new Set<string>();
  const out: { name: string; url: string }[] = [];
  const push = (url: string | undefined, label: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    const safe = label.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ-]+/g, "_").slice(0, 40) || "image";
    out.push({ name: `${String(out.length + 1).padStart(2, "0")}_${safe}`, url });
  };
  // 섹션에 실제로 배치된 이미지 (순서대로)
  doc.sections.forEach((sec, i) => {
    sec.images.forEach((img) => push(img.url, `${String(i + 1).padStart(2, "0")}-${SECTION_LABEL[sec.type]}-${img.role}`));
  });
  // 스튜디오에서 만든 이미지 (선택/버전 포함)
  (doc.imagePlan ?? []).forEach((slot) => {
    push(slot.chosen, `slot-${slot.label}`);
    slot.versions.forEach((v, vi) => push(v.url, `slot-${slot.label}-v${vi + 1}`));
    slot.candidates.forEach((c, ci) => push(c, `slot-${slot.label}-cand${ci + 1}`));
  });
  return out;
}

// ---------------------------------------------------------------------------
// 리뷰 → 리뷰 섹션

/** 선택된 리뷰들을 리뷰 섹션 copy 로 직렬화 (copy.body 에 JSON) */
export function reviewsToSectionCopy(sectionId: string, reviews: Review[], product: ProductInput): SectionCopy {
  const real = reviews.filter((r) => r.source === "real");
  const rated = real.filter((r) => typeof r.rating === "number");
  const avg = rated.length ? rated.reduce((n, r) => n + (r.rating ?? 0), 0) / rated.length : undefined;
  return {
    sectionId,
    type: "review",
    headline: "구매하신 분들의 후기",
    subheadline: product.name ? `${product.name}을(를) 먼저 써본 분들` : undefined,
    stats:
      real.length > 0
        ? [
            avg ? { value: avg.toFixed(1), label: "평균 별점" } : { value: `${real.length}`, label: "실제 후기" },
            { value: `${real.length}`, label: "리뷰 수" },
          ]
        : undefined,
    // body 에 리뷰 데이터를 JSON 으로 실어 ReviewSection 이 파싱
    body: JSON.stringify(reviews),
  };
}

export function makeReviewSection(reviews: Review[], product: ProductInput): EditorSection {
  const id = uid();
  return { id, type: "review", copy: reviewsToSectionCopy(id, reviews, product), images: [] };
}

export function makeReview(source: "real" | "demo", partial: Partial<Review> = {}): Review {
  return {
    id: uid("rv"),
    source,
    body: "",
    tags: [],
    at: new Date().toISOString(),
    ...partial,
  };
}
