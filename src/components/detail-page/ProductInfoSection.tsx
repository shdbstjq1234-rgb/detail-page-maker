import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub, Figure, pickImage } from "./_shared";

export function ProductInfoSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const img = pickImage(images, "productCutout", "sizeReference", "structure");
  const rows = copy.infoRows ?? [];
  const notices = copy.bullets ?? [];

  return (
    <SectionShell tone="light">
      <Eyebrow>PRODUCT INFO</Eyebrow>
      <Headline>{copy.headline}</Headline>
      {copy.subheadline && <Sub>{copy.subheadline}</Sub>}

      {img && (
        <div className="mt-8 overflow-hidden rounded-2xl">
          <Figure image={img} ratio="4/5" rounded={false} />
        </div>
      )}

      {rows.length > 0 && (
        <dl className="mt-8 overflow-hidden rounded-2xl border border-line">
          {rows.map((r, i) => (
            <div
              key={i}
              className={`flex gap-4 px-4 py-3.5 text-[13px] ${i % 2 ? "bg-white" : "bg-[color:var(--dp-bg-alt,#f7f6f3)]"}`}
            >
              <dt className="w-20 shrink-0 font-medium text-ink-mute">{r.label}</dt>
              <dd className="text-ink-soft">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {notices.length > 0 && (
        <div className="mt-6 rounded-2xl bg-ink px-5 py-6 text-white">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/50">구매 전 확인해 주세요</p>
          <ul className="mt-3 space-y-2 text-[12.5px] leading-[1.7] text-white/75">
            {notices.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-white/35">•</span>
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionShell>
  );
}
