"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Loader2,
  Square,
  Star,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Plus,
  GripVertical,
} from "lucide-react";
import type { PipelineEvent, ProductImageRef, SectionType } from "@/types/detail-page";
import { SECTION_LABEL, SECTION_TYPES, makeSection, type EditorDoc } from "@/lib/editor-doc";
import { uploadImage } from "@/lib/upload";
import { ReviewPanel } from "./ReviewPanel";
import { ShotListPanel } from "./ShotListPanel";
import { ColorDirectionPanel } from "./ColorDirectionPanel";
import { BrandPanel } from "./BrandPanel";
import { EvidencePanel } from "./EvidencePanel";
import { libraryApi, type PageReference } from "@/lib/library";
import { Btn, DropZone, Field, ListEditor, Select, TextArea, TextInput } from "./ui";

type Mutate = (fn: (d: EditorDoc) => void) => void;

const STAGE_TEXT: Record<string, string> = {
  analyze: "상품을 분석하고 있습니다",
  usp: "핵심 USP를 뽑고 있습니다",
  plan: "상세페이지 구성을 만들고 있습니다",
  copy: "섹션 카피를 쓰고 있습니다",
  imagePrompt: "이미지 프롬프트를 만들고 있습니다",
  imageGenerate: "이미지를 생성하고 있습니다",
  imageSelect: "가장 좋은 이미지를 고르고 있습니다",
  assemble: "상세페이지를 완성하고 있습니다",
  done: "완료되었습니다",
};
const STAGE_ORDER = ["analyze", "usp", "plan", "copy", "imagePrompt", "imageGenerate", "imageSelect", "assemble", "done"];

