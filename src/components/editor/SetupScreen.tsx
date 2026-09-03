"use client";

import { useState } from "react";
import { Sparkles, Loader2, Star, Trash2, Upload, ChevronDown } from "lucide-react";
import type { PipelineEvent, ProductImageRef } from "@/types/detail-page";
import type { EditorDoc } from "@/lib/editor-doc";
import { uploadImage } from "@/lib/upload";
import { STAGE_TEXT, stageProgress } from "@/lib/pipeline-stages";
import { DropZone, Field, TextArea, TextInput } from "./ui";

type Mutate = (fn: (d: EditorDoc) => void) => void;

/** 새 프로젝트 첫 화면 — 사진 올리고 상품명만 넣으면 바로 생성 */
export function SetupScreen({
  doc,
  mutate,
  projectId,
  onGenerate,
  onStop,
  running,
  events,
  error,
}: {
  doc: EditorDoc;
  mutate: Mutate;
  projectId: string;
  onGenerate: () => void;
  onStop: () => void;
  running: boolean;
  events: PipelineEvent[];
  error: string | null;
}) {
  const p = doc.product;
  const [more, setMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imgs = p.images ?? [];
  const canGo = Boolean(p.name?.trim()) || imgs.length > 0;

  const lastStage = events.length ? events[events.length - 1].stage : null;

  if (running) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="w-full max-w-[420px] text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <Loader2 className="animate-spin" size={22} />
          </div>
          <div className="text-[15px] font-bold text-neutral-900">
            {lastStage ? STAGE_TEXT[lastStage] : "준비하고 있습니다"}
          </div>
          <div className="mx-auto mt-4 h-1.5 w-full max-w-[300px] overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full bg-neutral-900 transition-all duration-500" style={{ width: `${stageProgress(lastStage)}%` }} />
          </div>
          <div className="mt-4 space-y-1 text-[12px] text-neutral-400">
            {events.filter((e) => e.status === "success").slice(-4).map((e, i) => (
              <div key={i}>✓ {e.message}</div>
            ))}
          </div>
          <button onClick={onStop} className="mt-6 text-[12px] text-neutral-400 underline hover:text-neutral-700">
            중지
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-6 py-10">
      <h1 className="text-[22px] font-bold tracking-tight text-neutral-900">상품을 등록하세요</h1>
      <p className="mt-1.5 text-[13px] text-neutral-500">
        사진과 상품명만 있으면 AI가 타깃 · 판매 포인트 · 구성 · 카피 · 이미지까지 한 번에 만듭니다.
      </p>

      {/* 사진 */}
      <div className="mt-6">
        <div className="mb-2 text-[12px] font-semibold text-neutral-700">상품 사진</div>
        <DropZone
          label={uploading ? "업로드 중…" : "사진을 여기에 끌어다 놓거나 클릭 (JPG · PNG · WEBP, 여러 장 가능)"}
          onFiles={async (urls) => {
            setUploading(true);
            const hosted = await Promise.all(
              urls.map((u, i) => uploadImage(u, { projectId, kind: "original", filename: `orig${i}` })),
            );
            mutate((d) => {
              d.product.images = [...(d.product.images ?? []), ...hosted.map((url): ProductImageRef => ({ url, kind: "product" }))];
            });
            setUploading(false);
          }}
        />
        {imgs.length > 0 && (
          <div className="mt-2 grid grid-cols-5 gap-2">
            {imgs.map((img, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-neutral-900 px-1 py-0.5 text-[9px] font-bold text-white">대표</span>
                )}
                <div className="absolute inset-x-1 bottom-1 hidden justify-between group-hover:flex">
                  <button
                    onClick={() =>
                      mutate((d) => {
                        const a = d.product.images ?? [];
                        const [m] = a.splice(i, 1);
                        a.unshift(m);
                      })
                    }
                    className="rounded bg-black/70 p-1 text-white"
                    title="대표 이미지로"
                  >
                    <Star size={9} />
                  </button>
                  <button
                    onClick={() => mutate((d) => void (d.product.images = (d.product.images ?? []).filter((_, j) => j !== i)))}
                    className="rounded bg-black/70 p-1 text-white"
                    title="삭제"
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 필수 최소 정보 */}
      <div className="mt-5 space-y-3">
        <Field label="상품명">
          <TextInput
            value={p.name ?? ""}
            placeholder="예: 저소음 미니 가습기 300ml"
            onChange={(e) => mutate((d) => void (d.product.name = e.target.value))}
            className="!py-2.5 !text-[14px]"
          />
        </Field>
        <Field label="상품 설명 · 주요 특징" hint="아는 만큼만">
          <TextArea
            rows={3}
            value={p.description ?? ""}
            placeholder="소재, 크기, 핵심 기능, 어떤 상황에서 쓰는지 등을 자유롭게"
            onChange={(e) => mutate((d) => void (d.product.description = e.target.value))}
          />
        </Field>
        <Field label="판매 채널">
          <div className="flex gap-1.5">
            {["쿠팡", "네이버 스마트스토어", "기타"].map((ch) => (
              <button
                key={ch}
                onClick={() => mutate((d) => void (d.product.salesChannel = d.product.salesChannel === ch ? "" : ch))}
                className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors ${
                  p.salesChannel === ch
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* 추가 정보 (접힘) */}
      <button
        onClick={() => setMore((v) => !v)}
        className="mt-4 flex items-center gap-1 text-[12px] font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ChevronDown size={14} className={`transition-transform ${more ? "rotate-180" : ""}`} />
        추가 정보 (선택) — 타깃 · USP · 구조는 안 넣어도 AI가 분석합니다
      </button>
      {more && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <Field label="카테고리">
            <TextInput value={p.category ?? ""} placeholder="생활가전/가습기" onChange={(e) => mutate((d) => void (d.product.category = e.target.value))} />
          </Field>
          <Field label="가격(원)">
            <TextInput
              type="number"
              value={p.price ?? ""}
              placeholder="29900"
              onChange={(e) => mutate((d) => void (d.product.price = e.target.value ? Number(e.target.value) : undefined))}
            />
          </Field>
          <Field label="타깃 고객">
            <TextInput value={p.targetCustomer ?? ""} placeholder="비워두면 AI가 분석" onChange={(e) => mutate((d) => void (d.product.targetCustomer = e.target.value))} />
          </Field>
          <Field label="브랜드 톤">
            <TextInput value={p.brandTone ?? ""} placeholder="미니멀·프리미엄" onChange={(e) => mutate((d) => void (d.product.brandTone = e.target.value))} />
          </Field>
          <div className="col-span-2">
            <Field label="추가 요청사항">
              <TextArea rows={2} value={p.extraRequest ?? ""} placeholder="가격은 강조하지 말고 품질 위주로 / 20대 여성 타깃 등" onChange={(e) => mutate((d) => void (d.product.extraRequest = e.target.value))} />
            </Field>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</div>
      )}

      <button
        onClick={onGenerate}
        disabled={!canGo}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
      >
        <Sparkles size={16} /> AI 상세페이지 만들기
      </button>
      {!canGo && <p className="mt-2 text-center text-[11px] text-neutral-400">상품명 또는 사진을 최소 1개 넣어주세요.</p>}
      <p className="mt-2 text-center text-[11px] text-neutral-400">예상 소요 시간: 30초 ~ 3분</p>
    </div>
  );
}
