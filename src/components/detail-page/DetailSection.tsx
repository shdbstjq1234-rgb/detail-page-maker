import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub, Bullets, SectionMedia, useSectionLayout } from "./_shared";

export function DetailSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const o = useSectionLayout();
  // 디테일 컷은 여러 장을 보여주는 게 기본
  const media = o?.media ?? (images.length >= 3 ? "grid3" : images.length === 2 ? "grid2" : "full");

  return (
    <SectionShell tone="light">
      <Eyebrow>DETAILS</Eyebrow>
      <Headline>{copy.headline}</Headline>
      {copy.subheadline && <Sub>{copy.subheadline}</Sub>}

      <SectionMedia images={images} layout={media} ratio="4/5" />

      {copy.bullets && <Bullets items={copy.bullets} variant="plain" />}
    </SectionShell>
  );
}
