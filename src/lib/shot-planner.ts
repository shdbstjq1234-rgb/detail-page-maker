/**
 * AI 이미지 제작 리스트 플래너 + 구조화 프롬프트 빌더.
 *
 * 상품을 분석하면 "이 상품 상세페이지에 필요한 컷" 을 먼저 제안한다.
 * 컷 목록은 카테고리마다 달라진다 (양말과 가구가 같을 수 없다).
 *
 * 모든 컷은 하나의 projectVisualDirection 을 공유해서,
 * 12장을 따로 만들어도 같은 브랜드가 찍은 한 세트처럼 보이게 한다.
 */
import type { ImageRole, ProductInput, SectionType } from "@/types/detail-page";
import type { AspectRatio } from "./image-presets";
import { detectPreset } from "./category-presets";
import type { VisualDirection } from "./design-direction";
import { characterPromptBlock } from "./library";
import { uid, type EditorSection, type ImageSlot } from "./editor-doc";

/** 컷 하나의 기획 */
export interface ShotSpec {
  key: string;
  label: string;
  /** 무엇을 찍는지 (사용자에게 보이는 설명) */
  description: string;
  role: ImageRole;
  ratio: AspectRatio;
  /** 이 컷이 해결하는 구매 의심 */
  why: string;
  /** 붙을 섹션 타입 */
  section: SectionType;
  /** 텍스트가 들어갈 자리 */
  copyPosition: "left" | "right" | "top" | "bottom" | "none";
  /** 여백 비율 (%) */
  negativeSpace: number;
  /** 기본 선택 여부 */
  defaultOn: boolean;
}

const RATIO_BY_ROLE: Partial<Record<ImageRole, AspectRatio>> = {
  heroMain: "1:1",
  lifestyle: "4:5",
  usageScene: "4:5",
  detailCloseup: "1:1",
  featureExplainer: "1:1",
  comparison: "16:9",
  beforeAfter: "16:9",
  sizeReference: "1:1",
  productCutout: "1:1",
  structure: "1:1",
  infographic: "4:5",
};

const SECTION_BY_ROLE: Partial<Record<ImageRole, SectionType>> = {
  heroMain: "hero",
  productCutout: "productInfo",
  usageScene: "howToUse",
  detailCloseup: "detail",
  featureExplainer: "feature",
  beforeAfter: "problem",
  comparison: "comparison",
  lifestyle: "lifestyle",
  infographic: "usp",
  structure: "featureDetail",
  sizeReference: "productInfo",
};

