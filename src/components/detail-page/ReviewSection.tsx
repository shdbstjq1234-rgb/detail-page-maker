import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub } from "./_shared";

interface Rv {
  id: string;
  source: "real" | "demo";
  author?: string;
  rating?: number;
  body: string;
  tags?: string[];
  images?: string[];
}

function parse(body?: string): Rv[] {
  if (!body) return [];
  try {
    const arr = JSON.parse(body);
    return Array.isArray(arr) ? (arr as Rv[]) : [];
  } catch {
    return [];
  }
}

function Stars({ n = 5, size = 13 }: { n?: number; size?: number }) {
  const full = Math.round(n);
  return (
    <span style={{ fontSize: size, lineHeight: 1, letterSpacing: "1px", color: "var(--dp-accent, #f5a623)" }}>
      {"★★★★★".slice(0, full)}
      <span className="text-black/15">{"★★★★★".slice(full)}</span>
    </span>
  );
}

export function ReviewSection({ data }: { data: DetailSectionData }) {
  const { copy } = data;
  const reviews = parse(copy.body).slice(0, 7);
  const real = reviews.filter((r) => r.source === "real");
  const hasDemo = reviews.some((r) => r.source === "demo");
  const rated = real.filter((r) => typeof r.rating === "number");
  const avg = rated.length ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : null;
  const photos = reviews.flatMap((r) => r.images ?? []).slice(0, 4);
  const [lead, ...rest] = reviews;

  // 태그 빈도 (실제 리뷰만 · 숫자 없이 상위 태그만)
  const tagFreq: Record<string, number> = {};
  real.forEach((r) => (r.tags ?? []).forEach((t) => (tagFreq[t] = (tagFreq[t] ?? 0) + 1)));
  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);

  return (
    <SectionShell tone="gray">
      <Eyebrow>REAL REVIEW</Eyebrow>
      <Headline>{copy.headline || "구매하신 분들의 후기"}</Headline>
      {copy.subheadline && <Sub>{copy.subheadline}</Sub>}

      {/* 요약: 실제 리뷰가 있을 때만 수치 노출 */}
      {real.length > 0 && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-white px-5 py-5">
          <div className="text-center">
            <div className="text-[32px] font-extrabold leading-none" style={{ color: "var(--dp-primary, #111)" }}>
              {avg ? avg.toFixed(1) : real.length}
            </div>
            <div className="mt-1">{avg ? <Stars n={avg} size={12} /> : null}</div>
          </div>
          <div className="h-10 w-px bg-line" />
          <div className="flex-1 text-[12px] text-ink-soft">
            실제 구매 후기 <b className="text-ink">{real.length}건</b>
            {topTags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {topTags.map((t) => (
                  <span key={t} className="rounded-full bg-[color:var(--dp-bg-alt,#f0efec)] px-2 py-0.5 text-[10px] text-ink-soft">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className="w-full object-cover" style={{ aspectRatio: "1/1" }} />
            </div>
          ))}
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line bg-white px-4 py-10 text-center text-[13px] text-ink-mute">
          아직 등록된 후기가 없습니다.
        </p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {lead && (
            <div className="rounded-2xl bg-white p-5">
              <div className="flex items-center justify-between">
                <Stars n={lead.rating ?? 5} />
                <span className="text-[11px] text-ink-mute">{lead.author || "구매자"}</span>
              </div>
              <p className="mt-2.5 text-[15px] leading-[1.7] text-ink-soft">{lead.body}</p>
              {lead.tags && lead.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {lead.tags.map((t, i) => (
                    <span
                      key={i}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ background: "var(--dp-primary, #111)" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {rest.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white p-4">
                <div className="flex items-center justify-between">
                  <Stars n={r.rating ?? 5} size={11} />
                  <span className="text-[10px] text-ink-mute">{r.author || "구매자"}</span>
                </div>
                <p className="mt-1.5 line-clamp-4 text-[12.5px] leading-[1.65] text-ink-soft">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasDemo && (
        <p className="mt-3 text-center text-[10px] text-ink-mute">
          * 일부 후기는 디자인 확인용 AI 초안입니다. 실제 판매 전 실제 후기로 교체하세요.
        </p>
      )}
    </SectionShell>
  );
}
