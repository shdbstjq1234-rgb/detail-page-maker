import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub, MiniFeatures, Figure, pickImage } from "./_shared";

export function FeatureSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const primary = pickImage(images, "featureExplainer", "detailCloseup", "structure");
  const secondary = images.find((i) => i !== primary);
  const bullets = copy.bullets ?? [];

  return (
    <SectionShell tone="gray">
      <Eyebrow>KEY FEATURES</Eyebrow>
      <Headline>{copy.headline}</Headline>
      {copy.subheadline && <Sub>{copy.subheadline}</Sub>}

      {bullets.length > 0 && (
        <MiniFeatures items={bullets.slice(0, 3).map((b) => ({ icon: "◆", title: b.split(/[·,:\-—]/)[0].trim().slice(0, 10), desc: b }))} />
      )}

      <div className="mt-8 space-y-3">
        {primary && (
          <div className="overflow-hidden rounded-2xl">
            <Figure image={primary} ratio="4/5" rounded={false} />
          </div>
        )}
        {secondary && (
          <div className="overflow-hidden rounded-2xl">
            <Figure image={secondary} ratio="1/1" rounded={false} />
          </div>
        )}
      </div>

      {bullets.length > 3 && (
        <ul className="mt-6 divide-y divide-line rounded-2xl bg-white">
          {bullets.slice(3).map((b, i) => (
            <li key={i} className="flex items-center gap-4 px-5 py-5 text-[16px] text-ink-soft">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                style={{ background: "var(--dp-primary, #111)" }}
              >
                {i + 4}
              </span>
              {b}
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
