import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Figure, pickImage } from "./_shared";

export function ProblemSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const img = pickImage(images, "usageScene", "beforeAfter", "lifestyle");

  return (
    <SectionShell tone="dark">
      <Eyebrow>이런 적, 있으셨죠</Eyebrow>
      <Headline className="text-white">{copy.headline}</Headline>
      {copy.subheadline && <p className="mt-4 text-[14px] leading-[1.75] text-white/55">{copy.subheadline}</p>}

      {copy.bullets && (
        <ul className="mt-8 space-y-0">
          {copy.bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-3 border-b border-white/10 py-4 text-[15px] leading-relaxed text-white/80 last:border-0"
            >
              <span aria-hidden className="text-[18px] leading-none text-white/25">
                “
              </span>
              {b}
            </li>
          ))}
        </ul>
      )}

      {img && (
        <div className="mt-8 overflow-hidden rounded-2xl">
          <Figure image={img} ratio="4/5" rounded={false} />
        </div>
      )}
    </SectionShell>
  );
}
