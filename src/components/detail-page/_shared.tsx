import { createContext, useContext, type ReactNode } from "react";
import type { CopyStat, DetailImage } from "@/types/detail-page";

/* ============================================================================
 * 상세페이지 디자인 시스템 (한국 이커머스 · 프리미엄 톤)
 *  - 넉넉한 세로 리듬 / 큰 헤드라인 / 작고 촘촘한 라벨
 *  - 숫자·강조는 크게, 본문은 짧게
 *  - 강조색은 상품별 디자인 토큰(var(--dp-*)) 사용
 * ========================================================================== */

export interface SectionLayoutOverride {
  tone?: "light" | "gray" | "dark" | "accent";
  align?: "left" | "center";
  /** 위아래 여백 배율 (1 = 기본) */
  padding?: number;
  /** 헤드라인 크기 배율 (1 = 기본) */
  headlineScale?: number;
}

/** 편집기가 섹션별 배경/정렬/여백을 주입하는 통로 */
export const SectionLayoutContext = createContext<SectionLayoutOverride | null>(null);
export const useSectionLayout = () => useContext(SectionLayoutContext);

/** 섹션의 표시 순번(01, 02 …). 편집기/렌더러가 주입, 없으면 숨김 */
export const SectionStepContext = createContext<number | null>(null);

export const TONE_CLASS = {
  light: "bg-white text-ink",
  gray: "bg-[color:var(--dp-bg,#f7f7f5)] text-ink",
  dark: "bg-ink text-white",
  accent: "bg-[#111] text-white",
} as const;

export function SectionShell({
  children,
  tone = "light",
  className = "",
  bleed = false,
}: {
  children: ReactNode;
  tone?: "light" | "gray" | "dark" | "accent";
  className?: string;
  /** 좌우 패딩 없이 꽉 채움 (이미지 캐러셀 등) */
  bleed?: boolean;
}) {
  const o = useSectionLayout();
  const toneClass = TONE_CLASS[o?.tone ?? tone];
  const pad = o?.padding ?? 1;
  const alignClass =
    o?.align === "center" ? "text-center [&_ul]:inline-block [&_ol]:inline-block [&_dl]:text-left" : "";
  return (
    <section className={`w-full ${toneClass}`}>
      <div
        className={`mx-auto w-full max-w-detail ${bleed ? "" : "px-6"} ${alignClass} ${className}`}
        style={{ paddingTop: `${4.5 * pad}rem`, paddingBottom: `${4.5 * pad}rem` }}
      >
        {children}
      </div>
    </section>
  );
}

/** 01 ─ SECTION 형태의 소제목 */
export function Eyebrow({ children }: { children: ReactNode }) {
  const step = useContext(SectionStepContext);
  return (
    <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]">
      {step != null && (
        <>
          <span style={{ color: "var(--dp-primary, #111)" }}>{String(step).padStart(2, "0")}</span>
          <span className="h-px w-5 bg-current opacity-30" />
        </>
      )}
      <span style={{ color: "var(--dp-accent, #8b8b8b)" }}>{children}</span>
    </p>
  );
}

export function Headline({ children, className = "" }: { children: ReactNode; className?: string }) {
  const o = useSectionLayout();
  const scale = o?.headlineScale ?? 1;
  return (
    <h2
      className={`font-extrabold leading-[1.32] tracking-[-0.02em] ${className}`}
      style={{ fontSize: `${clamp(27 * scale, 18, 52)}px` }}
    >
      {children}
    </h2>
  );
}

export function Sub({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`mt-4 text-[15px] leading-[1.75] text-ink-soft ${className}`}>{children}</p>
  );
}

/** 숫자로 보는 핵심 — 큰 숫자 + 작은 라벨 블록 */
export function StatRow({ stats, tone = "light" }: { stats: CopyStat[]; tone?: "light" | "dark" }) {
  if (!stats?.length) return null;
  const cardBg = tone === "dark" ? "bg-white/5" : "bg-[color:var(--dp-bg-alt,#f0efec)]";
  const labelC = tone === "dark" ? "text-white/50" : "text-ink-mute";
  return (
    <div className={`grid gap-2.5 ${stats.length >= 4 ? "grid-cols-4" : stats.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {stats.map((s, i) => (
        <div key={i} className={`rounded-2xl ${cardBg} px-2 py-6 text-center`}>
          <div
            className="text-[clamp(26px,7vw,40px)] font-extrabold leading-none tracking-tight"
            style={{ color: tone === "dark" ? "#fff" : "var(--dp-primary, #111)" }}
          >
            {s.value}
          </div>
          <div className={`mt-2 text-[11px] leading-tight ${labelC}`}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/** 카드형 불릿 목록 */
export function Bullets({
  items,
  variant = "card",
  tone = "light",
}: {
  items: string[];
  variant?: "card" | "check" | "plain";
  tone?: "light" | "dark";
}) {
  if (!items?.length) return null;
  if (variant === "check") {
    return (
      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {items.map((b, i) => (
          <li
            key={i}
            className={`flex items-start gap-2.5 rounded-xl px-4 py-3.5 text-[14px] leading-relaxed ${
              tone === "dark" ? "bg-white/5 text-white/85" : "border border-line text-ink-soft"
            }`}
          >
            <span className="mt-px shrink-0 font-bold" style={{ color: "var(--dp-primary, #111)" }}>
              ✓
            </span>
            {b}
          </li>
        ))}
      </ul>
    );
  }
  if (variant === "plain") {
    return (
      <ul className={`mt-5 space-y-2 text-[14px] leading-[1.7] ${tone === "dark" ? "text-white/75" : "text-ink-soft"}`}>
        {items.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="opacity-40">—</span>
            {b}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="mt-6 space-y-2.5">
      {items.map((b, i) => (
        <li
          key={i}
          className={`flex gap-3 rounded-xl px-4 py-4 text-[14px] leading-relaxed ${
            tone === "dark" ? "bg-white/5 text-white/85" : "bg-[color:var(--dp-bg-alt,#f4f3f0)] text-ink-soft"
          }`}
        >
          <span className="shrink-0 text-[15px] font-extrabold tabular-nums" style={{ color: "var(--dp-primary, #111)" }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

/** 3열 미니 특징 행 (아이콘 자리 + 라벨 + 한 줄) */
export function MiniFeatures({ items }: { items: { icon?: string; title: string; desc?: string }[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-7 grid grid-cols-3 gap-2 text-center">
      {items.slice(0, 3).map((it, i) => (
        <div key={i} className="rounded-xl border border-line px-2 py-4">
          <div className="text-[18px]">{it.icon ?? "◦"}</div>
          <div className="mt-1.5 text-[12px] font-bold text-ink">{it.title}</div>
          {it.desc && <div className="mt-0.5 text-[10px] leading-tight text-ink-mute">{it.desc}</div>}
        </div>
      ))}
    </div>
  );
}

/** 이미지 1장 (없으면 자리표시) */
export function Figure({
  image,
  ratio = "4/5",
  rounded = true,
}: {
  image?: DetailImage;
  ratio?: string;
  rounded?: boolean;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-[#ececec] ${rounded ? "rounded-2xl" : ""}`}
      style={{ aspectRatio: ratio }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt={image.alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[13px] text-ink-mute">이미지 준비 중</div>
      )}
    </div>
  );
}

export function pickImage(images: DetailImage[], ...roles: string[]) {
  for (const r of roles) {
    const hit = images.find((i) => i.role === r);
    if (hit) return hit;
  }
  return images[0];
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
