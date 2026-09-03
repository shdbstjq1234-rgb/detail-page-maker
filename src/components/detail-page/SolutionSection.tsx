import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub, Bullets, Figure, pickImage } from "./_shared";

export function SolutionSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const img = pickImage(images, "featureExplainer", "detailCloseup", "structure", "lifestyle");

  return (
    <SectionShell tone="light">
      <Eyebrow>SOLUTION</Eyebrow>
      <Headline>{copy.headline}</Headline>
      {copy.subheadline && <Sub>{copy.subheadline}</Sub>}

      {img && (
        <div className="mt-8 overflow-hidden rounded-2xl">
          <Figure image={img} ratio="4/5" rounded={false} />
        </div>
      )}

      {copy.bullets && <Bullets items={copy.bullets} variant="check" />}
      {copy.body && <p className="mt-6 text-[14px] leading-[1.8] text-ink-soft">{copy.body}</p>}
    </SectionShell>
  );
}
