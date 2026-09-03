/**
 * 상품별 Color Design Token.
 * 카테고리/상품명 키워드 → 기준 색상(hue) → HSL 스케일로 팔레트를 만든다.
 * 하드코딩된 고정 팔레트를 모든 상품에 쓰지 않는다. (spec #11)
 */

export type TypePreset = "modern" | "sporty" | "premium" | "living" | "cute" | "minimal";

/**
 * 타이포그래피 토큰. 폰트는 Pretendard 1개로 고정하고(한글 가독성 우선)
 * 굵기·자간·행간·크기 배율만 프리셋으로 바꿔 위계를 만든다. (spec: 폰트보다 굵기·크기 차이)
 */
export interface TypeTokens {
  preset: TypePreset;
  headlineWeight: number;
  headlineTracking: string;
  headlineLeading: number;
  bodyLeading: number;
  /** 헤드라인 전체 크기 배율 */
  scale: number;
}

export interface DesignTokens {
  primary: string;
  accent: string;
  bg: string;
  bgAlt: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  dark: string;
  /** 이미지 프롬프트에 넣을 색·무드 서술 */
  mood: string;
  /** 타이포그래피 프리셋 */
  type?: TypeTokens;
}

const TYPE_PRESETS: Record<TypePreset, Omit<TypeTokens, "preset">> = {
  modern: { headlineWeight: 800, headlineTracking: "-0.02em", headlineLeading: 1.32, bodyLeading: 1.75, scale: 1 },
  sporty: { headlineWeight: 900, headlineTracking: "-0.035em", headlineLeading: 1.2, bodyLeading: 1.7, scale: 1.08 },
  premium: { headlineWeight: 700, headlineTracking: "-0.008em", headlineLeading: 1.36, bodyLeading: 1.88, scale: 1 },
  living: { headlineWeight: 800, headlineTracking: "-0.018em", headlineLeading: 1.3, bodyLeading: 1.8, scale: 1 },
  cute: { headlineWeight: 800, headlineTracking: "0em", headlineLeading: 1.3, bodyLeading: 1.76, scale: 1.02 },
  minimal: { headlineWeight: 650, headlineTracking: "-0.01em", headlineLeading: 1.4, bodyLeading: 1.9, scale: 0.96 },
};

export function typeTokens(preset: TypePreset): TypeTokens {
  return { preset, ...TYPE_PRESETS[preset] };
}

export function deriveTypography(input: { name?: string; category?: string; brandTone?: string }): TypeTokens {
  const hay = `${input.category ?? ""} ${input.name ?? ""} ${input.brandTone ?? ""}`;
  let preset: TypePreset = "modern";
  if (/프리미엄|럭셔리|고급|미니멀|minimal|luxury/i.test(input.brandTone ?? "")) preset = "premium";
  else if (/러닝|운동|스포츠|헬스|피트니스|아웃도어|캠핑|등산/i.test(hay)) preset = "sporty";
  else if (/뷰티|스킨|화장품|코스메틱|향수|세럼|앰플/i.test(hay)) preset = "premium";
  else if (/주방|수납|정리|생활|리빙|청소|침구|욕실/i.test(hay)) preset = "living";
  else if (/유아|아기|키즈|육아|문구|완구|장난감|캐릭터|반려|강아지|고양이/i.test(hay)) preset = "cute";
  return typeTokens(preset);
}

const HUE_BY_KEYWORD: [RegExp, number, string][] = [
  [/뷰티|스킨|화장품|코스메틱|세럼|앰플|크림|립|향수/i, 18, "warm nude, soft beige, clean skincare mood"],
  [/캠핑|아웃도어|등산|낚시|텐트|의자|돗자리|바베큐/i, 122, "earthy khaki, forest green, rugged outdoor mood"],
  [/러닝|운동|헬스|스포츠|요가|피트니스|양말|레깅스/i, 210, "energetic blue, cool sporty mood"],
  [/가전|전자|충전|배터리|이어폰|스피커|가습기|청소기|모니터/i, 220, "cool tech grey-blue, minimal premium mood"],
  [/주방|텀블러|컵|식기|조리|프라이팬|도마|보온/i, 200, "clean stainless, calm blue-grey kitchen mood"],
  [/반려|강아지|고양이|펫|사료|장난감/i, 32, "warm friendly amber, cozy pet mood"],
  [/유아|아기|키즈|육아|기저귀/i, 340, "soft pastel pink, gentle baby mood"],
  [/침구|이불|베개|매트리스|수면|잠옷|홈웨어/i, 250, "muted lavender, calm bedroom mood"],
  [/food|식품|간식|커피|차|건강식|영양제/i, 28, "appetizing warm brown, natural food mood"],
  [/패션|의류|옷|셔츠|니트|자켓|가방|신발/i, 0, "editorial neutral, high-contrast fashion mood"],
];

function hsl(h: number, s: number, l: number) {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

export function deriveTokens(input: { name?: string; category?: string; brandTone?: string }): DesignTokens {
  const hay = `${input.category ?? ""} ${input.name ?? ""} ${input.brandTone ?? ""}`;
  const hit = HUE_BY_KEYWORD.find(([re]) => re.test(hay));
  const hue = hit ? hit[1] : 220;
  const mood = hit ? hit[2] : "clean minimal, neutral premium mood";

  // 브랜드 톤 보정
  const premium = /프리미엄|럭셔리|고급|미니멀|minimal|luxury/i.test(input.brandTone ?? "");
  const sat = premium ? 32 : 58;

  return {
    primary: hsl(hue, sat + 8, 34),
    accent: hsl((hue + 14) % 360, sat + 18, 52),
    bg: hsl(hue, 12, 97),
    bgAlt: hsl(hue, 10, 94),
    surface: "#ffffff",
    text: hsl(hue, 12, 12),
    textMuted: hsl(hue, 8, 42),
    border: hsl(hue, 12, 88),
    dark: hsl(hue, 16, 12),
    mood,
    type: deriveTypography(input),
  };
}

/** CSS 변수 객체 (renderer 루트에 style로 주입) */
export function tokenVars(t: DesignTokens | undefined): React.CSSProperties {
  if (!t) return {};
  return {
    ["--dp-primary" as string]: t.primary,
    ["--dp-accent" as string]: t.accent,
    ["--dp-bg" as string]: t.bg,
    ["--dp-bg-alt" as string]: t.bgAlt,
    ["--dp-surface" as string]: t.surface,
    ["--dp-text" as string]: t.text,
    ["--dp-muted" as string]: t.textMuted,
    ["--dp-border" as string]: t.border,
    ["--dp-dark" as string]: t.dark,
    ["--dp-h-weight" as string]: String(t.type?.headlineWeight ?? 800),
    ["--dp-h-tracking" as string]: t.type?.headlineTracking ?? "-0.02em",
    ["--dp-h-leading" as string]: String(t.type?.headlineLeading ?? 1.32),
    ["--dp-body-leading" as string]: String(t.type?.bodyLeading ?? 1.75),
    ["--dp-h-scale" as string]: String(t.type?.scale ?? 1),
  } as React.CSSProperties;
}
