import type { DetailSectionData } from "@/types/detail-page";
import { SectionShell, Eyebrow, Headline, Sub } from "./_shared";

function Cell({ v, ours }: { v: string | boolean; ours: boolean }) {
  if (typeof v === "boolean") {
    return v ? (
      <span className="text-[16px] font-bold" style={{ color: ours ? "var(--dp-primary, #111)" : "#111" }}>
        ○
      </span>
    ) : (
      <span className="text-[15px] text-ink-mute">✕</span>
    );
  }
  return <span className={`text-[13px] ${ours ? "font-semibold text-ink" : "text-ink-mute"}`}>{v}</span>;
}

export function ComparisonSection({ data }: { data: DetailSectionData }) {
  const { copy } = data;
  const table = copy.comparison;

  return (
    <SectionShell tone="gray">
      <Eyebrow>COMPARE</Eyebrow>
      <Headline>{copy.headline}</Headline>
      {copy.subheadline && <Sub>{copy.subheadline}</Sub>}

      {table && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white">
          <table className="w-full table-fixed border-collapse text-center text-sm">
            <thead>
              <tr>
                <th className="w-[34%] bg-white px-3 py-3.5 text-left text-[11px] font-semibold text-ink-mute">항목</th>
                {table.columns.map((c, i) => (
                  <th
                    key={i}
                    className={`px-2 py-3.5 text-[12px] font-bold ${
                      i === 0 ? "text-white" : "text-ink-mute"
                    }`}
                    style={i === 0 ? { background: "var(--dp-primary, #111)" } : { background: "#f4f3f0" }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri} className="border-t border-line">
                  <td className="px-3 py-3.5 text-left text-[13px] font-medium text-ink">{row.criterion}</td>
                  {row.values.map((v, vi) => (
                    <td
                      key={vi}
                      className="px-2 py-3.5"
                      style={vi === 0 ? { background: "color-mix(in srgb, var(--dp-primary, #111) 6%, #fff)" } : undefined}
                    >
                      <Cell v={v} ours={vi === 0} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {copy.bullets && (
        <ul className="mt-5 space-y-1.5 text-[14px] leading-[1.7] text-ink-soft">
          {copy.bullets.map((b, i) => (
            <li key={i}>· {b}</li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
