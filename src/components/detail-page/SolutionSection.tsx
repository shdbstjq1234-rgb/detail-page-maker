import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub, Bullets, SectionMedia, useSectionLayout } from "./_shared";

export function SolutionSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const o = useSectionLayout();
  const media = o?.media ?? "full";

  const aside =
    media === "split" ? (
      <>
        {copy.bullets && <Bullets items={copy.bullets} variant="check" />}
        {copy.body && <p className="mt-4 text-[14px] leading-[1.8] text-ink-soft">{copy.body}</p>}
      </>
    ) : undefined;

  return (
    <SectionShell tone="light">
      <Eyebrow>SOLUTION</Eyebrow>
      <Headline>{copy.headline}</Headline>
      {copy.subheadline && <Sub>{copy.subheadline}</Sub>}

      <SectionMedia images={images} layout={media} ratio="4/5" aside={aside} />

      {media !== "split" && (
        <>
          {copy.bullets && <Bullets items={copy.bullets} variant="check" />}
          {copy.body && <p className="mt-6 text-[14px] leading-[1.8] text-ink-soft">{copy.body}</p>}
        </>
      )}
    </SectionShell>
  );
}
