import type {
  ProductInput,
  ProductAnalysis,
  USPSet,
  PagePlan,
  SectionCopy,
  SelectedImage,
  DetailPage,
  DetailSectionData,
  DetailImage,
  ImageProviderName,
} from "@/types/detail-page";

/**
 * 카피 + 선택된 이미지 → 최종 DetailPage 데이터로 조립.
 * plan.sections 순서를 그대로 최종 순서로 사용한다.
 */
export function assembleDetailPage(args: {
  input: ProductInput;
  analysis: ProductAnalysis;
  usp: USPSet;
  plan: PagePlan;
  copies: SectionCopy[];
  selected: SelectedImage[];
  llmModel: string;
  imageProvider: ImageProviderName;
}): DetailPage {
  const { input, analysis, usp, plan, copies, selected, llmModel, imageProvider } = args;

  const copyById = new Map(copies.map((c) => [c.sectionId, c]));
  const imagesBySection = new Map<string, DetailImage[]>();
  for (const sel of selected) {
    const list = imagesBySection.get(sel.sectionId) ?? [];
    list.push({
      url: sel.chosen.url,
      width: sel.chosen.width,
      height: sel.chosen.height,
      alt: `${input.name} ${sel.role}`,
      role: sel.role,
    });
    imagesBySection.set(sel.sectionId, list);
  }

  const sections: DetailSectionData[] = plan.sections.map((s) => ({
    id: s.id,
    type: s.type,
    copy: copyById.get(s.id) ?? { sectionId: s.id, type: s.type, headline: s.message },
    images: imagesBySection.get(s.id) ?? [],
  }));

  return {
    product: input,
    analysis,
    usp,
    plan,
    sections,
    meta: {
      generatedAt: new Date().toISOString(),
      llmModel,
      imageProvider,
    },
  };
}
