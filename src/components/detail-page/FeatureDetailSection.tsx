import type { DetailSectionData } from "@/types/detail-page";
import {
  SectionShell,
  Eyebrow,
  Headline,
  Sub,
  StatRow,
  Bullets,
  SectionMedia,
  useSectionLayout,
} from "./_shared";

export function FeatureDetailSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const o = useSectionLayout();
  const media = o?.media ?? "full";

  const aside =
    media === "split" ? (
      <>
        {copy.body && <p className="text-[14px] leading-[1.85] text-ink-soft">{copy.body}</p>}
        {copy.bullets && <Bullets items={copy.bullets} variant="plain" />}
      </>
    ) : undefined;

  return (
    <SectionShell tone="light">
      <Eyebrow>IN DETAIL</Eyebrow>
      <Headline>{copy.headline}</Headline>
      {copy.subheadline && <Sub>{copy.subheadline}</Sub>}

      <SectionMedia images={images} layout={media} ratio="3/4" aside={aside} />

      {copy.stats && copy.stats.length > 0 && (
        <div className="mt-8">
          <StatRow stats={copy.stats} />
        </div>
      )}

      {media !== "split" && (
        <>
          {copy.body && <p className="mt-6 text-[14px] leading-[1.85] text-ink-soft">{copy.body}</p>}
          {copy.bullets && <Bullets items={copy.bullets} variant="plain" />}
        </>
      )}
    </SectionShell>
  );
}
