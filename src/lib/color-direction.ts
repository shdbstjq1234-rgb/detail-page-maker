/**
 * 컬러 디렉팅 엔진.
 *
 * "예쁜 색"을 고르는 게 아니라 "이 상품을 팔기 좋은 색"을 전략적으로 결정한다.
 *
 *  상품 이미지에서 뽑은 실제 색  +  카테고리 판매 전략  +  가격대/타깃  +  무드 프리셋
 *      → 역할별 컬러 시스템(13종)  +  색상 사용 비율  +  대비 보정
 *
 * 원칙
 *  - 제품 색을 페이지에 도배하지 않는다. 제품이 돋보이도록 배경은 뉴트럴로 물러난다.
 *  - CTA 는 "가장 눈에 띄는 색"이어야 한다. 배경·제품과 모두 구분돼야 한다.
 *  - 보라/파랑 그라데이션 같은 AI 기본값을 쓰지 않는다. solid + 뉴트럴이 기본.
 *  - 프리셋은 고정 HEX 가 아니라 "방향"만 바꾼다. 같은 Premium 이어도 상품마다 색이 다르다.
 */

// ---------------------------------------------------------------------------
// 색 변환 · 대비 유틸

export interface Hsl {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export function hexToHsl(hex: string): Hsl {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return { h: 220, s: 10, l: 50 };
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const S = clamp(s, 0, 100) / 100;
  const L = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number] = [0, 0, 0];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = L - c / 2;
  const to = (v: number) =>
    Math.round(clamp((v + m) * 255, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`;
}

function srgbToLinear(c: number) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return 1;
  const [r, g, b] = [1, 2, 3].map((i) => srgbToLinear(parseInt(m[i], 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 명도 대비 (1 ~ 21) */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** 배경 위에 올릴 글자색 (흰색/짙은 먹) 자동 선택 */
export function textOn(bg: string, dark = "#141414", light = "#ffffff"): string {
  return contrastRatio(bg, dark) >= contrastRatio(bg, light) ? dark : light;
}

/** 목표 대비를 만족할 때까지 명도를 조정한다 */
export function ensureContrast(fg: string, bg: string, target = 4.5): string {
  if (contrastRatio(fg, bg) >= target) return fg;
  const bgLum = relativeLuminance(bg);
  const hsl = hexToHsl(fg);
  const step = bgLum > 0.4 ? -3 : 3; // 밝은 배경이면 글자를 어둡게
  let cur = { ...hsl };
  for (let i = 0; i < 34; i++) {
    cur = { ...cur, l: clamp(cur.l + step, 0, 100) };
    const hex = hslToHex(cur);
    if (contrastRatio(hex, bg) >= target) return hex;
    if (cur.l <= 0 || cur.l >= 100) break;
  }
  return textOn(bg);
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const rot = (h: number, deg: number) => (((h + deg) % 360) + 360) % 360;

// ---------------------------------------------------------------------------
// 타입

/** 역할 기반 컬러 시스템 */
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  secondaryBackground: string;
  textPrimary: string;
  textSecondary: string;
  highlight: string;
  cta: string;
  ctaText: string;
  border: string;
  darkSection: string;
  lightSection: string;
}

/** 페이지 전체 색 사용 비율 (%) */
export interface ColorUsage {
  baseNeutral: number;
  secondary: number;
  accent: number;
  cta: number;
}

export type ColorPreset =
  | "auto"
  | "premium"
  | "clean"
  | "natural"
  | "bold"
  | "minimal"
  | "warm"
  | "cool"
  | "luxury"
  | "sporty"
  | "cute"
  | "tech";

export const COLOR_PRESETS: { key: ColorPreset; label: string; hint: string }[] = [
  { key: "auto", label: "AUTO", hint: "상품 분석대로 (권장)" },
  { key: "premium", label: "Premium", hint: "채도 낮추고 대비 절제" },
  { key: "clean", label: "Clean", hint: "밝고 깨끗하게" },
  { key: "natural", label: "Natural", hint: "흙빛·자연 뉴트럴" },
  { key: "bold", label: "Bold", hint: "대비 강하게, 포인트 크게" },
  { key: "minimal", label: "Minimal", hint: "거의 무채색 + 포인트 하나" },
  { key: "warm", label: "Warm", hint: "따뜻한 뉴트럴" },
  { key: "cool", label: "Cool", hint: "차가운 뉴트럴" },
  { key: "luxury", label: "Luxury", hint: "어두운 배경 + 절제된 금속톤" },
  { key: "sporty", label: "Sporty", hint: "높은 대비 + 강한 포인트" },
  { key: "cute", label: "Cute", hint: "밝고 부드러운 파스텔" },
  { key: "tech", label: "Tech", hint: "차분한 무채색 + 선명한 포인트" },
];

/** 이미지에서 뽑은 상품 색 정보 */
export interface ProductColors {
  dominant: string;
  secondary?: string;
  accent?: string;
  neutral?: string;
  /** 0-100 */
  brightness: number;
  /** 0-100 */
  saturation: number;
  /** 따뜻함(+) ~ 차가움(-) : -100 ~ 100 */
  temperature: number;
}

interface Strategy {
  /** 배경 뉴트럴의 색온도 */
  neutralTemp: "warm" | "cool" | "neutral";
  /** 배경 뉴트럴 채도 (%) */
  neutralSat: number;
  /** 배경 밝기 */
  bgLight: number;
  /** 포인트 채도 */
  accentSat: number;
  /** CTA 결정 방식 */
  ctaMode: "product" | "complement" | "warmPush";
  /** 전체 대비 강도 */
  contrast: "soft" | "normal" | "high";
  /** 카테고리가 선호하는 hue (없으면 상품 색 사용) */
  hueBias?: number;
  usage: ColorUsage;
}

const BASE: Strategy = {
  neutralTemp: "neutral",
  neutralSat: 8,
  bgLight: 97,
  accentSat: 52,
  ctaMode: "warmPush",
  contrast: "normal",
  usage: { baseNeutral: 66, secondary: 20, accent: 9, cta: 5 },
};

/** 카테고리별 판매 전략 (고정 색이 아니라 "방향") */
const CATEGORY_STRATEGY: [RegExp, Partial<Strategy>][] = [
  [/주방|텀블러|컵|식기|조리|도마|프라이팬|냄비|도시락|보온/i, { neutralTemp: "warm", neutralSat: 12, bgLight: 96.5, accentSat: 44, contrast: "soft" }],
  [/생활|수납|정리|선반|서랍|리빙|청소|세제|욕실|수건/i, { neutralTemp: "neutral", neutralSat: 7, bgLight: 97.5, accentSat: 46, contrast: "normal" }],
  [/뷰티|스킨|화장품|코스메틱|세럼|앰플|크림|향수|미용/i, { neutralTemp: "warm", neutralSat: 10, bgLight: 97.5, accentSat: 38, contrast: "soft", ctaMode: "product" }],
  [/운동|스포츠|헬스|러닝|피트니스|요가|양말|레깅스/i, { neutralTemp: "cool", neutralSat: 6, bgLight: 96, accentSat: 68, contrast: "high", ctaMode: "complement", usage: { baseNeutral: 60, secondary: 20, accent: 13, cta: 7 } }],
  [/자동차|차량|카매트|블랙박스|거치대/i, { neutralTemp: "cool", neutralSat: 5, bgLight: 95, accentSat: 60, contrast: "high", ctaMode: "complement" }],
  [/유아|아기|키즈|육아|기저귀|문구|완구|장난감|캐릭터/i, { neutralTemp: "warm", neutralSat: 14, bgLight: 98, accentSat: 55, contrast: "soft" }],
  [/반려|강아지|고양이|펫|사료/i, { neutralTemp: "warm", neutralSat: 13, bgLight: 97.5, accentSat: 50, contrast: "soft" }],
  [/패션|의류|옷|셔츠|니트|자켓|가방|신발|지갑|잡화/i, { neutralTemp: "neutral", neutralSat: 4, bgLight: 97, accentSat: 30, contrast: "normal", ctaMode: "product" }],
  [/인테리어|가구|의자|책상|소파|침대|조명|매트/i, { neutralTemp: "warm", neutralSat: 9, bgLight: 96.5, accentSat: 34, contrast: "soft" }],
  [/가전|전자|충전|배터리|이어폰|스피커|모니터|디지털/i, { neutralTemp: "cool", neutralSat: 5, bgLight: 96.5, accentSat: 58, contrast: "high", ctaMode: "complement" }],
  [/캠핑|아웃도어|등산|낚시|텐트/i, { neutralTemp: "warm", neutralSat: 11, bgLight: 96, accentSat: 48, contrast: "normal" }],
  [/식품|간식|커피|차|건강식|영양제/i, { neutralTemp: "warm", neutralSat: 14, bgLight: 97, accentSat: 52, contrast: "normal" }],
];

/** 프리셋은 전략을 "조정"만 한다 (고정 HEX 금지) */
function applyPreset(s: Strategy, preset: ColorPreset): Strategy {
  switch (preset) {
    case "premium":
      return { ...s, accentSat: Math.round(s.accentSat * 0.55), neutralSat: Math.max(4, s.neutralSat - 2), contrast: "soft", ctaMode: "product" };
    case "clean":
      return { ...s, neutralSat: Math.max(3, s.neutralSat - 4), bgLight: 98.2, accentSat: Math.round(s.accentSat * 0.9), contrast: "normal" };
    case "natural":
      return { ...s, neutralTemp: "warm", neutralSat: s.neutralSat + 8, bgLight: 96, accentSat: Math.round(s.accentSat * 0.75), contrast: "soft" };
    case "bold":
      return { ...s, accentSat: Math.min(88, s.accentSat + 26), contrast: "high", ctaMode: "complement", usage: { baseNeutral: 56, secondary: 20, accent: 16, cta: 8 } };
    case "minimal":
      return { ...s, neutralSat: 2, accentSat: Math.round(s.accentSat * 0.5), bgLight: 98, contrast: "normal", usage: { baseNeutral: 78, secondary: 14, accent: 5, cta: 3 } };
    case "warm":
      return { ...s, neutralTemp: "warm", neutralSat: s.neutralSat + 6 };
    case "cool":
      return { ...s, neutralTemp: "cool", neutralSat: s.neutralSat + 4 };
    case "luxury":
      return { ...s, neutralTemp: "warm", neutralSat: Math.max(4, s.neutralSat - 3), bgLight: 95, accentSat: Math.round(s.accentSat * 0.5), contrast: "soft", ctaMode: "product" };
    case "sporty":
      return { ...s, neutralTemp: "cool", accentSat: Math.min(92, s.accentSat + 28), contrast: "high", ctaMode: "complement", usage: { baseNeutral: 58, secondary: 19, accent: 15, cta: 8 } };
    case "cute":
      return { ...s, neutralTemp: "warm", neutralSat: s.neutralSat + 10, bgLight: 98.4, accentSat: Math.min(72, s.accentSat + 8), contrast: "soft" };
    case "tech":
      return { ...s, neutralTemp: "cool", neutralSat: 3, bgLight: 96.5, accentSat: Math.min(84, s.accentSat + 18), contrast: "high", ctaMode: "complement" };
    default:
      return s;
  }
}

/** 상품명·카테고리로 hue 를 추정 (이미지 색이 없을 때의 폴백) */
const HUE_FALLBACK: [RegExp, number][] = [
  [/뷰티|스킨|화장품|향수/i, 18],
  [/캠핑|아웃도어|등산/i, 118],
  [/운동|스포츠|러닝|헬스/i, 212],
  [/가전|전자|테크|디지털/i, 218],
  [/주방|식기|조리/i, 196],
  [/반려|강아지|고양이/i, 30],
  [/유아|아기|키즈/i, 340],
  [/침구|수면|이불/i, 250],
  [/식품|간식|커피/i, 26],
];

function pickStrategy(hay: string, preset: ColorPreset): Strategy {
  const hit = CATEGORY_STRATEGY.find(([re]) => re.test(hay));
  const merged: Strategy = { ...BASE, ...(hit ? hit[1] : {}) };
  return applyPreset(merged, preset);
}

export interface PaletteInput {
  name?: string;
  category?: string;
  brandTone?: string;
  price?: number;
  targetCustomer?: string;
  /** 업로드 이미지에서 추출한 실제 상품 색 */
  productColors?: ProductColors;
  preset?: ColorPreset;
}

export interface PaletteResult {
  palette: ColorPalette;
  usage: ColorUsage;
  /** 이 색을 왜 골랐는지 (사용자에게 보여줄 한 줄) */
  rationale: string;
  /** 이미지 생성 프롬프트에 넣을 색·무드 서술 */
  mood: string;
  preset: ColorPreset;
}

/**
 * 역할 기반 컬러 시스템 생성.
 * 제품 색은 "강조"에만 쓰고 배경은 뉴트럴로 물러나게 한다.
 */
export function buildPalette(input: PaletteInput): PaletteResult {
  const preset = input.preset ?? "auto";
  const hay = `${input.category ?? ""} ${input.name ?? ""} ${input.brandTone ?? ""} ${input.targetCustomer ?? ""}`;
  const st = pickStrategy(hay, preset);

  // 1) 상품의 기준 hue — 이미지에서 뽑은 색 우선, 없으면 카테고리 추정
  const pc = input.productColors;
  let baseHue: number;
  let productChroma: number;
  if (pc && pc.saturation >= 12) {
    const h = hexToHsl(pc.dominant);
    baseHue = h.h;
    productChroma = h.s;
  } else {
    baseHue = st.hueBias ?? HUE_FALLBACK.find(([re]) => re.test(hay))?.[1] ?? 214;
    productChroma = pc ? Math.max(pc.saturation, 18) : 40;
  }
  // 제품이 거의 무채색(흰/검/회)이면 뉴트럴 제품으로 보고 포인트를 따로 만든다
  const productIsNeutral = productChroma < 14;

  // 2) 배경 뉴트럴 — 제품 hue 를 아주 살짝만 머금은 오프화이트
  const neutralHue =
    st.neutralTemp === "warm" ? blendHue(baseHue, 32, 0.75) : st.neutralTemp === "cool" ? blendHue(baseHue, 214, 0.75) : baseHue;
  const bgSat = st.neutralSat;
  const background = hslToHex({ h: neutralHue, s: bgSat, l: st.bgLight });
  const secondaryBackground = hslToHex({ h: neutralHue, s: bgSat + 3, l: st.bgLight - 3.5 });
  const lightSection = hslToHex({ h: neutralHue, s: Math.max(0, bgSat - 3), l: Math.min(99, st.bgLight + 1.5) });

  // 3) primary — 제품 hue 의 깊은 버전 (제품이 무채색이면 뉴트럴 딥톤)
  const primarySat = productIsNeutral ? Math.max(6, st.neutralSat + 4) : clamp(productChroma * 0.62, 22, 58);
  const primaryLight = st.contrast === "high" ? 26 : st.contrast === "soft" ? 34 : 30;
  const primary = hslToHex({ h: baseHue, s: primarySat, l: primaryLight });

  // 4) secondary — 배경과 primary 사이의 중간 뉴트럴 (카드/보조면)
  const secondary = hslToHex({ h: neutralHue, s: clamp(bgSat + 6, 4, 26), l: 82 });

  // 5) accent — 제품을 설명하는 포인트색.
  //    제품이 무채색이면 카테고리 성격에 맞는 hue 를 쓴다 (기계적 회전은 보라/남색으로 흘러 AI 티가 난다).
  const accentHue = avoidBannedHue(
    productIsNeutral ? (st.hueBias ?? HUE_FALLBACK.find(([re]) => re.test(hay))?.[1] ?? 210) : baseHue,
  );
  const accent = hslToHex({ h: accentHue, s: st.accentSat, l: st.contrast === "high" ? 46 : 50 });

  // 6) CTA — 페이지에서 가장 눈에 띄어야 한다.
  //    검증된 커머스 버튼 색군(주황·주홍·진빨강)에서 고르되 포인트색과 가장 멀리 떨어진 것을 쓴다.
  //    라임/노랑(가독성 나쁨)·보라(AI 클리셰)로는 절대 가지 않는다.
  const { cta, ctaText } = pickCta({ accentHue, baseHue, background, sat: st.accentSat, mode: st.ctaMode, contrast: st.contrast });

  // 7) 텍스트 — 배경 대비 기준으로 확정
  const textPrimary = ensureContrast(hslToHex({ h: neutralHue, s: Math.min(14, bgSat + 4), l: 12 }), background, 12);
  const textSecondary = ensureContrast(hslToHex({ h: neutralHue, s: Math.min(12, bgSat + 2), l: 44 }), background, 4.6);

  // 8) 나머지 역할
  const border = hslToHex({ h: neutralHue, s: clamp(bgSat + 2, 3, 20), l: st.bgLight - 9 });
  const darkSection = hslToHex({ h: neutralHue, s: clamp(bgSat + 6, 6, 22), l: preset === "luxury" ? 9 : 12 });
  const highlight = hslToHex({ h: avoidBannedHue(rot(accentHue, 26)), s: clamp(st.accentSat + 22, 50, 92), l: 72 });

  const palette: ColorPalette = {
    primary,
    secondary,
    accent,
    background,
    secondaryBackground,
    textPrimary,
    textSecondary,
    highlight,
    cta,
    ctaText,
    border,
    darkSection,
    lightSection,
  };

  return {
    palette,
    usage: st.usage,
    preset,
    rationale: rationaleFor({ productIsNeutral, st, preset, hasImage: Boolean(pc) }),
    mood: moodFor(st, baseHue, preset),
  };
}

function blendHue(a: number, b: number, tTowardB: number): number {
  // 원형 보간
  let d = ((b - a + 540) % 360) - 180;
  return rot(a, d * tTowardB);
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * 포인트색으로 쓰면 안 되는 hue 대역.
 *  245~295 : 보라/바이올렛 — AI 생성물 특유의 기본값. 상품과 무관하게 나오면 티가 난다.
 *  62~92   : 라임/연두 — 버튼·강조로 쓰면 싸구려로 보이고 흰 글씨 가독성이 나쁘다.
 */
const BANNED_HUE_BANDS: [number, number][] = [
  [245, 295],
  [62, 92],
];

function avoidBannedHue(h: number): number {
  for (const [lo, hi] of BANNED_HUE_BANDS) {
    if (h >= lo && h <= hi) {
      // 가까운 쪽 경계 밖으로 밀어낸다
      return h - lo < hi - h ? rot(lo, -8) : rot(hi, 8);
    }
  }
  return h;
}

/** 실제 쇼핑몰 구매 버튼에서 검증된 색군 (주홍·주황·진빨강·딥레드) */
const CTA_HUES = [12, 22, 32, 352, 4];

/**
 * CTA 색 결정.
 *  - 제품이 이미 강한 따뜻한 색이면 그 색을 진하게 눌러 쓴다 (브랜드 일관성).
 *  - 아니면 검증된 버튼 색군에서 포인트색과 가장 멀리 떨어진 hue 를 고른다.
 *  - 마지막에 배경 대비를 4.0 이상으로 보정한다.
 */
function pickCta(a: {
  accentHue: number;
  baseHue: number;
  background: string;
  sat: number;
  mode: Strategy["ctaMode"];
  contrast: Strategy["contrast"];
}): { cta: string; ctaText: string } {
  const productIsWarmStrong = hueDistance(a.baseHue, 18) < 26 || hueDistance(a.baseHue, 352) < 22;
  let hue: number;
  if (a.mode === "product" && productIsWarmStrong) {
    hue = a.baseHue;
  } else {
    // 포인트색에서 가장 멀리 떨어진 버튼 색
    hue = CTA_HUES.reduce((best, h) =>
      hueDistance(h, a.accentHue) > hueDistance(best, a.accentHue) ? h : best,
    CTA_HUES[0]);
  }
  hue = avoidBannedHue(hue);
  const sat = clamp(a.sat + 20, 52, 86);
  let light = a.contrast === "high" ? 44 : 42;
  let cta = hslToHex({ h: hue, s: sat, l: light });
  // 배경에서 확실히 튀도록 (버튼은 4.0 이상)
  for (let i = 0; i < 14 && contrastRatio(cta, a.background) < 4; i++) {
    light -= 3;
    cta = hslToHex({ h: hue, s: sat, l: Math.max(18, light) });
  }
  // 버튼 글자(흰색 기준)가 확실히 읽히도록 버튼을 더 눌러준다.
  // 주황 계열은 중간 명도에서 흰 글씨 대비가 애매해지므로 여기서 확정한다.
  for (let i = 0; i < 16 && contrastRatio("#ffffff", cta) < 4.5; i++) {
    light -= 3;
    if (light < 14) break;
    cta = hslToHex({ h: hue, s: sat, l: light });
  }
  const ctaText = textOn(cta);
  return { cta, ctaText };
}

function rationaleFor(a: { productIsNeutral: boolean; st: Strategy; preset: ColorPreset; hasImage: boolean }): string {
  const src = a.hasImage ? "업로드한 상품 사진의 실제 색" : "상품 카테고리";
  const bg = a.st.neutralTemp === "warm" ? "따뜻한 오프화이트" : a.st.neutralTemp === "cool" ? "서늘한 오프화이트" : "중립 오프화이트";
  const ctaWord = a.st.ctaMode === "complement" ? "제품 색의 보색" : a.st.ctaMode === "product" ? "제품 색을 진하게 눌러" : "따뜻한 강조색";
  const neutralNote = a.productIsNeutral ? " 제품이 무채색이라 포인트 색을 따로 만들었습니다." : "";
  return `${src}을 기준으로 배경은 ${bg}로 물러나게 하고, 구매 버튼은 ${ctaWord}으로 가장 눈에 띄게 잡았습니다.${neutralNote}`;
}

function moodFor(st: Strategy, hue: number, preset: ColorPreset): string {
  const temp = st.neutralTemp === "warm" ? "warm neutral" : st.neutralTemp === "cool" ? "cool neutral" : "balanced neutral";
  const con = st.contrast === "high" ? "high contrast, punchy" : st.contrast === "soft" ? "soft low-contrast, calm" : "clean moderate contrast";
  const tone =
    preset === "luxury" ? "restrained luxury" : preset === "cute" ? "soft friendly" : preset === "tech" ? "precise technical" : "korean e-commerce commercial";
  return `${temp} background, ${con}, ${tone}, base hue ${Math.round(hue)}`;
}

// ---------------------------------------------------------------------------
// 섹션 컬러 흐름

export type SectionIntensity = "quiet" | "base" | "emphasis" | "dark" | "cta";

export interface SectionStyle {
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  highlightColor: string;
  buttonColor: string;
  buttonTextColor: string;
  borderColor: string;
  /** 시각 강도 0-100 (전체 리듬 확인용) */
  visualIntensity: number;
  contrastLevel: "low" | "medium" | "high";
}

/** 섹션 목적 → 색 강도. 모든 섹션이 똑같이 화려하면 안 된다. */
export const SECTION_INTENSITY: Record<string, SectionIntensity> = {
  hero: "dark",
  usp: "emphasis",
  problem: "dark",
  solution: "base",
  feature: "quiet",
  featureDetail: "base",
  lifestyle: "quiet",
  comparison: "emphasis",
  detail: "base",
  howToUse: "quiet",
  productInfo: "quiet",
  review: "base",
  cta: "cta",
};

export function styleFor(p: ColorPalette, intensity: SectionIntensity): SectionStyle {
  const common = {
    accentColor: p.accent,
    highlightColor: p.highlight,
    buttonColor: p.cta,
    buttonTextColor: p.ctaText,
  };
  switch (intensity) {
    case "dark":
      return {
        ...common,
        backgroundColor: p.darkSection,
        textColor: "#ffffff",
        mutedColor: "rgba(255,255,255,0.58)",
        borderColor: "rgba(255,255,255,0.12)",
        visualIntensity: 85,
        contrastLevel: "high",
      };
    case "cta":
      return {
        ...common,
        backgroundColor: p.darkSection,
        textColor: "#ffffff",
        mutedColor: "rgba(255,255,255,0.55)",
        borderColor: "rgba(255,255,255,0.14)",
        visualIntensity: 100,
        contrastLevel: "high",
      };
    case "emphasis":
      return {
        ...common,
        backgroundColor: p.secondaryBackground,
        textColor: p.textPrimary,
        mutedColor: p.textSecondary,
        borderColor: p.border,
        visualIntensity: 60,
        contrastLevel: "medium",
      };
    case "quiet":
      return {
        ...common,
        backgroundColor: p.lightSection,
        textColor: p.textPrimary,
        mutedColor: p.textSecondary,
        borderColor: p.border,
        visualIntensity: 20,
        contrastLevel: "low",
      };
    default:
      return {
        ...common,
        backgroundColor: p.background,
        textColor: p.textPrimary,
        mutedColor: p.textSecondary,
        borderColor: p.border,
        visualIntensity: 38,
        contrastLevel: "medium",
      };
  }
}

/**
 * 페이지 전체 컬러 리듬 배정.
 * 같은 강도가 연속되지 않게, 어두운 섹션이 몰리지 않게 조정한다.
 */
export function assignSectionStyles(
  sections: { id: string; type: string }[],
  palette: ColorPalette,
): Record<string, SectionStyle> {
  const out: Record<string, SectionStyle> = {};
  let prev: SectionIntensity | null = null;
  let darkRun = 0;
  sections.forEach((s, i) => {
    let intensity = SECTION_INTENSITY[s.type] ?? "base";
    const isDark = intensity === "dark" || intensity === "cta";
    if (isDark) {
      darkRun += 1;
      // 어두운 섹션이 연속 2개를 넘으면 하나를 밝게 내린다 (hero/cta 는 유지)
      if (darkRun > 1 && s.type !== "hero" && s.type !== "cta") {
        intensity = "emphasis";
        darkRun = 0;
      }
    } else {
      darkRun = 0;
      // 같은 강도가 연달아 나오면 한 단계 낮춰 리듬을 만든다
      if (prev === intensity) intensity = intensity === "quiet" ? "base" : "quiet";
    }
    out[s.id] = styleFor(palette, intensity);
    prev = intensity;
    void i;
  });
  return out;
}

/** CSS 변수로 변환 (렌더러 루트 주입) */
export function paletteVars(p: ColorPalette | undefined): Record<string, string> {
  if (!p) return {};
  return {
    "--dp-primary": p.primary,
    "--dp-secondary": p.secondary,
    "--dp-accent": p.accent,
    "--dp-bg": p.background,
    "--dp-bg-alt": p.secondaryBackground,
    "--dp-surface": p.lightSection,
    "--dp-text": p.textPrimary,
    "--dp-muted": p.textSecondary,
    "--dp-highlight": p.highlight,
    "--dp-cta": p.cta,
    "--dp-cta-text": p.ctaText,
    "--dp-border": p.border,
    "--dp-dark": p.darkSection,
    "--dp-light": p.lightSection,
  };
}

/** 팔레트 품질 자가 검수 */
export function auditPalette(p: ColorPalette): string[] {
  const issues: string[] = [];
  if (contrastRatio(p.textPrimary, p.background) < 7) issues.push("본문 글자와 배경 대비가 약합니다.");
  if (contrastRatio(p.ctaText, p.cta) < 4.5) issues.push("CTA 버튼 글자 대비가 부족합니다.");
  if (contrastRatio(p.cta, p.background) < 3) issues.push("CTA 버튼이 배경에서 충분히 튀지 않습니다.");
  if (hexToHsl(p.background).s > 22) issues.push("배경 채도가 높아 제품이 묻힐 수 있습니다.");
  const accentH = hexToHsl(p.accent);
  if (accentH.s > 88) issues.push("포인트 색 채도가 지나치게 높습니다.");
  if (hueDistance(hexToHsl(p.cta).h, accentH.h) < 12) issues.push("CTA 와 포인트 색이 거의 같아 버튼이 눈에 덜 띕니다.");
  return issues;
}
