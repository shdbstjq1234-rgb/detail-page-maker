/**
 * AI 디자인 디렉터.
 *
 * 상품 분석 → 카테고리 → 타깃 → 제품 색 → 브랜드 무드 → 컬러 시스템 → 비주얼 디렉션.
 * 여기서 나온 visualDirection 은 "모든 이미지 생성 프롬프트가 공유"해서
 * 12장을 따로 만들어도 하나의 브랜드 촬영처럼 보이게 한다.
 */
import {
  buildPalette,
  assignSectionStyles,
  auditPalette,
  type ColorPalette,
  type ColorPreset,
  type ColorUsage,
  type ProductColors,
  type SectionStyle,
} from "./color-direction";
import { detectPreset } from "./category-presets";

/** 모든 이미지가 공유하는 촬영 지침 */
export interface VisualDirection {
  /** 사진 스타일 */
  photographyStyle: string;
  /** 조명 */
  lightingStyle: string;
  /** 배경 톤 */
  backgroundTone: string;
  /** 색보정 */
  colorGrading: string;
  /** 카메라 */
  cameraStyle: string;
  /** 전체 무드 */
  visualMood: string;
  /** 모델 사용 여부·성격 */
  modelDirection: string;
}

export interface DesignDirection {
  category: string;
  targetAudience: string;
  mood: string[];
  colorPreset: ColorPreset;
  palette: ColorPalette;
  colorUsage: ColorUsage;
  /** 왜 이 색인지 (UI 표시) */
  rationale: string;
  /** 이미지 프롬프트용 색·무드 문구 */
  colorMoodPrompt: string;
  visualStyle: string;
  layoutStyle: string;
  visual: VisualDirection;
  /** 섹션id → 색 */
  sectionStyles: Record<string, SectionStyle>;
  /** 자가 검수 결과 */
  issues: string[];
  createdAt: string;
}

export interface DirectionInput {
  name?: string;
  category?: string;
  brandTone?: string;
  price?: number;
  targetCustomer?: string;
  description?: string;
  productColors?: ProductColors;
  preset?: ColorPreset;
  sections: { id: string; type: string }[];
}

/** 가격대 → 포지션 */
function pricePosition(price?: number): "value" | "mid" | "premium" {
  if (!price) return "mid";
  if (price < 15000) return "value";
  if (price > 60000) return "premium";
  return "mid";
}

const PHOTO_BY_CATEGORY: [RegExp, Partial<VisualDirection>][] = [
  [/주방|텀블러|컵|식기|조리|도마|냄비|도시락/i, { backgroundTone: "warm off-white kitchen counter, subtle wood or stone", photographyStyle: "clean tabletop product photography", lightingStyle: "large soft window light from the side, gentle shadow" }],
  [/뷰티|스킨|화장품|향수|코스메틱/i, { backgroundTone: "smooth seamless paper, soft gradient-free neutral", photographyStyle: "editorial cosmetic still life", lightingStyle: "soft box with controlled specular highlight" }],
  [/운동|스포츠|러닝|헬스|양말|레깅스/i, { backgroundTone: "concrete, track or gym floor texture", photographyStyle: "dynamic lifestyle sports photography", lightingStyle: "hard directional light with crisp shadow" }],
  [/자동차|차량|블랙박스|거치대/i, { backgroundTone: "dark car interior, matte black surfaces", photographyStyle: "technical automotive detail photography", lightingStyle: "controlled rim light on dark background" }],
  [/유아|아기|키즈|문구|완구|장난감/i, { backgroundTone: "bright soft pastel surface, no clutter", photographyStyle: "friendly bright product photography", lightingStyle: "even diffused light, minimal shadow" }],
  [/반려|강아지|고양이|펫/i, { backgroundTone: "warm home floor, natural wood", photographyStyle: "warm candid lifestyle photography", lightingStyle: "natural daylight, soft" }],
  [/가전|전자|이어폰|충전|스피커/i, { backgroundTone: "neutral grey seamless, minimal", photographyStyle: "precise technical product photography", lightingStyle: "controlled studio light, clean edge definition" }],
  [/캠핑|아웃도어|등산|텐트/i, { backgroundTone: "outdoor natural ground, muted earth tones", photographyStyle: "outdoor lifestyle photography", lightingStyle: "late afternoon natural light" }],
  [/패션|의류|가방|지갑|신발|잡화/i, { backgroundTone: "neutral studio seamless or simple street", photographyStyle: "korean fashion lookbook photography", lightingStyle: "soft even light, natural skin tone" }],
  [/가구|인테리어|의자|책상|소파|조명/i, { backgroundTone: "styled interior room, neutral wall", photographyStyle: "interior lifestyle photography", lightingStyle: "large window daylight" }],
];

