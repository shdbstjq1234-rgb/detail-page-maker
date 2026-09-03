"use client";

import { useMemo, useRef, useState } from "react";
import { Images, Loader2, RefreshCw, Check, AlertTriangle, Wand2, Play, Square } from "lucide-react";
import type { EditorDoc, ImageSlot } from "@/lib/editor-doc";
import { makeImage } from "@/lib/editor-doc";
import { planShots, shotToSlot, shotBrief, buildShotPrompt, type ShotSpec } from "@/lib/shot-planner";
import { runQueue } from "@/lib/generation-queue";
import { uploadImage } from "@/lib/upload";
import { SECTION_LABEL } from "@/lib/editor-doc";

type Mutate = (fn: (d: EditorDoc) => void) => void;

interface Progress {
  running: boolean;
  done: number;
  total: number;
  current: string | null;
}

/**
 * AI 이미지 제작 리스트.
 * 상품을 분석하면 필요한 컷을 먼저 제안하고, 체크한 것만 큐로 한 번에 만든다.
 * 생성 결과는 섹션에 자동 배치된다.
 */
export function ShotListPanel({ doc, mutate, projectId }: { doc: EditorDoc; mutate: Mutate; projectId: string }) {
  const [progress, setProgress] = useState<Progress>({ running: false, done: 0, total: 0, current: null });
  const [msg, setMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const specs = useMemo(() => planShots(doc.product), [doc.product]);
  const plan = doc.imagePlan ?? [];

  /** 리스트를 계획으로 만들거나(최초) 새 컷을 보강한다 */
  const ensurePlan = () =>
    mutate((d) => {
      const cur = d.imagePlan ?? [];
      const byKey = new Map(cur.map((s) => [s.presetKey, s]));
      const next: ImageSlot[] = specs.map((spec) => {
        const old = byKey.get(spec.key);
        const fresh = shotToSlot(spec, d.product, d.sections, d.designDirection?.visual, d.designDirection?.colorMoodPrompt);
        return old
          ? { ...fresh, id: old.id, enabled: old.enabled, prompt: old.prompt, chosen: old.chosen, candidates: old.candidates, versions: old.versions, status: old.status, sectionId: old.sectionId ?? fresh.sectionId }
          : fresh;
      });
      // 리스트에 없는 기존 슬롯(스튜디오에서 만든 것)은 유지
      for (const s of cur) if (!specs.some((x) => x.key === s.presetKey)) next.push(s);
      d.imagePlan = next;
    });

  const rows = plan.length ? plan : [];
  const selected = rows.filter((s) => s.enabled);
  const pending = selected.filter((s) => !s.chosen);

  const setAll = (on: boolean) =>
    mutate((d) => {
      for (const s of d.imagePlan ?? []) s.enabled = on;
    });

  const toggle = (id: string) =>
    mutate((d) => {
      const s = (d.imagePlan ?? []).find((x) => x.id === id);
      if (s) s.enabled = !s.enabled;
    });

  const setStatus = (id: string, status: ImageSlot["status"], error?: string) =>
    mutate((d) => {
      const s = (d.imagePlan ?? []).find((x) => x.id === id);
      if (s) {
        s.status = status;
        s.error = error;
      }
    });

  /** 실제 생성 — 큐(동시 2개) + 재시도, 결과는 한 번에 반영 */
  async function generate(targets: ImageSlot[]) {
    if (!targets.length || progress.running) return;
    setMsg(null);
    const cutout = (doc.product.images ?? [])[0]?.url;
    const visual = doc.designDirection?.visual;
    const colorMood = doc.designDirection?.colorMoodPrompt;
    const specByKey = new Map(specs.map((s) => [s.key, s]));

    setProgress({ running: true, done: 0, total: targets.length, current: "준비 중" });
    for (const t of targets) setStatus(t.id, "generating");
    const ac = new AbortController();
    abortRef.current = ac;

    const results = await runQueue(
      targets.map((slot) => ({
        id: slot.id,
        run: async () => {
          const spec = specByKey.get(slot.presetKey);
          const character = doc.characterSnapshot
            ? { id: doc.characterId ?? "", name: doc.characterSnapshot.name, images: doc.characterSnapshot.images, active: true,
                genderPresentation: doc.characterSnapshot.genderPresentation, ageRange: doc.characterSnapshot.ageRange }
            : null;
          const prompt = spec ? buildShotPrompt(spec, doc.product, visual, colorMood, character) : slot.prompt;
          // 모델컷이면 캐릭터 참고 이미지를 함께 넘긴다 (얼굴/체형만 사용)
          const charRef = /model|모델|착용|lifestyle|라이프/i.test(slot.label) ? doc.characterSnapshot?.images?.[0] : undefined;
          const res = await fetch("/api/regenerate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              negativePrompt: slot.negativePrompt,
              aspectRatio: slot.ratio,
              count: 1,
              referenceImageUrl: slot.referenceUrl || cutout,
              characterImageUrl: charRef,
            }),
          });
          const data = await res.json();
          if (!data.ok || !data.images?.[0]?.url) throw new Error(data.error ?? "이미지 생성 실패");
          const hosted = await uploadImage(data.images[0].url, {
            projectId,
            kind: "generated",
            filename: slot.presetKey,
          }).catch(() => data.images[0].url as string);
          return { url: hosted, prompt };
        },
      })),
      {
        concurrency: 2,
        retries: 1,
        signal: ac.signal,
        onEvent: (e) => {
          const label = targets.find((t) => t.id === e.id)?.label ?? "";
          setProgress((p) => ({ ...p, done: e.done, current: label }));
        },
      },
    );

    // 결과를 한 번의 mutate 로 반영 (경합 방지) + 섹션 자동 배치
    mutate((d) => {
      for (const r of results) {
        const slot = (d.imagePlan ?? []).find((x) => x.id === r.id);
        if (!slot) continue;
        if (r.ok && r.result) {
          slot.chosen = r.result.url;
          slot.prompt = r.result.prompt;
          slot.status = "done";
          slot.error = undefined;
          if (!slot.versions.some((v) => v.url === r.result!.url))
            slot.versions.push({ url: r.result.url, prompt: r.result.prompt, at: new Date().toISOString() });
          if (slot.sectionId) {
            const sec = d.sections.find((x) => x.id === slot.sectionId);
            if (sec) {
              const idx = sec.images.findIndex((i) => i.role === slot.role);
              const img = makeImage(r.result.url, slot.role, slot.label);
              if (idx >= 0) sec.images[idx] = img;
              else sec.images.push(img);
            }
          }
        } else {
          slot.status = "error";
          slot.error = r.error ?? "실패";
        }
      }
    });

    const ok = results.filter((r) => r.ok).length;
    setProgress({ running: false, done: 0, total: 0, current: null });
    setMsg(
      ok === results.length
        ? `${ok}개 이미지를 만들어 섹션에 배치했어요.`
        : `${ok}/${results.length}개 완료. 실패한 컷은 개별로 다시 만들 수 있어요.`,
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
          <Images size={12} /> AI 이미지 제작 리스트
        </h3>
        <button
          onClick={ensurePlan}
          title="상품 분석으로 컷 목록 다시 만들기"
          className="ml-auto rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <RefreshCw size={11} />
        </button>
      </div>

      {rows.length === 0 ? (
        <button
          onClick={ensurePlan}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 py-3 text-[11.5px] font-semibold text-neutral-500 hover:border-neutral-500 hover:text-neutral-800"
        >
          <Wand2 size={12} /> 필요한 이미지 컷 분석하기
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2 text-[10.5px] text-neutral-500">
            <button onClick={() => setAll(true)} className="font-semibold text-neutral-700 underline-offset-2 hover:underline">
              전체 선택
            </button>
            <span className="text-neutral-300">|</span>
            <button onClick={() => setAll(false)} className="font-semibold text-neutral-700 underline-offset-2 hover:underline">
              전체 해제
            </button>
            <span className="ml-auto">
              {selected.length}/{rows.length} 선택
            </span>
          </div>

          <ul className="space-y-1">
            {rows.map((s) => {
              const spec = specs.find((x) => x.key === s.presetKey);
              return (
                <li
                  key={s.id}
                  className={`rounded-lg border px-2 py-1.5 transition-colors ${
                    s.enabled ? "border-neutral-300 bg-white" : "border-neutral-200 bg-neutral-50/60"
                  }`}
                >
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={() => toggle(s.id)}
                      className="mt-0.5 accent-neutral-900"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-[11.5px] font-semibold text-neutral-800">
                        <span className="truncate">{s.label}</span>
                        <StatusDot status={s.status} hasImage={Boolean(s.chosen)} />
                      </div>
                      <div className="truncate text-[10px] text-neutral-500">
                        {spec ? shotBrief(spec) : `${s.purpose} · ${s.ratio}`}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        배치: {s.sectionId ? SECTION_LABEL[doc.sections.find((x) => x.id === s.sectionId)?.type ?? "feature"] : "미배치"}
                      </div>
                      {s.error && <div className="mt-0.5 text-[10px] text-red-500">{s.error}</div>}
                    </div>
                    {s.chosen && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.chosen} alt="" className="h-10 w-10 shrink-0 rounded border border-neutral-200 object-cover" />
                    )}
                  </label>
                  {(s.chosen || s.status === "error") && (
                    <button
                      onClick={() => generate([s])}
                      disabled={progress.running}
                      className="mt-1 w-full rounded border border-neutral-200 py-1 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                    >
                      이 컷만 다시 생성
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {progress.running ? (
            <div className="space-y-1.5 rounded-lg border border-neutral-200 bg-white p-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-700">
                <Loader2 size={11} className="animate-spin" />
                생성 중 {progress.done}/{progress.total}
                {progress.current ? ` · ${progress.current}` : ""}
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full bg-neutral-900 transition-all"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
              <button
                onClick={() => abortRef.current?.abort()}
                className="flex w-full items-center justify-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-700"
              >
                <Square size={9} /> 중지
              </button>
            </div>
          ) : (
            <button
              onClick={() => generate(pending.length ? pending : selected)}
              disabled={selected.length === 0}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-700 py-2 text-[12px] font-bold text-white hover:bg-violet-800 disabled:opacity-40"
            >
              <Play size={12} />
              선택 이미지 일괄 생성 {pending.length > 0 ? `(${pending.length})` : selected.length > 0 ? `(다시 ${selected.length})` : ""}
            </button>
          )}

          {msg && <p className="text-[10.5px] text-neutral-500">{msg}</p>}
        </>
      )}
    </section>
  );
}

function StatusDot({ status, hasImage }: { status: ImageSlot["status"]; hasImage: boolean }) {
  if (status === "generating") return <Loader2 size={10} className="shrink-0 animate-spin text-violet-500" />;
  if (status === "error") return <AlertTriangle size={10} className="shrink-0 text-red-500" />;
  if (hasImage || status === "done") return <Check size={10} className="shrink-0 text-emerald-600" />;
  return <span className="shrink-0 text-[9px] text-neutral-400">대기</span>;
}
