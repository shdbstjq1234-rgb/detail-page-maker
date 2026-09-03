"use client";

import { useRef, useState } from "react";
import { Send, Loader2, Check, RotateCw, Download, ChevronDown } from "lucide-react";
import type { EditorDoc } from "@/lib/editor-doc";
import { makeImage, SECTION_LABEL, SECTION_IMAGE_ROLE } from "@/lib/editor-doc";
import { uploadImage } from "@/lib/upload";
import { Btn, Select } from "./ui";

type Mutate = (fn: (d: EditorDoc) => void) => void;
type Ratio = "1:1" | "4:5" | "3:4" | "16:9" | "9:16";

interface Job {
  id: string;
  shot: string;
  prompt?: string;
  status: "planning" | "generating" | "done" | "error";
  images: string[];
  error?: string;
}

let jseq = 0;
const jid = () => `j${Date.now().toString(36)}_${jseq++}`;

/**
 * 이미지 제작 채팅 — 필요한 컷을 쉼표로 구분해 입력하면
 * 컷마다 개별 프롬프트를 만들고 Nano Banana 로 병렬 생성한다.
 */
export function ImageChat({
  doc,
  mutate,
  projectId,
}: {
  doc: EditorDoc;
  mutate: Mutate;
  projectId: string;
}) {
  const [text, setText] = useState("");
  const [ratio, setRatio] = useState<Ratio>("4:5");
  const [perShot, setPerShot] = useState(2);
  const [refUrl, setRefUrl] = useState<string>((doc.product.images ?? [])[0]?.url ?? "");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function runOne(job: Job) {
    const patch = (p: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, ...p } : j)));
    try {
      patch({ status: "planning" });
      const planRes = await fetch("/api/plan-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset: { key: "chat", label: job.shot, scene: job.shot, purpose: job.shot, group: "채팅" },
          product: { name: doc.product.name, category: doc.product.category, targetCustomer: doc.product.targetCustomer },
          usp: doc.usp?.primary?.headline ?? "",
          tokens: doc.designTokens,
          instruction: job.shot,
        }),
      });
      const planData = await planRes.json();
      const prompt: string = planData.ok ? planData.prompt : job.shot;
      patch({ prompt, status: "generating" });

      const genRes = await fetch("/api/regenerate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negativePrompt: planData.negativePrompt,
          aspectRatio: ratio,
          count: perShot,
          referenceImageUrl: refUrl || undefined,
        }),
      });
      const genData = await genRes.json();
      if (!genData.ok) throw new Error(genData.error ?? "생성 실패");
      patch({ status: "done", images: (genData.images as { url: string }[]).map((x) => x.url) });
    } catch (e) {
      patch({ status: "error", error: (e as Error).message });
    }
  }

  async function run() {
    const shots = text
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!shots.length) return;
    const newJobs: Job[] = shots.map((shot) => ({ id: jid(), shot, status: "planning", images: [] }));
    setJobs((js) => [...js, ...newJobs]);
    setText("");
    setRunning(true);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 50);
    await Promise.allSettled(newJobs.map(runOne));
    setRunning(false);
  }

  async function assign(url: string, sectionId: string) {
    if (!sectionId) return;
    const sec = doc.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const hosted = await uploadImage(url, { projectId, kind: "generated", filename: "chat" });
    mutate((d) => {
      const s = d.sections.find((x) => x.id === sectionId);
      if (!s) return;
      const role = SECTION_IMAGE_ROLE[s.type];
      const idx = s.images.findIndex((i) => i.role === role);
      const img = makeImage(hosted, role, s.copy.headline ?? "");
      if (idx >= 0) s.images[idx] = img;
      else s.images.push(img);
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="thin-scroll flex-1 space-y-4 overflow-y-auto p-6">
        {jobs.length === 0 ? (
          <div className="mx-auto max-w-[560px] rounded-xl border border-dashed border-neutral-300 bg-white/60 p-6 text-[12px] leading-relaxed text-neutral-500">
            필요한 컷을 <b>쉼표</b>로 구분해 한 번에 입력하세요. 컷마다 프롬프트를 따로 만들어 병렬 생성합니다.
            <div className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-[11px] text-neutral-400">
              예시 · 손에 든 히어로 컷, 거리 배경 라이프스타일, 케이스 씌운 컷, 각인 디테일 매크로, 다른 폰케이스와
              나란히 비교 컷, 협탁 위 무드 연출, 사용 장면 클로즈업
            </div>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="mx-auto max-w-[720px] rounded-xl border border-neutral-200 bg-white p-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-neutral-800">
                {job.status === "planning" && <Loader2 size={12} className="animate-spin text-neutral-400" />}
                {job.status === "generating" && <Loader2 size={12} className="animate-spin text-violet-500" />}
                {job.status === "done" && <Check size={12} className="text-emerald-600" />}
                {job.status === "error" && <span className="text-red-500">✕</span>}
                {job.shot}
                <span className="ml-auto text-[10px] font-normal text-neutral-400">
                  {job.status === "planning" ? "프롬프트 작성 중" : job.status === "generating" ? "이미지 생성 중" : ""}
                </span>
              </div>

              {job.prompt && (
                <details className="mt-1.5 text-[10px] text-neutral-400">
                  <summary className="cursor-pointer">프롬프트 보기</summary>
                  <p className="mt-1 whitespace-pre-wrap text-neutral-500">{job.prompt}</p>
                </details>
              )}

              {job.error && <div className="mt-2 rounded bg-red-50 px-2 py-1 text-[11px] text-red-600">{job.error}</div>}

              {job.images.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {job.images.map((u, i) => (
                    <ResultCard key={i} url={u} sections={doc.sections} onAssign={(sid) => assign(u, sid)} onRetry={() => runOne(job)} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-white p-3">
        <div className="mx-auto max-w-[720px] space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
            <span>레퍼런스</span>
            {(doc.product.images ?? []).map((pi, i) => (
              <button
                key={i}
                onClick={() => setRefUrl(pi.url)}
                className={`h-8 w-8 overflow-hidden rounded border ${
                  refUrl === pi.url ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pi.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            {(doc.product.images ?? []).length === 0 && <span className="text-neutral-400">상품 사진을 먼저 올리세요</span>}
            <Select value={ratio} onChange={(e) => setRatio(e.target.value as Ratio)} className="ml-2 w-20">
              {(["1:1", "4:5", "3:4", "16:9", "9:16"] as const).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
            <Select value={perShot} onChange={(e) => setPerShot(Number(e.target.value))} className="w-24">
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  컷당 {n}장
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void run();
                }
              }}
              rows={2}
              placeholder="필요한 컷을 쉼표로 구분해 입력 (⌘+Enter 로 전송)"
              className="flex-1 resize-none rounded-lg border border-neutral-200 px-3 py-2 text-[13px] outline-none focus:border-neutral-900"
            />
            <Btn variant="primary" onClick={run} disabled={running || !text.trim()}>
              {running ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  url,
  sections,
  onAssign,
  onRetry,
}: {
  url: string;
  sections: EditorDoc["sections"];
  onAssign: (sectionId: string) => void;
  onRetry: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [assigned, setAssigned] = useState(false);
  return (
    <div className="group relative overflow-hidden rounded-lg border border-neutral-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="aspect-square w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setMenu((v) => !v)}
          className="flex items-center gap-0.5 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800"
        >
          섹션에 넣기 <ChevronDown size={9} />
        </button>
        <a
          href={url}
          download="nano-banana.png"
          className="rounded bg-white/90 p-1 text-neutral-700"
          title="다운로드"
        >
          <Download size={11} />
        </a>
        <button onClick={onRetry} className="rounded bg-white/90 p-1 text-neutral-700" title="다시 생성">
          <RotateCw size={11} />
        </button>
      </div>
      {assigned && (
        <span className="absolute right-1 top-1 rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-bold text-white">
          배치됨
        </span>
      )}
      {menu && (
        <div className="absolute left-1.5 bottom-9 z-10 max-h-40 w-40 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
          {sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                onAssign(s.id);
                setAssigned(true);
                setMenu(false);
              }}
              className="block w-full px-2.5 py-1.5 text-left text-[11px] text-neutral-700 hover:bg-neutral-100"
            >
              {String(i + 1).padStart(2, "0")} {SECTION_LABEL[s.type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
