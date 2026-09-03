import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, SectionMedia, useSectionLayout } from "./_shared";

export function ProblemSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const o = useSectionLayout();
  const media = o?.media ?? "full";

  return (
    <SectionShell tone="dark">
      <Eyebrow>이런 적, 있으셨죠</Eyebrow>
      <Headline className="text-white">{copy.headline}</Headline>
      {copy.subheadline && <p className="mt-4 max-w-[620px] text-[17px] leading-[1.75] text-white/55">{copy.subheadline}</p>}

      {copy.bullets && (
        <ul className="mt-8 space-y-0">
          {copy.bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-3 border-b border-white/10 py-5 text-[18px] leading-relaxed text-white/80 last:border-0"
            >
              <span aria-hidden className="text-[22px] leading-none text-white/25">
                “
              </span>
              {b}
            </li>
          ))}
        </ul>
      )}

      <SectionMedia images={images} layout={media === "auto" ? "full" : media} ratio="4/5" />
    </SectionShell>
  );
}
