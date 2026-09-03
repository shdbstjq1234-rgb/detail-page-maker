import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub, StatRow, Bullets, Figure, pickImage } from "./_shared";

export function FeatureDetailSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const img = pickImage(images, "detailCloseup", "structure", "featureExplainer");

  return (
    <SectionShell tone="light">
      <Eyebrow>IN DETAIL</Eyebrow>
      <Headline>{copy.headline}</Headline>
      {copy.subheadline && <Sub>{copy.subheadline}</Sub>}

      {img && (
        <div className="mt-8 overflow-hidden rounded-2xl">
          <Figure image={img} ratio="3/4" rounded={false} />
        </div>
      )}

      {copy.stats && copy.stats.length > 0 && (
        <div className="mt-8">
          <StatRow stats={copy.stats} />
        </div>
      )}

      {copy.body && <p className="mt-6 text-[14px] leading-[1.85] text-ink-soft">{copy.body}</p>}
      {copy.bullets && <Bullets items={copy.bullets} variant="plain" />}
    </SectionShell>
  );
}
