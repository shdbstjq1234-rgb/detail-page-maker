import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub, SectionMedia, useSectionLayout } from "./_shared";

export function HowToUseSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const o = useSectionLayout();
  const media = o?.media ?? "full";
  const steps = copy.steps ?? [];

  return (
    <SectionShell tone="gray">
      <Eyebrow>HOW TO USE</Eyebrow>
      <Headline>{copy.headline}</Headline>
      {copy.subheadline && <Sub>{copy.subheadline}</Sub>}

      <SectionMedia images={images} layout={media === "auto" ? "full" : media} ratio="16/9" />

      <ol className="mt-8 space-y-2.5">
        {steps.map((s) => (
          <li key={s.order} className="flex gap-5 rounded-2xl bg-white p-5">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-extrabold text-white"
              style={{ background: "var(--dp-primary, #111)" }}
            >
              {s.order}
            </span>
            <div className="pt-0.5">
              <p className="text-[17px] font-bold text-ink">{s.title}</p>
              <p className="mt-1.5 text-[15px] leading-[1.75] text-ink-soft">{s.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
