"use client";

import { useMemo, useState } from "react";
import { Palette, RefreshCw, AlertTriangle, Check } from "lucide-react";
import type { EditorDoc } from "@/lib/editor-doc";
import { buildDesignDirection } from "@/lib/design-direction";
import {
  COLOR_PRESETS,
  buildPalette,
  contrastRatio,
  type ColorPalette,
  type ColorPreset,
} from "@/lib/color-direction";

type Mutate = (fn: (d: EditorDoc) => void) => void;

/**
 * 컬러 디렉팅 패널.
 * 기본은 AUTO — 상품 분석대로 이미 칠해져 있다.
 * 프리셋은 "방향"만 바꾸고(고정 HEX 아님), 누르기 전에 미니 미리보기로 결과를 보여준다.
 */
export function ColorDirectionPanel({ doc, mutate }: { doc: EditorDoc; mutate: Mutate }) {
  const dir = doc.designDirection;
  const current = dir?.colorPreset ?? "auto";
  const [hover, setHover] = useState<ColorPreset | null>(null);

  const baseInput = useMemo(
    () => ({
      name: doc.product.name,
      category: doc.product.category,
      brandTone: doc.product.brandTone,
      price: doc.product.price,
      targetCustomer: doc.product.targetCustomer,
      productColors: doc.productColors,
    }),
    [doc.product, doc.productColors],
  );

  // 프리셋별 팔레트를 미리 계산 (미리보기 + 즉시 적용용)
  const previews = useMemo(() => {
    const map = new Map<ColorPreset, ColorPalette>();
    for (const p of COLOR_PRESETS) map.set(p.key, buildPalette({ ...baseInput, preset: p.key }).palette);
    return map;
  }, [baseInput]);

  const apply = (preset: ColorPreset) =>
    mutate((d) => {
      d.designDirection = buildDesignDirection({
        name: d.product.name,
        category: d.product.category,
        brandTone: d.product.brandTone,
        price: d.product.price,
        targetCustomer: d.product.targetCustomer,
        description: d.product.description,
        productColors: d.productColors,
        preset,
        sections: d.sections.map((s) => ({ id: s.id, type: s.type })),
      });
    });

  const shownPalette = previews.get(hover ?? current) ?? dir?.palette;

  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
        <Palette size={12} /> 컬러 디렉팅
      </h3>

      {!dir ? (
        <p className="rounded-lg border border-dashed border-neutral-200 px-3 py-4 text-center text-[11px] text-neutral-400">
          상세페이지를 만들면 상품 색을 분석해 자동으로 컬러 시스템을 잡습니다.
        </p>
      ) : (
        <>
          {/* 현재 팔레트 */}
          <PaletteStrip palette={dir.palette} />
          <p className="text-[11px] leading-relaxed text-neutral-500">{dir.rationale}</p>

          {/* 색 사용 비율 */}
          <UsageBar palette={dir.palette} usage={dir.colorUsage} />

          {/* 프리셋 — hover 시 미니 미리보기 */}
          <div className="relative">
            <div className="mb-1 text-[11px] font-semibold text-neutral-600">
              색 방향 바꾸기 <span className="font-normal text-neutral-400">· 올려두면 미리보기</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {COLOR_PRESETS.map((p) => {
                const on = current === p.key;
                const pal = previews.get(p.key)!;
                return (
                  <button
                    key={p.key}
                    onMouseEnter={() => setHover(p.key)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => apply(p.key)}
                    title={p.hint}
                    className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
                      on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                    }`}
                  >
                    <span className="flex overflow-hidden rounded-[3px]">
                      {[pal.background, pal.primary, pal.accent, pal.cta].map((c, i) => (
                        <span key={i} style={{ background: c, width: 5, height: 11 }} />
                      ))}
                    </span>
                    {on && <Check size={9} />}
                    {p.label}
                  </button>
                );
              })}
            </div>

            {hover && shownPalette && (
              <MiniPreview palette={shownPalette} label={COLOR_PRESETS.find((p) => p.key === hover)!.label} hint={COLOR_PRESETS.find((p) => p.key === hover)!.hint} />
            )}
          </div>

          <button
            onClick={() => apply(current)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50"
          >
            <RefreshCw size={11} /> 상품 사진으로 색 다시 분석
          </button>

          {dir.issues.length > 0 && (
            <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
              {dir.issues.map((i) => (
                <p key={i} className="flex items-start gap-1 text-[10.5px] leading-relaxed text-amber-800">
                  <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                  {i}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** 팔레트 색 칩 — 역할 이름 + HEX */
function PaletteStrip({ palette }: { palette: ColorPalette }) {
  const rows: [string, string][] = [
    ["배경", palette.background],
    ["보조배경", palette.secondaryBackground],
    ["주색", palette.primary],
    ["포인트", palette.accent],
    ["구매버튼", palette.cta],
    ["어두운면", palette.darkSection],
  ];
  return (
    <div className="grid grid-cols-3 gap-1">
      {rows.map(([label, hex]) => (
        <div key={label} className="overflow-hidden rounded-lg border border-neutral-200">
          <div style={{ background: hex, height: 26 }} />
          <div className="px-1.5 py-1">
            <div className="text-[9.5px] font-semibold text-neutral-700">{label}</div>
            <div className="font-mono text-[9px] uppercase text-neutral-400">{hex}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsageBar({ palette, usage }: { palette: ColorPalette; usage: { baseNeutral: number; secondary: number; accent: number; cta: number } }) {
  const parts: [string, number][] = [
    [palette.background, usage.baseNeutral],
    [palette.secondaryBackground, usage.secondary],
    [palette.accent, usage.accent],
    [palette.cta, usage.cta],
  ];
  return (
    <div>
      <div className="mb-1 text-[10px] text-neutral-400">
        색 비율 · 뉴트럴 {usage.baseNeutral}% / 보조 {usage.secondary}% / 포인트 {usage.accent}% / CTA {usage.cta}%
      </div>
      <div className="flex h-2 overflow-hidden rounded-full border border-neutral-200">
        {parts.map(([c, w], i) => (
          <span key={i} style={{ background: c, width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

/**
 * 미니 미리보기 — 이 프리셋을 누르면 상세페이지가 대충 어떤 색이 되는지.
 * 히어로/본문/포인트/CTA 를 한 장에 축소해서 보여준다.
 */
function MiniPreview({ palette: p, label, hint }: { palette: ColorPalette; label: string; hint: string }) {
  const ok = contrastRatio(p.ctaText, p.cta) >= 4.5 && contrastRatio(p.textPrimary, p.background) >= 7;
  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between border-b border-neutral-100 px-2.5 py-1.5">
        <span className="text-[11px] font-bold text-neutral-900">{label}</span>
        <span className="text-[10px] text-neutral-400">{hint}</span>
      </div>

      {/* 축소 상세페이지 */}
      <div style={{ background: p.background }}>
        {/* hero (dark) */}
        <div style={{ background: p.darkSection }} className="px-3 py-3">
          <div style={{ background: p.accent, width: 22, height: 3, borderRadius: 2 }} />
          <div style={{ background: "rgba(255,255,255,0.92)", width: "78%", height: 7, borderRadius: 2, marginTop: 6 }} />
          <div style={{ background: "rgba(255,255,255,0.45)", width: "54%", height: 4, borderRadius: 2, marginTop: 4 }} />
          <div style={{ background: p.secondary, height: 26, borderRadius: 4, marginTop: 7 }} />
        </div>

        {/* 본문 */}
        <div className="px-3 py-3">
          <div style={{ background: p.accent, width: 16, height: 3, borderRadius: 2 }} />
          <div style={{ background: p.textPrimary, width: "70%", height: 6, borderRadius: 2, marginTop: 5 }} />
          <div style={{ background: p.textSecondary, width: "88%", height: 3.5, borderRadius: 2, marginTop: 4, opacity: 0.75 }} />
          <div style={{ background: p.textSecondary, width: "62%", height: 3.5, borderRadius: 2, marginTop: 3, opacity: 0.75 }} />
        </div>

        {/* 보조배경 섹션 + 포인트 */}
        <div style={{ background: p.secondaryBackground }} className="flex gap-1.5 px-3 py-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 rounded" style={{ background: p.lightSection, border: `1px solid ${p.border}`, height: 30 }}>
              <div style={{ background: p.primary, width: "50%", height: 4, borderRadius: 2, margin: "7px 0 0 7px" }} />
              <div style={{ background: p.textSecondary, width: "70%", height: 3, borderRadius: 2, margin: "4px 0 0 7px", opacity: 0.6 }} />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: p.darkSection }} className="px-3 py-3">
          <div style={{ background: "rgba(255,255,255,0.9)", width: "60%", height: 6, borderRadius: 2, margin: "0 auto" }} />
          <div
            className="mt-2.5 flex items-center justify-center rounded"
            style={{ background: p.cta, height: 18 }}
          >
            <span style={{ color: p.ctaText, fontSize: 8, fontWeight: 700 }}>구매하기</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-t border-neutral-100 px-2.5 py-1.5 text-[10px]">
        {ok ? (
          <span className="text-emerald-600">✓ 대비 기준 통과</span>
        ) : (
          <span className="text-amber-600">⚠ 대비가 약해 자동 보정됩니다</span>
        )}
      </div>
    </div>
  );
}
