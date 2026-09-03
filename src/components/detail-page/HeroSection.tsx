import type { DetailSectionData } from "@/types/detail-page";
import { Figure, pickImage, useSectionLayout, TONE_CLASS } from "./_shared";

export function HeroSection({ data }: { data: DetailSectionData }) {
  const { copy, images } = data;
  const hero = pickImage(images, "heroMain", "productCutout", "lifestyle");
  const o = useSectionLayout();
  const pad = o?.padding ?? 1;
  const tone = o?.tone ?? "dark";
  const dark = tone === "dark" || tone === "accent";

  return (
    <section className={`w-full ${TONE_CLASS[tone]}`} style={!o?.tone ? { background: "var(--dp-dark, #111)" } : undefined}>
      <div
        className="mx-auto w-full max-w-detail px-6 text-center"
        style={{ paddingTop: `${4 * pad}rem`, paddingBottom: `${1.2 * pad}rem` }}
      >
        <h1
          className="mx-auto max-w-[92%] font-extrabold leading-[1.28] tracking-[-0.025em]"
          style={{ fontSize: `${38 * (o?.headlineScale ?? 1)}px` }}
        >
          {copy.headline}
        </h1>
        {copy.subheadline && (
          <p className={`mx-auto mt-4 max-w-[86%] text-[14px] leading-[1.7] ${dark ? "text-white/55" : "text-ink-mute"}`}>
            {copy.subheadline}
          </p>
        )}
        {copy.bullets && copy.bullets.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px]">
            {copy.bullets.slice(0, 3).map((b, i) => (
              <span key={i} className={dark ? "text-white/70" : "text-ink-soft"}>
                · {b}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-detail" style={{ paddingBottom: `${1.5 * pad}rem` }}>
        <Figure image={hero} ratio="1/1" rounded={false} />
      </div>

      {copy.cta && (
        <div className="mx-auto w-full max-w-detail px-6" style={{ paddingBottom: `${3 * pad}rem` }}>
          <span
            className="flex w-full items-center justify-center rounded-2xl px-6 py-4 text-[15px] font-bold text-white"
            style={{ background: "var(--dp-primary, #fff)", color: dark ? undefined : "#fff" }}
          >
            {copy.cta}
          </span>
        </div>
      )}
    </section>
  );
}