export function LeftPanel({
  doc,
  mutate,
  projectId,
  selectedId,
  onSelect,
  onGenerate,
  onStop,
  running,
  events,
  error,
  onApplyReferenceOrder,
}: {
  doc: EditorDoc;
  mutate: Mutate;
  projectId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onGenerate: () => void;
  onStop: () => void;
  running: boolean;
  events: PipelineEvent[];
  error: string | null;
  onApplyReferenceOrder: (order: SectionType[], tone?: string) => void;
}) {
  const p = doc.product;
  const [addType, setAddType] = useState<SectionType>("feature");
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const lastStage = events.length ? events[events.length - 1].stage : null;
  const stageIdx = lastStage ? STAGE_ORDER.indexOf(lastStage) : -1;
  const progress = stageIdx >= 0 ? Math.round(((stageIdx + 1) / STAGE_ORDER.length) * 100) : 0;

  const set =
    (k: keyof typeof p) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      mutate((d) => {
        const v = e.target.value;
        (d.product as unknown as Record<string, unknown>)[k] =
          k === "price" ? (v ? Number(v) : undefined) : v;
      });

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="thin-scroll flex-1 space-y-6 overflow-y-auto px-4 py-4">
        {/* ── AI 생성 ── */}
        <section>
          <button
            onClick={onGenerate}
            disabled={running}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-[13px] font-bold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60"
          >
            {running ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {running ? "생성 중…" : "AI 상세페이지 만들기"}
          </button>
          <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">
            상품 정보와 사진으로 분석 · USP · 타깃 · 구성 · 카피 · 이미지까지 자동 생성합니다.
          </p>

          {running && (
            <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700">
                <span>{lastStage ? STAGE_TEXT[lastStage] : "준비 중…"}</span>
                <button onClick={onStop} className="flex items-center gap-1 text-neutral-400 hover:text-neutral-700">
                  <Square size={9} /> 중지
                </button>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full bg-neutral-900 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {!running && events.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-neutral-50 p-2 text-[10px] leading-relaxed text-neutral-500">
              {events
                .filter((e) => e.status === "success")
                .map((e, i) => (
                  <div key={i}>✓ {e.message}</div>
                ))}
            </div>
          )}
          {error && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-600">
              {error}
            </div>
          )}
        </section>

        {/* ── 상품 정보 ── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">상품 정보</h3>
          <Field label="상품명">
            <TextInput value={p.name ?? ""} placeholder="예: 스테인리스 진공 텀블러 500ml" onChange={set("name")} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="카테고리">
              <TextInput value={p.category ?? ""} placeholder="주방용품/텀블러" onChange={set("category")} />
            </Field>
            <Field label="판매 채널">
              <Select value={p.salesChannel ?? ""} onChange={set("salesChannel")}>
                <option value="">선택 안 함</option>
                <option value="쿠팡">쿠팡</option>
                <option value="네이버 스마트스토어">네이버 스마트스토어</option>
                <option value="기타">기타</option>
              </Select>
            </Field>
          </div>
          <Field label="상품 설명">
            <TextArea rows={3} value={p.description ?? ""} placeholder="소재 · 핵심 기능 · 사용 상황을 자유롭게" onChange={set("description")} />
          </Field>
          <Field label="주요 특징" hint="한 줄에 하나">
            <ListEditor
              items={p.features ?? []}
              placeholder="3초 원터치 설치"
              onChange={(next) => mutate((d) => void (d.product.features = next))}
            />
          </Field>

          <details className="group rounded-lg border border-neutral-200 bg-neutral-50/60 px-2.5 py-2">
            <summary className="cursor-pointer list-none text-[11px] font-semibold text-neutral-500 group-open:mb-2">
              추가 정보 (선택) ▾
            </summary>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="재질">
                  <TextInput value={p.material ?? ""} placeholder="알루미늄" onChange={set("material")} />
                </Field>
                <Field label="크기">
                  <TextInput value={p.size ?? ""} placeholder="접힘 12cm" onChange={set("size")} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="구성품">
                  <TextInput value={p.components ?? ""} placeholder="본품, 파우치" onChange={set("components")} />
                </Field>
                <Field label="가격(원)">
                  <TextInput type="number" value={p.price ?? ""} placeholder="29900" onChange={set("price")} />
                </Field>
              </div>
              <Field label="타깃 고객" hint="비워두면 AI가 분석">
                <TextInput value={p.targetCustomer ?? ""} placeholder="주말 캠핑 즐기는 30대" onChange={set("targetCustomer")} />
              </Field>
              <Field label="브랜드 톤">
                <TextInput value={p.brandTone ?? ""} placeholder="미니멀하고 단단한" onChange={set("brandTone")} />
              </Field>
              <Field label="추가 요청사항" hint="강조점 · 금지사항">
                <TextArea rows={2} value={p.extraRequest ?? ""} placeholder="가격은 강조하지 말고 품질 위주로" onChange={set("extraRequest")} />
              </Field>
            </div>
          </details>
        </section>

        {/* ── 상품 사진 ── */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">상품 사진</h3>
          <DropZone
            compact
            label="JPG · PNG · WEBP — 클릭 또는 드래그"
            onFiles={async (urls) => {
              const hosted = await Promise.all(urls.map((u, i) => uploadImage(u, { projectId, kind: "original", filename: `orig${i}` })));
              mutate((d) => {
                d.product.images = [
                  ...(d.product.images ?? []),
                  ...hosted.map((url): ProductImageRef => ({ url, kind: "product" })),
                ];
              });
            }}
          />
          {(p.images ?? []).length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {(p.images ?? []).map((img, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom === null || dragFrom === i) return;
                    mutate((d) => {
                      const arr = d.product.images ?? [];
                      const [m] = arr.splice(dragFrom, 1);
                      arr.splice(i, 0, m);
                    });
                    setDragFrom(null);
                  }}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-neutral-900 px-1 py-0.5 text-[9px] font-bold text-white">대표</span>
                  )}
                  <div className="absolute inset-x-1 bottom-1 hidden justify-between group-hover:flex">
                    <button
                      onClick={() =>
                        mutate((d) => {
                          const arr = d.product.images ?? [];
                          const [m] = arr.splice(i, 1);
                          arr.unshift(m);
                        })
                      }
                      className="rounded bg-black/70 p-1 text-white"
                      title="대표 이미지로"
                    >
                      <Star size={10} />
                    </button>
                    <button
                      onClick={() => mutate((d) => void (d.product.images = (d.product.images ?? []).filter((_, j) => j !== i)))}
                      className="rounded bg-black/70 p-1 text-white"
                      title="삭제"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                  <span className="absolute right-1 top-1 hidden text-white/70 group-hover:block">
                    <GripVertical size={11} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── AI 이미지 제작 리스트 (상품 사진 바로 아래) ── */}
        <ShotListPanel doc={doc} mutate={mutate} projectId={projectId} />

        {/* ── 컬러 디렉팅 ── */}
        <ColorDirectionPanel doc={doc} mutate={mutate} />

        {/* ── 브랜드 · 모델 라이브러리 ── */}
        <BrandPanel doc={doc} mutate={mutate} projectId={projectId} />

        {/* ── 근거자료 ── */}
        <EvidencePanel doc={doc} mutate={mutate} projectId={projectId} />

        {/* ── 섹션 목록 ── */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">섹션 ({doc.sections.length})</h3>
          <ul className="space-y-1">
            {doc.sections.map((s, i) => (
              <li
                key={s.id}
                className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[12px] transition-colors ${
                  selectedId === s.id
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                }`}
              >
                <button className="flex-1 truncate text-left" onClick={() => onSelect(s.id)}>
                  <span className="tabular-nums opacity-50">{String(i + 1).padStart(2, "0")}</span> {SECTION_LABEL[s.type]}
                </button>
                <button
                  className="px-0.5 opacity-50 hover:opacity-100 disabled:opacity-20"
                  disabled={i === 0}
                  onClick={() => mutate((d) => swap(d.sections, i, i - 1))}
                >
                  <ArrowLeft size={11} className="rotate-90" />
                </button>
                <button
                  className="px-0.5 opacity-50 hover:opacity-100 disabled:opacity-20"
                  disabled={i === doc.sections.length - 1}
                  onClick={() => mutate((d) => swap(d.sections, i, i + 1))}
                >
                  <ArrowRight size={11} className="rotate-90" />
                </button>
                <button
                  className="px-0.5 opacity-50 hover:opacity-100"
                  onClick={() => mutate((d) => void (d.sections = d.sections.filter((x) => x.id !== s.id)))}
                >
                  <Trash2 size={11} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-1.5">
            <Select value={addType} onChange={(e) => setAddType(e.target.value as SectionType)}>
              {SECTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SECTION_LABEL[t]}
                </option>
              ))}
            </Select>
            <Btn
              variant="default"
              onClick={() =>
                mutate((d) => {
                  const sec = makeSection(addType);
                  const at = d.sections.findIndex((x) => x.id === selectedId);
                  if (at === -1) d.sections.push(sec);
                  else d.sections.splice(at + 1, 0, sec);
                })
              }
            >
              <Plus size={13} /> 추가
            </Btn>
          </div>
        </section>

        <ReviewPanel doc={doc} mutate={mutate} />

        <ReferenceAnalyzer doc={doc} onApply={onApplyReferenceOrder} />
      </div>
    </aside>
  );
}

function swap<T>(arr: T[], a: number, b: number) {
  [arr[a], arr[b]] = [arr[b], arr[a]];
}

// ---------------------------------------------------------------------------

function ReferenceAnalyzer({
  doc,
  onApply,
}: {
  doc: EditorDoc;
  onApply: (order: SectionType[], tone?: string) => void;
}) {
  const [img, setImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sectionOrder: string[]; tone: string; notes: string[]; source: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<PageReference[] | null>(null);
  const [savingRef, setSavingRef] = useState(false);

  const loadSaved = async () => {
    try {
      setSaved(await libraryApi.listReferences());
    } catch {
      setSaved([]);
    }
  };
  useEffect(() => {
    void loadSaved();
  }, []);

  async function saveToLibrary() {
    if (!result) return;
    setSavingRef(true);
    try {
      const name = window.prompt("레퍼런스 이름", `${doc.product.category || "레퍼런스"} ${new Date().toLocaleDateString("ko-KR")}`);
      if (!name) return;
      const item = await libraryApi.saveReference({
        name,
        thumbUrl: img && img.length < 200_000 ? img : undefined,
        analysis: {
          sectionOrder: result.sectionOrder,
          colorUsage: result.tone,
          notes: result.notes?.join(" / "),
        },
      });
      setSaved((p) => [item, ...(p ?? [])]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSavingRef(false);
    }
  }

  async function analyze() {
    if (!img) return;
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img, product: { name: doc.product.name, category: doc.product.category } }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "분석에 실패했습니다.");
      setResult(data.analysis);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">디자인 레퍼런스</h3>
      <p className="text-[11px] leading-relaxed text-neutral-500">
        참고할 상세페이지 스크린샷을 넣으면 구조 · 톤을 분석해 현재 구성에 반영합니다. (그대로 복제하지 않습니다)
      </p>
      {img ? (
        <div className="relative overflow-hidden rounded-lg border border-neutral-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="reference" className="max-h-44 w-full bg-neutral-50 object-contain" />
          <button
            onClick={() => {
              setImg(null);
              setResult(null);
            }}
            className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white"
          >
            제거
          </button>
        </div>
      ) : (
        <DropZone compact multiple={false} label="디자인 레퍼런스 추가" onFiles={(u) => setImg(u[0] ?? null)} />
      )}
      {img && (
        <Btn variant="default" className="w-full" onClick={analyze} disabled={loading}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : null} {loading ? "분석 중…" : "구조 분석"}
        </Btn>
      )}
      {err && <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-600">{err}</div>}
      {result && (
        <div className="space-y-2 rounded-lg bg-neutral-50 p-2.5 text-[11px]">
          <div className="text-neutral-500">
            분석: <b className="text-neutral-800">{result.source === "llm" ? "Claude Vision" : "기본 규칙(키 없음)"}</b>
          </div>
          <div className="flex flex-wrap gap-1">
            {result.sectionOrder.map((s, i) => (
              <span key={i} className="rounded bg-white px-1.5 py-0.5 text-neutral-700 ring-1 ring-neutral-200">
                {SECTION_LABEL[s as SectionType] ?? s}
              </span>
            ))}
          </div>
          {result.notes?.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-neutral-600">
              {result.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-1.5">
            <Btn variant="primary" className="flex-1" onClick={() => onApply(result.sectionOrder as SectionType[], result.tone)}>
              이 구조 적용
            </Btn>
            <Btn variant="default" onClick={saveToLibrary} disabled={savingRef}>
              {savingRef ? <Loader2 size={11} className="animate-spin" /> : null} 라이브러리 저장
            </Btn>
          </div>
        </div>
      )}

      {saved && saved.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10.5px] font-semibold text-neutral-500">저장한 레퍼런스 {saved.length}개</div>
          <ul className="space-y-1">
            {saved.map((r) => (
              <li key={r.id} className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2 py-1.5">
                {r.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.thumbUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                ) : null}
                <button
                  onClick={() => {
                    const order = (r.analysis.sectionOrder ?? []) as SectionType[];
                    if (order.length) onApply(order, r.analysis.colorUsage);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[11px] font-semibold text-neutral-800">{r.name}</span>
                  <span className="block truncate text-[10px] text-neutral-400">
                    섹션 {r.analysis.sectionOrder?.length ?? 0}개 · 눌러서 적용
                  </span>
                </button>
                <button
                  onClick={async () => {
                    setSaved((p) => (p ?? []).filter((x) => x.id !== r.id));
                    await libraryApi.deleteReference(r.id).catch(() => void loadSaved());
                  }}
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100"
                >
                  <Trash2 size={11} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
