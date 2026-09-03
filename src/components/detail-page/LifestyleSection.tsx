import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub, Figure } from "./_shared";

export function LifestyleSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const imgs = images.length ? images : [];

  return (
    <SectionShell tone="light" bleed>
      <div className="px-6">
        <Eyebrow>IN YOUR LIFE</Eyebrow>
        <Headline>{copy.headline}</Headline>
        {copy.subheadline && <Sub>{copy.subheadline}</Sub>}
      </div>

      {imgs.length <= 1 ? (
        <div className="mt-8">
          <Figure image={imgs[0]} ratio="4/5" rounded={false} />
        </div>
      ) : (
        <div className="mt-8 flex snap-x gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {imgs.map((im, i) => (
            <div key={i} className="w-[80%] shrink-0 snap-start overflow-hidden rounded-2xl sm:w-[46%]">
              <Figure image={im} ratio="3/4" rounded={false} />
            </div>
          ))}
        </div>
      )}

      {copy.bullets && (
        <ul className="mt-6 space-y-1.5 px-6 text-[14px] leading-[1.7] text-ink-soft">
          {copy.bullets.map((b, i) => (
            <li key={i}>· {b}</li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