/** 항상 있으면 좋은 기본 컷 (카테고리 컷과 합쳐진다) */
const BASE_SHOTS: Omit<ShotSpec, "why">[] = [
  {
    key: "hero",
    label: "메인 히어로 이미지",
    description: "첫 화면을 채울 제품 대표 연출컷",
    role: "heroMain",
    ratio: "1:1",
    section: "hero",
    copyPosition: "top",
    negativeSpace: 30,
    defaultOn: true,
  },
  {
    key: "premiumSolo",
    label: "제품 단독 프리미엄 컷",
    description: "배경 정리된 스튜디오 단독컷",
    role: "productCutout",
    ratio: "1:1",
    section: "usp",
    copyPosition: "none",
    negativeSpace: 25,
    defaultOn: true,
  },
  {
    key: "usage",
    label: "실제 사용 장면",
    description: "쓰는 순간이 보이는 컷",
    role: "usageScene",
    ratio: "4:5",
    section: "howToUse",
    copyPosition: "left",
    negativeSpace: 35,
    defaultOn: true,
  },
  {
    key: "feature",
    label: "기능 강조 이미지",
    description: "핵심 기능이 눈에 보이게",
    role: "featureExplainer",
    ratio: "1:1",
    section: "feature",
    copyPosition: "right",
    negativeSpace: 40,
    defaultOn: true,
  },
  {
    key: "detail",
    label: "디테일 확대 컷",
    description: "마감·봉제·조립부 클로즈업",
    role: "detailCloseup",
    ratio: "1:1",
    section: "detail",
    copyPosition: "none",
    negativeSpace: 15,
    defaultOn: true,
  },
  {
    key: "material",
    label: "재질 표현 컷",
    description: "소재 질감이 느껴지는 매크로",
    role: "detailCloseup",
    ratio: "1:1",
    section: "featureDetail",
    copyPosition: "none",
    negativeSpace: 15,
    defaultOn: false,
  },
  {
    key: "size",
    label: "사이즈 비교 컷",
    description: "손·일상 사물과 나란히 놓아 크기 감",
    role: "sizeReference",
    ratio: "1:1",
    section: "productInfo",
    copyPosition: "bottom",
    negativeSpace: 25,
    defaultOn: false,
  },
  {
    key: "beforeAfter",
    label: "사용 전 / 후",
    description: "변화가 한눈에 보이는 2분할",
    role: "beforeAfter",
    ratio: "16:9",
    section: "problem",
    copyPosition: "none",
    negativeSpace: 10,
    defaultOn: false,
  },
  {
    key: "lifestyle",
    label: "라이프스타일 이미지",
    description: "공간에 자연스럽게 놓인 장면",
    role: "lifestyle",
    ratio: "4:5",
    section: "lifestyle",
    copyPosition: "left",
    negativeSpace: 40,
    defaultOn: true,
  },
  {
    key: "components",
    label: "구성품 이미지",
    description: "받는 것이 무엇인지 한 장에",
    role: "productCutout",
    ratio: "1:1",
    section: "productInfo",
    copyPosition: "none",
    negativeSpace: 20,
    defaultOn: false,
  },
  {
    key: "package",
    label: "패키지 이미지",
    description: "포장 상태 · 선물용 여부",
    role: "productCutout",
    ratio: "1:1",
    section: "productInfo",
    copyPosition: "none",
    negativeSpace: 20,
    defaultOn: false,
  },
  {
    key: "ctaFinal",
    label: "CTA용 마지막 이미지",
    description: "구매 직전 마지막 인상",
    role: "heroMain",
    ratio: "1:1",
    section: "cta",
    copyPosition: "top",
    negativeSpace: 35,
    defaultOn: false,
  },
];

/**
 * 상품 → 필요한 컷 목록.
 * 카테고리 프리셋의 imageCuts 를 우선 반영하고, 기본 컷으로 보강한다.
 */
export function planShots(product: ProductInput): ShotSpec[] {
  const cat = detectPreset({ name: product.name, category: product.category, description: product.description });
  const out: ShotSpec[] = [];
  const seen = new Set<string>();

  // 1) 카테고리가 지정한 컷이 최우선 (이 카테고리에서 실제로 필요한 것)
  for (const cut of cat.imageCuts) {
    const key = `cat_${cut.role}_${cut.label}`.replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      label: cut.label,
      description: cut.why,
      role: cut.role,
      ratio: RATIO_BY_ROLE[cut.role] ?? "1:1",
      why: cut.why,
      section: SECTION_BY_ROLE[cut.role] ?? "feature",
      copyPosition: cut.role === "heroMain" ? "top" : cut.role === "lifestyle" ? "left" : "none",
      negativeSpace: cut.role === "heroMain" || cut.role === "lifestyle" ? 35 : 18,
      defaultOn: true,
    });
  }

  // 2) 기본 컷 보강 (역할이 겹치지 않는 것만, 기본은 꺼둠)
  for (const b of BASE_SHOTS) {
    if (out.some((o) => o.role === b.role)) continue;
    out.push({ ...b, why: b.description, defaultOn: b.defaultOn && out.length < 8 });
  }

  return out;
}

