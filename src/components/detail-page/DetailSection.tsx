import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub, Bullets, Figure } from "./_shared";

export function DetailSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const imgs = images.length ? images : [];

  return (
    <SectionShell tone="light">
      <Eyebrow>DETAILS</Eyebrow>
      <Headline>{copy.headline}</Headline>
      {copy.subheadline && <Sub>{copy.subheadline}</Sub>}

      {imgs.length <= 1 ? (
        <div className="mt-8 overflow-hidden rounded-2xl">
          <Figure image={imgs[0]} ratio="4/5" rounded={false} />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-2.5">
          {imgs.slice(0, 4).map((im, i) => (
            <div key={i} className="overflow-hidden rounded-2xl">
              <Figure image={im} ratio="1/1" rounded={false} />
            </div>
          ))}
        </div>
      )}

      {copy.bullets && <Bullets items={copy.bullets} variant="plain" />}
    </SectionShell>
  );
}
