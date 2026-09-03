"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Check, ListChecks } from "lucide-react";
import type { EditorDoc } from "@/lib/editor-doc";
import { ALL_PRESETS, detectPreset, presetByKey } from "@/lib/category-presets";
import { Select } from "./ui";

type Mutate = (fn: (d: EditorDoc) => void) => void;

/**
 * 카테고리별 상세페이지 체크리스트.
 * "이 카테고리 상세페이지는 보통 뭘 다루는지" 를 미리 보여주고,
 * 클릭 한 번으로 강조할 소구점을 상품 정보에 넣는다.
 */
export function CategoryGuide({ doc, mutate }: { doc: EditorDoc; mutate: Mutate }) {
  const [open, setOpen] = useState(true);
  const [override, setOverride] = useState<string>("");

  const preset = useMemo(() => {
    if (override) return presetByKey(override) ?? detectPreset(doc.product);
    return detectPreset(doc.product);
  }, [override, doc.product]);

  const picked = new Set(doc.product.sellingPoints ?? []);
  const toggle = (sp: string) =>
    mutate((d) => {
      const cur = d.product.sellingPoints ?? [];
      d.product.sellingPoints = cur.includes(sp) ? cur.filter((x) => x !== sp) : [...cur, sp];
    });

  const addAllAnxieties = () =>
    mutate((d) => {
      const prev = (d.product.extraRequest ?? "").trim();
      const line = `구매 전 걱정 해소: ${preset.anxieties.join(", ")}`;
      d.product.extraRequest = prev.includes("구매 전 걱정 해소") ? prev : [prev, line].filter(Boolean).join("\n");
    });

  return (
    <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-1.5 text-[12.5px] font-bold text-sky-900">
        <ListChecks size={14} />
        {preset.label} — 이 카테고리 상세페이지 체크리스트
        <ChevronDown size={14} className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-sky-900/70">카테고리 (자동 감지 · 바꿀 수 있어요)</span>
            <Select value={override || preset.key} onChange={(e) => setOverride(e.target.value)}>
              {ALL_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </Select>
          </label>

          <div>
            <div className="mb-1.5 text-[11px] font-semibold text-sky-900/70">
              반드시 다뤄야 할 소구점 — 눌러서 강조 항목에 추가
            </div>
            <div className="flex flex-wrap gap-1.5">
              {preset.sellingPoints.map((sp) => {
                const on = picked.has(sp);
                return (
                  <button
                    key={sp}
                    onClick={() => toggle(sp)}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                      on
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-sky-200 bg-white text-sky-900 hover:border-sky-400"
                    }`}
                  >
                    {on && <Check size={10} />}
                    {sp}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-sky-900/70">
              구매 전 걱정 (페이지 중간중간 풀어줘야 함)
              <button onClick={addAllAnxieties} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 underline-offset-2 hover:underline">
                요청사항에 추가
              </button>
            </div>
            <ul className="space-y-0.5 text-[11px] leading-relaxed text-sky-900/80">
              {preset.anxieties.map((a) => (
                <li key={a}>· {a}</li>
              ))}
            </ul>
          </div>

          <details className="rounded-lg bg-white/70 px-2.5 py-1.5">
            <summary className="cursor-pointer text-[11px] font-semibold text-sky-900/70">
              필요한 이미지 컷 {preset.imageCuts.length}개 · 비교 기준 보기
            </summary>
            <ul className="mt-1.5 space-y-1 text-[11px] text-sky-900/80">
              {preset.imageCuts.map((c) => (
                <li key={c.label}>
                  <b>{c.label}</b> — {c.why}
                </li>
              ))}
            </ul>
            <div className="mt-2 text-[11px] text-sky-900/80">
              <b>비교표 기준</b> — {preset.comparison.join(" · ")}
            </div>
            <div className="mt-1.5 text-[11px] text-sky-900/80">
              <b>헤드라인 예시</b>
              <ul className="mt-0.5 space-y-0.5">
                {preset.headlines.map((h) => (
                  <li key={h}>“{h}”</li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