/** ShotSpec → 편집기 ImageSlot (기존 스튜디오/배치 로직과 호환) */
export function shotToSlot(
  spec: ShotSpec,
  product: ProductInput,
  sections: EditorSection[],
  visual?: VisualDirection,
  colorMood?: string,
): ImageSlot {
  const target = sections.find((s) => s.type === spec.section) ?? sections.find((s) => s.type === "feature") ?? null;
  return {
    id: uid("img"),
    presetKey: spec.key,
    label: spec.label,
    role: spec.role,
    sectionId: target?.id ?? null,
    purpose: spec.why,
    enabled: spec.defaultOn,
    ratio: spec.ratio,
    prompt: buildShotPrompt(spec, product, visual, colorMood),
    negativePrompt: NEGATIVE,
    referenceUrl: (product.images ?? [])[0]?.url,
    status: "idle",
    candidates: [],
    versions: [],
  };
}

export const NEGATIVE =
  "do not redesign or restyle the product, no changed product color, no altered proportions, no invented logos or text, " +
  "no garbled letters, no extra accessories that are not in the reference, no deformed hands or extra fingers, " +
  "no floating objects, no fake reflections, no exaggerated HDR, no plastic-looking over-glossy surfaces, " +
  "no heavy vignette, no watermark, no cluttered meaningless background props, no cartoon or 3d render look";

/**
 * 구조화된 이미지 프롬프트.
 * PRODUCT IDENTITY / SCENE / COMPOSITION / CAMERA / LIGHTING / BACKGROUND / MATERIAL / COLOR / DETAIL / NEGATIVE / STYLE
 */
export function buildShotPrompt(
  spec: ShotSpec,
  product: ProductInput,
  visual?: VisualDirection,
  colorMood?: string,
  character?: Parameters<typeof characterPromptBlock>[0],
): string {
  const name = product.name?.trim() || "the product";
  const material = product.material?.trim();
  const copySpace =
    spec.copyPosition === "none"
      ? "Centered composition with even margins."
      : `Place the product toward the ${spec.copyPosition === "left" ? "right" : spec.copyPosition === "right" ? "left" : "center"} ` +
        `and leave about ${spec.negativeSpace}% clean empty space on the ${spec.copyPosition} for Korean headline typography. ` +
        `Keep that area visually quiet — no busy texture or objects there.`;

  return [
    `PRODUCT IDENTITY: ${name}. Reproduce the product in the reference image exactly — same geometry, proportions, color, material, surface finish, seams, openings, buttons, patterns and logo placement. This must look like a photograph of that exact product, not a similar one.`,
    `SHOT: ${spec.label} — ${spec.description}.`,
    `SCENE: ${visual?.backgroundTone ?? "clean neutral studio surface"}.`,
    `COMPOSITION: ${copySpace}`,
    `CAMERA: ${visual?.cameraStyle ?? "85mm equivalent commercial product photography, product-level height"}.`,
    `LIGHTING: ${visual?.lightingStyle ?? "large softbox key light with gentle fill and a subtle rim light"}.`,
    material ? `MATERIAL: show the real texture of ${material} — accurate weave/grain, no plastic sheen.` : `MATERIAL: keep the real surface texture of the product, no artificial gloss.`,
    `COLOR: ${colorMood ?? "neutral commercial color, true-to-life product color"}. ${visual?.colorGrading ?? ""}`.trim(),
    `DETAIL: sharp on the product, natural depth of field, realistic contact shadow on the surface.`,
    `STYLE: ${visual?.photographyStyle ?? "korean e-commerce commercial photography"}, ${visual?.visualMood ?? "clean and trustworthy"}. Suitable for a Korean online store detail page.`,
    visual?.modelDirection ? `MODEL: ${visual.modelDirection}.` : "",
    characterPromptBlock(character),
    `NEGATIVE: ${NEGATIVE}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 사람이 읽는 촬영 기획서 (UI 표시용) */
export function shotBrief(spec: ShotSpec): string {
  const pos =
    spec.copyPosition === "none" ? "텍스트 없음(이미지 단독)" : `텍스트 자리: ${({ left: "왼쪽", right: "오른쪽", top: "위", bottom: "아래" } as const)[spec.copyPosition]} 약 ${spec.negativeSpace}%`;
  return `${spec.description} · 비율 ${spec.ratio} · ${pos}`;
}
