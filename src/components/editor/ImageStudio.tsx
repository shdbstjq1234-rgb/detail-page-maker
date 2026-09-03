"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Sparkles,
  Loader2,
  RefreshCw,
  Wand2,
  ImagePlus,
  Check,
  History,
  AlertTriangle,
  Download,
} from "lucide-react";
import type { EditorDoc, ImageSlot } from "@/lib/editor-doc";
import { collectGeneratedImages, makeImage, SECTION_LABEL } from "@/lib/editor-doc";
import { PRESET_GROUPS, presetByKey } from "@/lib/image-presets";
import { uploadImage } from "@/lib/upload";
import { downloadUrlsZip } from "@/lib/export-image";
import { ImageChat } from "./ImageChat";
import { Btn, DropZone, Select, TextArea } from "./ui";

type Mutate = (fn: (d: EditorDoc) => void) => void;

/** 동시 실행 개수를 제한한 map */
async function pMap<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export function ImageStudio({
  open,
  onClose,
  doc,
  mutate,
  projectId,
  focusSectionId,
  onRecompute,
  autoRun = false,
}: {
  open: boolean;
  onClose: () => void;
  doc: EditorDoc;
  mutate: Mutate;
  projectId: string;
  focusSectionId: string | null;
  onRecompute: () => void;
  /** 열리자마자 "누끼컷으로 전체 자동 생성" 을 1회 실행 */
  autoRun?: boolean;
}) {
  const plan = useMemo(() => doc.imagePlan ?? [], [doc.imagePlan]);
  const [selId, setSelId] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ running: boolean; done: number; total: number; current: string | null }>({
    running: false,
    done: 0,
    total: 0,
    current: null,
  });
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [batchMsg, setBatchMsg] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [tab, setTab] = useState<"grid" | "chat">("grid");
  const autoStarted = useRef(false);

  async function downloadZip() {
    const imgs = collectGeneratedImages(doc);
    if (!imgs.length) {
      setBatchMsg("아직 저장된 생성 이미지가 없어요.");
      return;
    }
    setZipBusy(true);
    setBatchMsg(null);
    try {
      const safe = (doc.product.name || "detail-page").replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ.-]/g, "_").slice(0, 40);
      const r = await downloadUrlsZip(`${safe}_images.zip`, imgs);
      setBatchMsg(`이미지 ${r.ok}개를 ZIP 으로 저장했어요${r.failed ? ` (${r.failed}개 실패)` : ""}.`);
    } catch (e) {
      setBatchMsg(e instanceof Error ? e.message : "ZIP 저장 실패");
    } finally {
      setZipBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (focusSectionId) {
      const s = plan.find((x) => x.sectionId === focusSectionId);
      if (s) {
        setSelId(s.id);
        return;
      }
    }
    setSelId((cur) => cur ?? plan[0]?.id ?? null);
  }, [open, focusSectionId, plan]);

  if (!open) return null;

  const sel = plan.find((s) => s.id === selId) ?? null;
  const enabledPending = plan.filter((s) => s.enabled && !s.chosen);

  const patchSlot = (id: string, patch: Partial<ImageSlot>) =>
    mutate((d) => {
      const s = (d.imagePlan ?? []).find((x) => x.id === id);
      if (s) Object.assign(s, patch);
    });

  /** 선택 이미지를 대상 섹션에 배치 (같은 role 이미지 교체). 큰 data URL 은 저장/축소 후 삽입 */
  const applyToSection = async (slot: ImageSlot, url: string) => {
    const stored = await uploadImage(url, { projectId, kind: "generated", filename: slot.presetKey });
    mutate((d) => {
      const s = (d.imagePlan ?? []).find((x) => x.id === slot.id);
      if (s) {
        s.chosen = stored;
        s.status = "done";
        if (!s.versions.some((v) => v.url === stored))
          s.versions.push({ url: stored, prompt: s.prompt, at: new Date().toISOString() });
      }
      if (!slot.sectionId) return;
      const sec = d.sections.find((x) => x.id === slot.sectionId);
      if (!sec) return;
      const idx = sec.images.findIndex((i) => i.role === slot.role);
      const img = makeImage(stored, slot.role, slot.label);
      if (idx >= 0) sec.images[idx] = img;
      else sec.images.push(img);
    });
  };

  async function planPrompt(slot: ImageSlot, instruction?: string): Promise<Partial<ImageSlot>> {
    patchSlot(slot.id, { status: "planning" });
    try {
      const preset = presetByKey(slot.presetKey);
      const section = doc.sections.find((s) => s.id === slot.sectionId);
      const res = await fetch("/api/plan-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset: { key: slot.presetKey, label: slot.label, scene: preset?.scene, purpose: slot.purpose, role: slot.role, group: preset?.group },
          product: { name: doc.product.name, category: doc.product.category, targetCustomer: doc.product.targetCustomer },
          section: section ? { type: section.type, headline: section.copy.headline } : undefined,
          usp: doc.usp?.primary?.headline ?? "",
          tokens: doc.designTokens,
          currentPrompt: slot.prompt,
          instruction,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "프롬프트 생성 실패");
      const patch: Partial<ImageSlot> = {
        prompt: data.prompt || slot.prompt,
        negativePrompt: data.negativePrompt || slot.negativePrompt,
        planDetail: data.planDetail || slot.planDetail,
        status: "idle",
      };
      patchSlot(slot.id, patch);
      return patch;
    } catch (e) {
      patchSlot(slot.id, { status: "error", error: (e as Error).message });
      return {};
    }
  }

  async function generate(slot: ImageSlot, count = 3) {
    patchSlot(slot.id, { status: "generating", error: undefined });
    try {
      const res = await fetch("/api/regenerate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: slot.prompt,
          negativePrompt: slot.negativePrompt,
          aspectRatio: slot.ratio,
          count,
          referenceImageUrl: slot.referenceUrl,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "이미지 생성 실패");
      const urls = (data.images as { url: string }[]).map((i) => i.url);
      patchSlot(slot.id, { candidates: urls, status: urls.length ? "idle" : "error" });
      return urls;
    } catch (e) {
      patchSlot(slot.id, { status: "error", error: (e as Error).message });
      return [];
    }
  }

  async function runBatch() {
    setConfirmBatch(false);
    const targets = (doc.imagePlan ?? []).filter((s) => s.enabled && !s.chosen);
    setBatch({ running: true, done: 0, total: targets.length, current: null });
    for (const slot of targets) {
      setBatch((b) => ({ ...b, current: slot.label }));
      // 프롬프트가 기본값이면 먼저 기획 (결과를 직접 이어받아 사용)
      let s: ImageSlot = slot;
      if (!slot.planDetail) {
        const planned = await planPrompt(slot);
        s = { ...slot, ...planned };
      }
      const urls = await generate(s, 2);
      if (urls[0]) await applyToSection(s, urls[0]);
      setBatch((b) => ({ ...b, done: b.done + 1 }));
    }
    setBatch({ running: false, done: 0, total: 0, current: null });
  }

  // ── 상태를 건드리지 않는 순수 호출 (병렬 배치용) ─────────────────
  async function planPromptPure(slot: ImageSlot): Promise<Partial<ImageSlot>> {
    try {
      const preset = presetByKey(slot.presetKey);
      const section = doc.sections.find((s) => s.id === slot.sectionId);
      const res = await fetch("/api/plan-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset: { key: slot.presetKey, label: slot.label, scene: preset?.scene, purpose: slot.purpose, role: slot.role, group: preset?.group },
          product: { name: doc.product.name, category: doc.product.category, targetCustomer: doc.product.targetCustomer },
          section: section ? { type: section.type, headline: section.copy.headline } : undefined,
          usp: doc.usp?.primary?.headline ?? "",
          tokens: doc.designTokens,
          currentPrompt: slot.prompt,
        }),
      });
      const data = await res.json();
      if (!data.ok) return {};
      return {
        prompt: data.prompt || slot.prompt,
        negativePrompt: data.negativePrompt || slot.negativePrompt,
        planDetail: data.planDetail || slot.planDetail,
      };
    } catch {
      return {};
    }
  }

  async function generatePure(slot: ImageSlot, count: number): Promise<string[]> {
    try {
      const res = await fetch("/api/regenerate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: slot.prompt,
          negativePrompt: slot.negativePrompt,
          aspectRatio: slot.ratio,
          count,
          referenceImageUrl: slot.referenceUrl,
        }),
      });
      const data = await res.json();
      if (!data.ok) return [];
      return (data.images as { url: string }[]).map((i) => i.url).filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * 누끼컷 기준 전체 이미지 자동 생성 → 섹션 순서대로 자동 배치.
   * 섹션에 배치될(=sectionId 있는) 미확정 슬롯을 대상으로,
   * 프롬프트 기획 → 병렬 생성(동시 3개) → Storage 저장 → 한 번의 mutate 로 배치.
   */
  async function runFullAuto() {
    if (batch.running) return;
    setConfirmBatch(false);
    setBatchMsg(null);
    const cutout = (doc.product.images ?? [])[0]?.url;
    const targets = (doc.imagePlan ?? []).filter((s) => s.sectionId && !s.chosen);
    if (!targets.length) {
      setBatchMsg("배치할 이미지 슬롯이 없어요. 먼저 상세페이지를 생성하거나 ‘이미지 다시 분석’을 눌러주세요.");
      return;
    }
    setBatch({ running: true, done: 0, total: targets.length, current: "준비 중" });

    const results = await pMap(targets, 3, async (slot) => {
      let s: ImageSlot = { ...slot, referenceUrl: slot.referenceUrl || cutout };
      setBatch((b) => ({ ...b, current: s.label }));
      if (!s.planDetail) {
        const planned = await planPromptPure(s);
        s = { ...s, ...planned };
      }
      const urls = await generatePure(s, 2);
      let hosted: string | undefined;
      if (urls[0]) {
        try {
          hosted = await uploadImage(urls[0], { projectId, kind: "generated", filename: s.presetKey });
        } catch {
          hosted = urls[0];
        }
      }
      setBatch((b) => ({ ...b, done: b.done + 1 }));
      return {
        slotId: slot.id,
        sectionId: slot.sectionId,
        role: slot.role,
        label: slot.label,
        hosted,
        candidates: urls,
        prompt: s.prompt,
        negativePrompt: s.negativePrompt,
        planDetail: s.planDetail,
      };
    });

    // 경합 방지: 결과를 한 번의 mutate 로 반영
    mutate((d) => {
      for (const r of results) {
        const slot = (d.imagePlan ?? []).find((x) => x.id === r.slotId);
        if (slot) {
          slot.enabled = true;
          slot.prompt = r.prompt;
          slot.negativePrompt = r.negativePrompt;
          slot.planDetail = r.planDetail;
          slot.candidates = r.candidates;
          if (r.hosted) {
            slot.chosen = r.hosted;
            slot.status = "done";
            slot.error = undefined;
            if (!slot.versions.some((v) => v.url === r.hosted))
              slot.versions.push({ url: r.hosted, prompt: r.prompt, at: new Date().toISOString() });
          } else {
            slot.status = "error";
            slot.error = "이미지 생성 실패";
          }
        }
        if (r.hosted && r.sectionId) {
          const sec = d.sections.find((x) => x.id === r.sectionId);
          if (sec) {
            const idx = sec.images.findIndex((i) => i.role === r.role);
            const img = makeImage(r.hosted, r.role, r.label);
            if (idx >= 0) sec.images[idx] = img;
            else sec.images.push(img);
          }
        }
      }
    });

    const okN = results.filter((r) => r.hosted).length;
    setBatch({ running: false, done: 0, total: 0, current: null });
    setBatchMsg(
      okN === results.length
        ? `${okN}개 이미지를 만들어 섹션에 순서대로 배치했어요.`
        : `${okN}/${results.length}개 배치 완료. 실패한 슬롯은 개별로 다시 생성할 수 있어요.`,
    );
  }

  // autoRun: 열리자마자 1회 자동 실행
  useEffect(() => {
    if (open && autoRun && !autoStarted.current && (doc.imagePlan ?? []).some((s) => s.sectionId && !s.chosen)) {
      autoStarted.current = true;
      void runFullAuto();
    }
    if (!open) autoStarted.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoRun]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#F7F7F5]">
      {/* header */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4">
        <Sparkles size={15} className="text-violet-600" />
        <span className="text-[13px] font-bold">AI 이미지 스튜디오</span>
        <div className="ml-1 flex rounded-lg border border-neutral-200 p-0.5 text-[11px] font-semibold">
          <button
            onClick={() => setTab("grid")}
            className={`rounded-md px-2.5 py-1 ${tab === "grid" ? "bg-neutral-900 text-white" : "text-neutral-500"}`}
          >
            프리셋 그리드
          </button>
          <button
            onClick={() => setTab("chat")}
            className={`rounded-md px-2.5 py-1 ${tab === "chat" ? "bg-neutral-900 text-white" : "text-neutral-500"}`}
          >
            이미지 채팅
          </button>
        </div>
        <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
          제품 원형(형태·색·로고) 유지
        </span>
        {tab === "grid" && (
          <button onClick={onRecompute} className="ml-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-neutral-500 hover:bg-neutral-100">
            <RefreshCw size={12} /> 이미지 다시 분석
          </button>
        )}
        <button onClick={onClose} className="ml-auto rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100">
          <X size={16} />
        </button>
      </header>

      {tab === "chat" ? (
        <ImageChat doc={doc} mutate={mutate} projectId={projectId} />
      ) : (
      <>
      <div className="flex min-h-0 flex-1">
        {/* preset list */}
        <aside className="thin-scroll w-[290px] shrink-0 overflow-y-auto border-r border-neutral-200 bg-white p-3">
          <p className="mb-2 text-[11px] text-neutral-500">
            상품 분석 기반 추천 목록입니다. 필요한 것만 켜세요.
          </p>
          {PRESET_GROUPS.map((g) => {
            const rows = plan.filter((s) => presetByKey(s.presetKey)?.group === g);
            if (!rows.length) return null;
            return (
              <div key={g} className="mb-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{g}</div>
                <div className="space-y-1">
                  {rows.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelId(s.id)}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                        selId === s.id ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => patchSlot(s.id, { enabled: e.target.checked })}
                        className="mt-0.5 accent-neutral-900"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-[12px] font-semibold text-neutral-800">
                          {s.label}
                          {s.chosen && <Check size={11} className="text-emerald-600" />}
                          {s.status === "generating" && <Loader2 size={10} className="animate-spin text-neutral-400" />}
                          {s.status === "error" && <AlertTriangle size={10} className="text-red-500" />}
                        </div>
                        <div className="truncate text-[10px] text-neutral-400">{s.purpose}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </aside>

        {/* slot editor */}
        <main className="thin-scroll flex-1 overflow-y-auto p-6">
          {!sel ? (
            <div className="flex h-full items-center justify-center text-[13px] text-neutral-400">
              왼쪽에서 이미지를 선택하세요.
            </div>
          ) : (
            <div className="mx-auto max-w-[640px] space-y-4">
              <div>
                <div className="text-[15px] font-bold text-neutral-900">{sel.label}</div>
                <div className="text-[12px] text-neutral-500">{sel.purpose}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-neutral-600">배치 섹션</span>
                  <Select
                    value={sel.sectionId ?? ""}
                    onChange={(e) => patchSlot(sel.id, { sectionId: e.target.value || null })}
                  >
                    <option value="">미배치</option>
                    {doc.sections.map((s, i) => (
                      <option key={s.id} value={s.id}>
                        {String(i + 1).padStart(2, "0")} {SECTION_LABEL[s.type]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-neutral-600">비율</span>
                  <Select value={sel.ratio} onChange={(e) => patchSlot(sel.id, { ratio: e.target.value as never })}>
                    {(["1:1", "4:5", "3:4", "16:9", "9:16"] as const).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              {/* reference */}
              <div>
                <span className="mb-1 block text-[11px] font-semibold text-neutral-600">레퍼런스 이미지 (제품 원형 유지용)</span>
                <div className="flex gap-2">
                  {sel.referenceUrl && (
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-neutral-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sel.referenceUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap gap-1">
                      {(doc.product.images ?? []).map((pi, i) => (
                        <button
                          key={i}
                          onClick={() => patchSlot(sel.id, { referenceUrl: pi.url })}
                          className={`h-9 w-9 overflow-hidden rounded border ${
                            sel.referenceUrl === pi.url ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={pi.url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <DropZone
                      compact
                      multiple={false}
                      label="레퍼런스 추가 업로드"
                      onFiles={async (urls) => {
                        const u = await uploadImage(urls[0], { projectId, kind: "original", filename: "ref" });
                        patchSlot(sel.id, { referenceUrl: u });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* prompt */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-neutral-600">Higgsfield 프롬프트</span>
                  <Btn variant="default" onClick={() => planPrompt(sel)} disabled={sel.status === "planning"}>
                    <Wand2 size={12} /> {sel.status === "planning" ? "작성 중…" : "프롬프트 자동작성"}
                  </Btn>
                </div>
                <TextArea
                  rows={4}
                  value={sel.prompt}
                  onChange={(e) => patchSlot(sel.id, { prompt: e.target.value })}
                  className="!text-[11px]"
                />
              </div>

              {sel.planDetail && (
                <details className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px]">
                  <summary className="cursor-pointer font-semibold text-neutral-500">촬영 기획서 보기</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-neutral-600">{sel.planDetail}</pre>
                </details>
              )}

              {/* NL edit */}
              <NlEdit onApply={(instr) => planPrompt(sel, instr)} busy={sel.status === "planning"} />

              <div className="flex gap-2">
                <Btn variant="primary" className="flex-1" onClick={() => generate(sel)} disabled={sel.status === "generating"}>
                  <ImagePlus size={13} />
                  {sel.status === "generating" ? "생성 중…" : sel.candidates.length ? "다시 생성 / 다른 버전" : "AI 이미지 생성"}
                </Btn>
              </div>
              {sel.error && <div className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600">{sel.error}</div>}

              {sel.candidates.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] text-neutral-500">후보 · 클릭하면 섹션에 배치됩니다</div>
                  <div className="grid grid-cols-3 gap-2">
                    {sel.candidates.map((u, i) => (
                      <button
                        key={i}
                        onClick={() => applyToSection(sel, u)}
                        className={`relative overflow-hidden rounded-lg border-2 ${
                          sel.chosen === u ? "border-neutral-900" : "border-neutral-200 hover:border-neutral-400"
                        }`}
                        style={{ aspectRatio: sel.ratio.replace(":", "/") }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt="" className="h-full w-full object-cover" />
                        {sel.chosen === u && (
                          <span className="absolute right-1 top-1 rounded bg-neutral-900 p-0.5 text-white">
                            <Check size={10} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sel.versions.length > 1 && (
                <div>
                  <div className="mb-1 flex items-center gap-1 text-[11px] text-neutral-500">
                    <History size={11} /> 버전 기록
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {sel.versions.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => applyToSection(sel, v.url)}
                        className={`h-14 w-14 shrink-0 overflow-hidden rounded border ${
                          sel.chosen === v.url ? "border-neutral-900" : "border-neutral-200"
                        }`}
                        title={`V${i + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.url} alt={`V${i + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* batch bar */}
      <footer className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3">
        {batch.running ? (
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="animate-spin text-neutral-500" />
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-neutral-700">
                이미지 제작 중… {batch.done}/{batch.total} {batch.current ? `· ${batch.current}` : ""}
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full bg-neutral-900 transition-all"
                  style={{ width: `${batch.total ? (batch.done / batch.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        ) : confirmBatch ? (
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-[12px] text-neutral-700">
              {enabledPending.length}개 이미지를 생성합니다. 실제 이미지 생성기 사용 시 비용이 발생할 수 있어요.
            </span>
            <Btn variant="primary" className="ml-auto" onClick={runBatch}>
              {enabledPending.length}개 제작 시작
            </Btn>
            <Btn variant="default" onClick={() => setConfirmBatch(false)}>
              취소
            </Btn>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-neutral-800">누끼컷으로 전체 이미지 자동 제작</div>
                <div className="truncate text-[11px] text-neutral-400">
                  {batchMsg ??
                    `섹션에 배치될 ${plan.filter((s) => s.sectionId && !s.chosen).length}개를 한 번에 만들어 순서대로 넣습니다`}
                </div>
              </div>
              <Btn
                variant="primary"
                className="ml-auto shrink-0"
                disabled={plan.filter((s) => s.sectionId && !s.chosen).length === 0}
                onClick={runFullAuto}
              >
                <Sparkles size={13} /> 전체 자동 제작
              </Btn>
            </div>
            <div className="flex items-center gap-2 border-t border-neutral-100 pt-2">
              <span className="text-[11px] text-neutral-400">
                또는 왼쪽에서 켠 항목만 · 선택됨 <b className="text-neutral-700">{enabledPending.length}</b>개
              </span>
              <Btn
                variant="default"
                className="ml-auto"
                disabled={enabledPending.length === 0}
                onClick={() => setConfirmBatch(true)}
              >
                선택 항목만 제작
              </Btn>
              <Btn variant="default" onClick={downloadZip} disabled={zipBusy}>
                {zipBusy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                생성 이미지 ZIP
              </Btn>
            </div>
          </div>
        )}
      </footer>
      </>
      )}
    </div>
  );
}

function NlEdit({ onApply, busy }: { onApply: (instr: string) => void; busy: boolean }) {
  const [t, setT] = useState("");
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-2.5">
      <div className="mb-1 text-[11px] font-bold text-violet-900">말로 프롬프트 수정</div>
      <div className="flex gap-1.5">
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && t.trim()) {
              onApply(t.trim());
              setT("");
            }
          }}
          placeholder="예: 제품을 더 크게 / 배경 흰색으로 / 한국인 30대 여성으로"
          className="flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] outline-none focus:border-neutral-900"
        />
        <Btn
          variant="primary"
          disabled={busy || !t.trim()}
          onClick={() => {
            onApply(t.trim());
            setT("");
          }}
        >
          반영
        </Btn>
      </div>
    </div>
  );
}
