import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub, SectionMedia, useSectionLayout } from "./_shared";

export function LifestyleSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const o = useSectionLayout();
  // 사용 장면은 여러 장을 가로로 보여주는 게 기본
  const media = o?.media ?? (images.length > 1 ? "carousel" : "full");

  return (
    <SectionShell tone="light" bleed>
      <div className="px-6">
        <Eyebrow>IN YOUR LIFE</Eyebrow>
        <Headline>{copy.headline}</Headline>
        {copy.subheadline && <Sub>{copy.subheadline}</Sub>}
      </div>

      <div className={media === "carousel" ? "px-6" : "px-6"}>
        <SectionMedia images={images} layout={media} ratio="4/5" />
      </div>

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