function visualFor(input: DirectionInput, colorMood: string): VisualDirection {
  const hay = `${input.category ?? ""} ${input.name ?? ""}`;
  const hit = PHOTO_BY_CATEGORY.find(([re]) => re.test(hay))?.[1] ?? {};
  const pos = pricePosition(input.price);
  const grading =
    pos === "premium"
      ? "restrained contrast, slightly desaturated, film-like"
      : pos === "value"
        ? "bright clean grading, true-to-life color"
        : "clean commercial grading, accurate color";
  return {
    photographyStyle: hit.photographyStyle ?? "clean korean e-commerce product photography",
    lightingStyle: hit.lightingStyle ?? "soft key light with gentle fill, natural shadow",
    backgroundTone: hit.backgroundTone ?? "neutral off-white seamless surface",
    colorGrading: `${grading}; ${colorMood}`,
    cameraStyle: "85mm equivalent, product-level eye height, shallow but controlled depth of field",
    visualMood: pos === "premium" ? "calm, premium, uncluttered" : "practical, trustworthy, bright",
    modelDirection:
      /의류|패션|양말|가방|마스크|뷰티|레깅스|신발/i.test(hay)
        ? "Korean model matching the product's target age, natural styling, realistic skin and hands"
        : "no human model unless the shot explicitly needs hands for scale",
  };
}

function moodWords(input: DirectionInput, preset: ColorPreset): string[] {
  const pos = pricePosition(input.price);
  const base: string[] = [];
  if (pos === "premium") base.push("절제된", "고급스러운");
  if (pos === "value") base.push("실용적인", "부담 없는");
  if (preset === "cute") base.push("부드러운", "친근한");
  if (preset === "tech" || preset === "sporty") base.push("선명한", "역동적인");
  if (preset === "natural" || preset === "warm") base.push("따뜻한", "자연스러운");
  if (!base.length) base.push("깨끗한", "믿음직한");
  return [...new Set(base)].slice(0, 4);
}

/** 상품 → 디자인 방향 전체 결정 (AI AUTO MODE) */
export function buildDesignDirection(input: DirectionInput): DesignDirection {
  const preset = input.preset ?? "auto";
  const cat = detectPreset({ name: input.name, category: input.category, description: input.description });
  const { palette, usage, rationale, mood } = buildPalette({
    name: input.name,
    category: input.category,
    brandTone: input.brandTone,
    price: input.price,
    targetCustomer: input.targetCustomer,
    productColors: input.productColors,
    preset,
  });
  const pos = pricePosition(input.price);

  return {
    category: cat.label,
    targetAudience: input.targetCustomer?.trim() || "이 카테고리를 자주 구매하는 실사용자",
    mood: moodWords(input, preset),
    colorPreset: preset,
    palette,
    colorUsage: usage,
    rationale,
    colorMoodPrompt: mood,
    visualStyle:
      pos === "premium"
        ? "여백을 크게 쓰고 장식을 줄인 편집형 레이아웃"
        : "정보가 빠르게 읽히는 한국 쇼핑몰형 레이아웃",
    layoutStyle: "full-bleed 이미지 + 좌측 정렬 텍스트, 카드 남용 없이 구획은 배경색으로 구분",
    visual: visualFor(input, mood),
    sectionStyles: assignSectionStyles(input.sections, palette),
    issues: auditPalette(palette),
    createdAt: new Date().toISOString(),
  };
}

/** 프리셋만 바꿔 다시 계산 (상품 분석 결과는 유지) */
export function reprice(direction: DesignDirection, input: DirectionInput, preset: ColorPreset): DesignDirection {
  return buildDesignDirection({ ...input, preset });
}
