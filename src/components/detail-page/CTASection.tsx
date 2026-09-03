import type { DetailSectionData } from "@/types/detail-page";
import { Figure, pickImage, useSectionLayout, TONE_CLASS } from "./_shared";

export function CTASection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const img = pickImage(images, "heroMain", "productCutout", "lifestyle");
  const o = useSectionLayout();
  const pad = o?.padding ?? 1;

  return (
    <section
      className={`w-full ${TONE_CLASS[o?.tone ?? "dark"]}`}
      style={o?.tone ? undefined : { background: "var(--dp-dark, #111)" }}
    >
      <div
        className="mx-auto w-full max-w-detail px-6 text-center"
        style={{ paddingTop: `${4.5 * pad}rem`, paddingBottom: `${4.5 * pad}rem` }}
      >
        <h2
          className="mx-auto max-w-[90%] font-extrabold leading-[1.3] tracking-[-0.02em]"
          style={{ fontSize: `${32 * (o?.headlineScale ?? 1)}px` }}
        >
          {copy.headline}
        </h2>
        {copy.subheadline && <p className="mt-3 text-[14px] text-white/60">{copy.subheadline}</p>}

        {img && (
          <div className="mx-auto mt-8 max-w-[260px] overflow-hidden rounded-2xl">
            <Figure image={img} ratio="1/1" rounded={false} />
          </div>
        )}

        <div className="mt-8">
          <span
            className="flex w-full items-center justify-center rounded-2xl px-8 py-4 text-[15px] font-bold"
            style={{ background: "var(--dp-primary, #fff)", color: "#fff" }}
          >
            {copy.cta ?? "지금 구매하기"}
          </span>
        </div>
        {copy.bullets && copy.bullets.length > 0 && (
          <p className="mt-3 text-[11px] text-white/40">{copy.bullets.join("  ·  ")}</p>
        )}
      </div>
    </section>
  );
}
