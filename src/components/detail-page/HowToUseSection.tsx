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
          <li key={s.order} className="flex gap-4 rounded-2xl bg-white p-4">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold text-white"
              style={{ background: "var(--dp-primary, #111)" }}
            >
              {s.order}
            </span>
            <div className="pt-0.5">
              <p className="text-[14px] font-bold text-ink">{s.title}</p>
              <p className="mt-1 text-[13px] leading-[1.7] text-ink-soft">{s.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
