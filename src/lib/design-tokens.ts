/**
 * 상품별 Color Design Token.
 * 카테고리/상품명 키워드 → 기준 색상(hue) → HSL 스케일로 팔레트를 만든다.
 * 하드코딩된 고정 팔레트를 모든 상품에 쓰지 않는다. (spec #11)
 */

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
  } as React.CSSProperties;
}
