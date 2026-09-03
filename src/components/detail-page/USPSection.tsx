import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub, StatRow, Bullets, Figure, pickImage } from "./_shared";

export function USPSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const img = pickImage(images, "infographic", "productCutout", "featureExplainer");

  return (
    <SectionShell tone="gray">
      <Eyebrow>숫자로 보는 핵심</Eyebrow>
      <Headline>{copy.headline}</Headline>
      {copy.subheadline && <Sub>{copy.subheadline}</Sub>}

      {copy.stats && copy.stats.length > 0 && (
        <div className="mt-8">
          <StatRow stats={copy.stats} />
        </div>
      )}

      {copy.bullets && copy.bullets.length > 0 && <Bullets items={copy.bullets} variant="card" />}

      {img && (
        <div className="mt-8">
          <Figure image={img} ratio="1/1" />
        </div>
      )}
    </SectionShell>
  );
}
