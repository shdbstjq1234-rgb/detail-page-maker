import type { CSSProperties, ReactNode } from "react";
import type { DetailPage, DetailSectionData, SectionType } from "@/types/detail-page";
import { tokenVars, type DesignTokens } from "@/lib/design-tokens";
import { SectionColorContext, SectionLayoutContext, SectionStepContext, type SectionColors, type SectionLayoutOverride } from "./_shared";
import { paletteVars, type ColorPalette } from "@/lib/color-direction";
import { HeroSection } from "./HeroSection";
import { USPSection } from "./USPSection";
import { ProblemSection } from "./ProblemSection";
import { SolutionSection } from "./SolutionSection";
import { FeatureSection } from "./FeatureSection";
import { FeatureDetailSection } from "./FeatureDetailSection";
import { LifestyleSection } from "./LifestyleSection";
import { ComparisonSection } from "./ComparisonSection";
import { DetailSection } from "./DetailSection";
import { HowToUseSection } from "./HowToUseSection";
import { ProductInfoSection } from "./ProductInfoSection";
import { ReviewSection } from "./ReviewSection";
import { CTASection } from "./CTASection";

export const SECTION_MAP: Record<SectionType, (p: { data: DetailSectionData }) => ReactNode> = {
  hero: HeroSection,
  usp: USPSection,
  problem: ProblemSection,
  solution: SolutionSection,
  feature: FeatureSection,
  featureDetail: FeatureDetailSection,
  lifestyle: LifestyleSection,
  comparison: ComparisonSection,
  detail: DetailSection,
  howToUse: HowToUseSection,
  productInfo: ProductInfoSection,
  review: ReviewSection,
  cta: CTASection,
};

/** 순번(01, 02 …)을 붙이지 않는 섹션 */
const NO_STEP = new Set<SectionType>(["hero", "cta"]);

/** page.sections → 섹션별 표시 순번 맵 */
export function stepMap(sections: { id: string; type: SectionType }[]): Record<string, number> {
  const out: Record<string, number> = {};
  let n = 0;
  for (const s of sections) {
    if (NO_STEP.has(s.type)) continue;
    out[s.id] = ++n;
  }
  return out;
}

export type RendererSection = DetailSectionData & { layout?: SectionLayoutOverride };

/** 섹션 하나를 레이아웃 오버라이드 + 순번과 함께 렌더 (편집 크롬 없음) */
export function RenderedSection({
  data,
  step,
  colors,
}: {
  data: RendererSection;
  step?: number | null;
  colors?: SectionColors | null;
}) {
  const Comp = SECTION_MAP[data.type] ?? SolutionSection;
  return (
    <SectionColorContext.Provider value={colors ?? null}>
      <SectionLayoutContext.Provider value={data.layout ?? null}>
        <SectionStepContext.Provider value={step ?? null}>
          <Comp data={data} />
        </SectionStepContext.Provider>
      </SectionLayoutContext.Provider>
    </SectionColorContext.Provider>
  );
}

/**
 * 상세페이지 순수 렌더 (편집 크롬 없음).
 * Export(이미지 저장) 및 미리보기 모드에서 사용한다.
 */
export function DetailPageRenderer({
  page,
}: {
  page: {
    sections: RendererSection[];
    designTokens?: DesignTokens;
    /** 컬러 디렉팅 결과 (있으면 섹션별 색을 이걸로 칠한다) */
    palette?: ColorPalette;
    sectionStyles?: Record<string, SectionColors>;
  };
}) {
  const steps = stepMap(page.sections);
  const rootStyle = {
    ...(tokenVars(page.designTokens) as CSSProperties),
    ...(paletteVars(page.palette) as CSSProperties),
    ...(page.palette ? { background: page.palette.background, color: page.palette.textPrimary } : {}),
  } as CSSProperties;
  return (
    <article
      className={`w-full font-sans antialiased ${page.palette ? "" : "bg-white text-ink"}`}
      style={rootStyle}
    >
      {page.sections.map((s) => (
        <RenderedSection key={s.id} data={s} step={steps[s.id]} colors={page.sectionStyles?.[s.id] ?? null} />
      ))}
    </article>
  );
}
