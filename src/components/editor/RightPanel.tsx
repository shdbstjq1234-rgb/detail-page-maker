"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Trash2, ArrowUp, ImagePlus } from "lucide-react";
import type { CopyStat, DetailImage, ImageRole } from "@/types/detail-page";
import {
  IMAGE_ROLES,
  SECTION_IMAGE_ROLE,
  SECTION_LABEL,
  makeImage,
  type EditorDoc,
  type EditorSection,
} from "@/lib/editor-doc";
import { uploadImage } from "@/lib/upload";
import { deriveTokens, typeTokens, type TypePreset } from "@/lib/design-tokens";
import { Btn, DropZone, Field, ListEditor, Select, TextArea, TextInput } from "./ui";

type Mutate = (fn: (d: EditorDoc) => void) => void;

export function RightPanel({
  doc,
  section,
  mutate,
  projectId,
  scrollToAi,
}: {
  doc: EditorDoc;
  section: EditorSection | null;
  mutate: Mutate;
  projectId: string;
  scrollToAi: number;
}) {
  const aiRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollToAi > 0) aiRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollToAi]);

  if (!section) {
    return (
      <aside className="hidden h-full w-[340px] shrink-0 items-center justify-center border-l border-neutral-200 bg-white px-6 text-center text-[12px] text-neutral-400 lg:flex">
        가운데 미리보기에서 섹션을 클릭하면
        <br />
        여기서 편집할 수 있어요.
      </aside>
    );
  }

  const c = section.copy;
  const patchCopy = (partial: Partial<typeof c>) =>
    mutate((d) => {
      const s = d.sections.find((x) => x.id === section.id);
      if (s) Object.assign(s.copy, partial);
    });
  const patchLayout = (partial: Partial<NonNullable<EditorSection["layout"]>>) =>
    mutate((d) => {
      const s = d.sections.find((x) => x.id === section.id);
      if (s) s.layout = { ...s.layout, ...partial };
    });
  const setImages = (fn: (imgs: DetailImage[]) => DetailImage[]) =>
    mutate((d) => {
      const s = d.sections.find((x) => x.id === section.id);
      if (s) s.images = fn(s.images);
    });
  // 타이포 프리셋은 페이지 전체(designTokens)에 적용
  const setTypePreset = (preset: TypePreset) =>
    mutate((d) => {
      const base = d.designTokens ?? deriveTokens(d.product);
      d.designTokens = { ...base, type: typeTokens(preset) };
    });

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3">
        <div className="text-[13px] font-bold text-neutral-900">{SECTION_LABEL[section.type]} 편집</div>
      </div>

      <div className="thin-scroll flex-1 space-y-6 overflow-y-auto px-4 py-4">
        {/* ── AI로 이 섹션 수정 ── */}
        <AiSectionEdit
          section={section}
          product={{ name: doc.product.name, category: doc.product.category }}
          onPatch={(patch) => {
            if (patch.copy) patchCopy(patch.copy);
            if (patch.layout) patchLayout(patch.layout as never);
          }}
        />

        {/* ── 텍스트 ── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">텍스트</h3>
          <Field label="헤드라인">
            <TextArea rows={2} value={c.headline ?? ""} onChange={(e) => patchCopy({ headline: e.target.value })} />
          </Field>
          <Field label="서브 헤드라인">
            <TextArea rows={2} value={c.subheadline ?? ""} onChange={(e) => patchCopy({ subheadline: e.target.value })} />
          </Field>
          {section.type !== "comparison" && section.type !== "howToUse" && section.type !== "productInfo" && (
            <Field label="본문 문구">
              <ListEditor items={c.bullets ?? []} onChange={(next) => patchCopy({ bullets: next })} />
            </Field>
          )}
          {(section.type === "hero" || section.type === "cta") && (
            <Field label="CTA 버튼 문구">
              <TextInput value={c.cta ?? ""} onChange={(e) => patchCopy({ cta: e.target.value })} />
            </Field>
          )}
          <Field label="강조 수치 (숫자 + 라벨)">
            <StatEditor stats={c.stats ?? []} onChange={(next) => patchCopy({ stats: next })} />
          </Field>

          {section.type === "comparison" && (
            <JsonField
              label="비교표"
              value={c.comparison}
              onChange={(v) => patchCopy({ comparison: v as never })}
              sample='{ "columns": ["우리 제품","일반 제품"], "rows": [ { "criterion":"보온", "values":["6시간","2시간"] } ] }'
            />
          )}
          {section.type === "howToUse" && (
            <JsonField
              label="사용 스텝"
              value={c.steps}
              onChange={(v) => patchCopy({ steps: v as never })}
              sample='[ { "order":1, "title":"뚜껑 열기", "description":"..." } ]'
            />
          )}
          {section.type === "productInfo" && (
            <JsonField
              label="제품 정보 표"
              value={c.infoRows}
              onChange={(v) => patchCopy({ infoRows: v as never })}
              sample='[ { "label":"용량", "value":"500ml" } ]'
            />
          )}
        </section>

        {/* ── 이미지 ── */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">이미지</h3>

          {section.images.length > 0 && (
            <div className="space-y-2">
              {section.images.map((im, i) => (
                <div key={i} className="flex gap-2 rounded-lg border border-neutral-200 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Select
                      value={im.role}
                      onChange={(e) =>
                        setImages((imgs) => imgs.map((x, j) => (j === i ? { ...x, role: e.target.value as ImageRole } : x)))
                      }
                    >
                      {IMAGE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                    <div className="flex gap-1">
                      <Btn variant="ghost" className="!px-2" onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}>
                        <Trash2 size={12} />
                      </Btn>
                      <Btn
                        variant="ghost"
                        className="!px-2"
                        disabled={i === 0}
                        onClick={() =>
                          setImages((imgs) => {
                            const a = [...imgs];
                            [a[i - 1], a[i]] = [a[i], a[i - 1]];
                            return a;
                          })
                        }
                      >
                        <ArrowUp size={12} />
                      </Btn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DropZone
            compact
            label="이미지 추가 / 교체 업로드"
            onFiles={async (urls) => {
              const hosted = await Promise.all(
                urls.map((u) => uploadImage(u, { projectId, kind: "original", filename: section.type })),
              );
              setImages((imgs) => [
                ...imgs,
                ...hosted.map((u) => makeImage(u, SECTION_IMAGE_ROLE[section.type], section.copy.headline ?? "")),
              ]);
            }}
          />

          {(doc.product.images ?? []).length > 0 && (
            <div>
              <div className="mb-1 text-[11px] text-neutral-500">상품 사진에서 넣기</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(doc.product.images ?? []).map((pi, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setImages((imgs) => [
                        ...imgs,
                        makeImage(pi.url, SECTION_IMAGE_ROLE[section.type], section.copy.headline ?? ""),
                      ])
                    }
                    className="aspect-square overflow-hidden rounded border border-neutral-200 hover:ring-2 hover:ring-neutral-900"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pi.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={aiRef}>
            <AiImageGen
              section={section}
              referenceUrl={(doc.product.images ?? [])[0]?.url}
              onPick={(url) =>
                setImages((imgs) => [
                  ...imgs,
                  makeImage(url, SECTION_IMAGE_ROLE[section.type], section.copy.headline ?? ""),
                ])
              }
            />
          </div>
        </section>

        {/* ── 스타일 ── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">타이포 · 이미지 배치 · 배경 · 정렬 · 여백</h3>
          <Field label="타이포 스타일 (페이지 전체)">
            <Select
              value={doc.designTokens?.type?.preset ?? "modern"}
              onChange={(e) => setTypePreset(e.target.value as TypePreset)}
            >
              <option value="modern">모던 (기본)</option>
              <option value="sporty">스포티 (굵고 강하게)</option>
              <option value="premium">프리미엄 (얇고 여유롭게)</option>
              <option value="living">리빙 (친근·안정)</option>
              <option value="cute">키즈·문구 (둥근 느낌)</option>
              <option value="minimal">미니멀 (가늘게)</option>
            </Select>
          </Field>
          <Field label="이미지 배치">
            <Select
              value={section.layout?.media ?? "auto"}
              onChange={(e) => patchLayout({ media: (e.target.value || undefined) as never })}
            >
              <option value="auto">자동 (이미지 수에 맞춤)</option>
              <option value="full">전체 폭 1장</option>
              <option value="split">이미지 + 설명 2분할</option>
              <option value="grid2">2분할 그리드</option>
              <option value="grid3">3분할 그리드</option>
              <option value="oneLargeTwoSmall">큰 1장 + 작은 2장</option>
              <option value="beforeAfter">Before / After</option>
              <option value="carousel">가로 스크롤</option>
            </Select>
          </Field>
          <Field label="배경 톤">
            <Select
              value={section.layout?.tone ?? ""}
              onChange={(e) => patchLayout({ tone: (e.target.value || undefined) as never })}
            >
              <option value="">기본</option>
              <option value="light">밝게 (흰색)</option>
              <option value="gray">회색</option>
              <option value="dark">어둡게</option>
              <option value="accent">강조(블랙)</option>
            </Select>
          </Field>
          <Field label="정렬">
            <div className="flex gap-1.5">
              {(["left", "center"] as const).map((a) => (
                <Btn
                  key={a}
                  variant={(section.layout?.align ?? "left") === a ? "primary" : "default"}
                  className="flex-1"
                  onClick={() => patchLayout({ align: a })}
                >
                  {a === "left" ? "왼쪽" : "가운데"}
                </Btn>
              ))}
            </div>
          </Field>
          <Field label={`위아래 여백  ×${(section.layout?.padding ?? 1).toFixed(2)}`}>
            <input
              type="range"
              min={0.3}
              max={2.2}
              step={0.1}
              value={section.layout?.padding ?? 1}
              onChange={(e) => patchLayout({ padding: Number(e.target.value) })}
              className="w-full accent-neutral-900"
            />
          </Field>
          <Field label={`헤드라인 크기  ×${(section.layout?.headlineScale ?? 1).toFixed(2)}`}>
            <input
              type="range"
              min={0.7}
              max={1.8}
              step={0.05}
              value={section.layout?.headlineScale ?? 1}
              onChange={(e) => patchLayout({ headlineScale: Number(e.target.value) })}
              className="w-full accent-neutral-900"
            />
          </Field>
        </section>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------

function StatEditor({ stats, onChange }: { stats: CopyStat[]; onChange: (n: CopyStat[]) => void }) {
  return (
    <div className="space-y-1.5">
      {stats.map((s, i) => (
        <div key={i} className="flex gap-1.5">
          <TextInput
            className="w-20"
            placeholder="98%"
            value={s.value}
            onChange={(e) => onChange(stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
          />
          <TextInput
            placeholder="재구매 의사"
            value={s.label}
            onChange={(e) => onChange(stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
          />
          <Btn variant="ghost" onClick={() => onChange(stats.filter((_, j) => j !== i))}>
            <Trash2 size={12} />
          </Btn>
        </div>
      ))}
      <Btn variant="default" className="w-full" onClick={() => onChange([...stats, { value: "", label: "" }])}>
        + 수치 추가
      </Btn>
    </div>
  );
}

function JsonField<T>({
  label,
  value,
  onChange,
  sample,
}: {
  label: string;
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  sample: string;
}) {
  const [text, setText] = useState(() => (value ? JSON.stringify(value, null, 2) : ""));
  const [err, setErr] = useState<string | null>(null);
  return (
    <Field label={label} hint="표 데이터 (JSON)">
      <TextArea
        rows={5}
        value={text}
        placeholder={sample}
        onChange={(e) => {
          setText(e.target.value);
          if (!e.target.value.trim()) {
            setErr(null);
            onChange(undefined);
            return;
          }
          try {
            onChange(JSON.parse(e.target.value) as T);
            setErr(null);
          } catch (x) {
            setErr((x as Error).message);
          }
        }}
        className="font-mono !text-[11px]"
      />
      {err && <span className="mt-1 block text-[10px] text-red-500">형식 오류: {err}</span>}
    </Field>
  );
}

function AiImageGen({
  section,
  referenceUrl,
  onPick,
}: {
  section: EditorSection;
  referenceUrl?: string;
  onPick: (url: string) => void;
}) {
  const role = SECTION_IMAGE_ROLE[section.type];
  const [prompt, setPrompt] = useState(() => defaultPrompt(section));
  const [ratio, setRatio] = useState<"1:1" | "4:5" | "3:4" | "16:9" | "9:16">("4:5");
  const [count, setCount] = useState(3);
  const [style, setStyle] = useState<keyof typeof STYLE_SUFFIX>("실사");
  const [useRef, setUseRef] = useState(Boolean(referenceUrl));
  const [loading, setLoading] = useState(false);
  const [cands, setCands] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  async function gen() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/regenerate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${prompt}${STYLE_SUFFIX[style]}`,
          aspectRatio: ratio,
          count,
          referenceImageUrl: useRef ? referenceUrl : undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "이미지 생성에 실패했습니다.");
      setProvider(data.provider);
      setCands((data.images as { url: string }[]).map((i) => i.url));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
        <Sparkles size={12} /> AI 이미지 생성 · {role}
      </div>
      <TextArea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="!text-[11px]" />
      <div className="flex flex-wrap items-center gap-1.5">
        <Select value={ratio} onChange={(e) => setRatio(e.target.value as never)} className="w-20">
          {(["1:1", "4:5", "3:4", "16:9", "9:16"] as const).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-24">
          {[2, 3, 4].map((n) => (
            <option key={n} value={n}>
              후보 {n}장
            </option>
          ))}
        </Select>
        <Select value={style} onChange={(e) => setStyle(e.target.value as never)} className="w-28">
          {Object.keys(STYLE_SUFFIX).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        {referenceUrl && (
          <label className="flex items-center gap-1 text-[11px] text-neutral-600">
            <input type="checkbox" checked={useRef} onChange={(e) => setUseRef(e.target.checked)} />
            상품 사진 참고
          </label>
        )}
      </div>
      <Btn variant="primary" className="w-full" onClick={gen} disabled={loading}>
        <ImagePlus size={13} /> {loading ? "생성 중…" : cands.length ? "다시 생성 / 다른 버전" : "이미지 생성"}
      </Btn>
      {err && <div className="rounded bg-red-50 px-2 py-1 text-[10px] text-red-600">{err}</div>}
      {cands.length > 0 && (
        <>
          <div className="text-[10px] text-neutral-400">{provider} · 마음에 드는 이미지를 누르면 섹션에 들어갑니다</div>
          <div className={`grid gap-1.5 ${count === 2 ? "grid-cols-2" : count === 4 ? "grid-cols-2" : "grid-cols-3"}`}>
            {cands.map((u, i) => (
              <button
                key={i}
                onClick={() => onPick(u)}
                className="aspect-square overflow-hidden rounded border border-neutral-200 hover:ring-2 hover:ring-neutral-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const STYLE_SUFFIX = {
  실사: ", photorealistic, natural lighting, high detail",
  "미니멀 스튜디오": ", minimal studio, seamless background, soft shadow, product-focused, editorial",
  라이프스타일: ", lifestyle photography, real home environment, warm natural light, candid",
  럭셔리: ", luxury commercial photography, premium mood, dramatic lighting, glossy, high-end magazine",
  "쿠팡 스타일": ", bright even lighting, clean white background, bold clear product, korean marketplace thumbnail style",
  화보: ", fashion editorial, cinematic composition, moody color grading, art-directed",
} as const;

/** 섹션 종류별 Higgsfield 프롬프트 기본값 (원형 유지 강조) */
function defaultPrompt(section: EditorSection): string {
  const h = section.copy.headline?.trim() || SECTION_LABEL[section.type];
  const base = "keep the exact product shape, color and design from the reference, photorealistic, Korean e-commerce detail page";
  const perType: Record<string, string> = {
    hero: `premium commercial product hero shot, seamless studio background, dramatic soft lighting — ${base}`,
    usp: `clean infographic-style product shot highlighting key benefit, minimal background — ${base}`,
    problem: `real-life scene showing the everyday problem this product solves — ${base}`,
    solution: `product in use demonstrating the solution clearly — ${base}`,
    feature: `close feature-focused shot emphasizing one function — ${base}`,
    featureDetail: `extreme close-up of material and structure detail — ${base}`,
    lifestyle: `authentic lifestyle scene, natural home environment, warm tones — ${base}`,
    comparison: `side-by-side comparison composition, ours vs ordinary — ${base}`,
    detail: `macro detail shot of texture, finish and craftsmanship — ${base}`,
    howToUse: `step-by-step usage scene, hands interacting with the product — ${base}`,
    productInfo: `clean cutout product shot on white, catalog style — ${base}`,
    cta: `aspirational final product shot, premium mood — ${base}`,
  };
  return `${h} — ${perType[section.type] ?? base}`;
}

// ---------------------------------------------------------------------------

const QUICK_EDITS = [
  "카피 더 강하게",
  "더 짧고 임팩트 있게",
  "더 고급스럽게",
  "미니멀하게",
  "쿠팡 스타일로",
  "배경 어둡게",
  "가운데 정렬",
  "제품을 더 크게",
];

function AiSectionEdit({
  section,
  product,
  onPatch,
}: {
  section: EditorSection;
  product: { name?: string; category?: string };
  onPatch: (patch: { copy?: Record<string, unknown>; layout?: Record<string, unknown> }) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(instruction: string) {
    if (!instruction.trim() || loading) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/edit-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: { type: section.type, copy: section.copy, layout: section.layout ?? {} },
          instruction,
          product,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "수정에 실패했습니다.");
      const patch = data.patch ?? {};
      if (!patch.copy && !patch.layout) {
        setMsg(patch.note ?? "바뀐 내용이 없어요. 요청을 조금 더 구체적으로 적어보세요.");
      } else {
        onPatch(patch);
        setMsg("적용했어요. 마음에 안 들면 ⌘Z로 되돌리기.");
        setText("");
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-900">
        <Sparkles size={12} /> AI로 이 섹션만 수정
      </div>
      <div className="flex flex-wrap gap-1">
        {QUICK_EDITS.map((q) => (
          <button
            key={q}
            disabled={loading}
            onClick={() => run(q)}
            className="rounded-full border border-violet-200 bg-white px-2 py-1 text-[11px] text-violet-800 hover:bg-violet-100 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <TextInput
          value={text}
          placeholder="예: 20대 여성 타깃으로, 애플 느낌으로"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(text)}
        />
        <Btn variant="primary" onClick={() => run(text)} disabled={loading || !text.trim()}>
          {loading ? "…" : "적용"}
        </Btn>
      </div>
      {msg && <div className="text-[10px] text-violet-700">{msg}</div>}
    </section>
  );
}
