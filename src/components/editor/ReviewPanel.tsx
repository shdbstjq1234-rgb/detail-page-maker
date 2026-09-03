"use client";

import { useState } from "react";
import { Star, Trash2, Sparkles, Loader2, MessageSquarePlus, ImagePlus } from "lucide-react";
import type { EditorDoc } from "@/lib/editor-doc";
import { REVIEW_TAGS, makeReview, makeReviewSection, reviewsToSectionCopy } from "@/lib/editor-doc";
import { Btn, Field, TextArea, TextInput } from "./ui";

type Mutate = (fn: (d: EditorDoc) => void) => void;

export function ReviewPanel({ doc, mutate }: { doc: EditorDoc; mutate: Mutate }) {
  const reviews = doc.reviews ?? [];
  const demoCount = reviews.filter((r) => r.source === "demo").length;
  const hasSection = doc.sections.some((s) => s.type === "review");

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ author: "", rating: 5, body: "", tags: [] as string[] });
  const [loading, setLoading] = useState<"ai" | "img" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function addReal() {
    if (!draft.body.trim()) return;
    mutate((d) => {
      d.reviews = [
        ...(d.reviews ?? []),
        makeReview("real", { author: draft.author || "구매자", rating: draft.rating, body: draft.body.trim(), tags: draft.tags }),
      ];
    });
    setDraft({ author: "", rating: 5, body: "", tags: [] });
    setAdding(false);
    syncSection();
  }

  async function aiDraft() {
    setLoading("ai");
    setErr(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: { name: doc.product.name, category: doc.product.category },
          usp: doc.usp?.primary?.headline ?? "",
          count: 4,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "리뷰 초안 생성 실패");
      mutate((d) => {
        d.reviews = [
          ...(d.reviews ?? []),
          ...(data.reviews as { body: string; tags: string[]; author?: string; rating?: number }[]).map((r) =>
            makeReview("demo", { body: r.body, tags: r.tags, author: r.author, rating: r.rating ?? 5 }),
          ),
        ];
      });
      syncSection();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  /** 리뷰 섹션이 있으면 최신 리뷰로 copy 갱신 */
  function syncSection() {
    mutate((d) => {
      const sec = d.sections.find((s) => s.type === "review");
      if (sec) sec.copy = reviewsToSectionCopy(sec.id, d.reviews ?? [], d.product);
    });
  }

  function makeOrUpdateSection() {
    mutate((d) => {
      const existing = d.sections.find((s) => s.type === "review");
      if (existing) {
        existing.copy = reviewsToSectionCopy(existing.id, d.reviews ?? [], d.product);
        return;
      }
      const sec = makeReviewSection(d.reviews ?? [], d.product);
      // CTA 바로 앞에 배치
      const ctaIdx = d.sections.findIndex((s) => s.type === "cta");
      if (ctaIdx >= 0) d.sections.splice(ctaIdx, 0, sec);
      else d.sections.push(sec);
    });
  }

  async function genReviewImage() {
    setLoading("img");
    setErr(null);
    try {
      const name = doc.product.name?.trim() || "the product";
      const res = await fetch("/api/regenerate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${name}, warm authentic user-generated style photo, product in everyday real use, cozy natural light, casual framing, photorealistic. keep the exact product shape and color from the reference.`,
          aspectRatio: "4:5",
          count: 1,
          referenceImageUrl: (doc.product.images ?? [])[0]?.url,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "이미지 생성 실패");
      const url = (data.images as { url: string }[])[0]?.url;
      if (url)
        mutate((d) => {
          const list = d.reviews ?? [];
          if (list[0]) list[0].images = [url];
          d.reviews = list;
          const sec = d.sections.find((s) => s.type === "review");
          if (sec) sec.copy = reviewsToSectionCopy(sec.id, list, d.product);
        });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">리뷰</h3>

      {reviews.length > 0 && (
        <div className="space-y-1.5">
          {reviews.map((r, i) => (
            <div key={r.id} className="rounded-lg border border-neutral-200 bg-white p-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span
                  className={`rounded px-1 py-0.5 text-[9px] font-bold ${
                    r.source === "real" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {r.source === "real" ? "실제" : "AI 초안"}
                </span>
                <span className="text-neutral-400">{r.author}</span>
                <span className="text-amber-500">{"★".repeat(Math.round(r.rating ?? 5))}</span>
                <button
                  onClick={() =>
                    mutate((d) => {
                      d.reviews = (d.reviews ?? []).filter((_, j) => j !== i);
                      const sec = d.sections.find((s) => s.type === "review");
                      if (sec) sec.copy = reviewsToSectionCopy(sec.id, d.reviews ?? [], d.product);
                    })
                  }
                  className="ml-auto text-neutral-300 hover:text-red-500"
                >
                  <Trash2 size={11} />
                </button>
              </div>
              <p className="mt-1 line-clamp-2 text-neutral-600">{r.body}</p>
            </div>
          ))}
        </div>
      )}

      {demoCount > 0 && (
        <p className="rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
          AI 초안 {demoCount}개 — 판매 전 실제 후기로 교체하세요.
        </p>
      )}
      {err && <p className="rounded bg-red-50 px-2 py-1 text-[10px] text-red-600">{err}</p>}

      {adding ? (
        <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
          <div className="flex gap-1.5">
            <TextInput
              className="w-24"
              placeholder="작성자"
              value={draft.author}
              onChange={(e) => setDraft({ ...draft, author: e.target.value })}
            />
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setDraft({ ...draft, rating: n })}>
                  <Star size={14} className={n <= draft.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"} />
                </button>
              ))}
            </div>
          </div>
          <TextArea
            rows={2}
            placeholder="후기 내용"
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
          <div className="flex flex-wrap gap-1">
            {REVIEW_TAGS.map((t) => (
              <button
                key={t}
                onClick={() =>
                  setDraft({
                    ...draft,
                    tags: draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : [...draft.tags, t],
                  })
                }
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  draft.tags.includes(t) ? "bg-neutral-900 text-white" : "bg-white text-neutral-500 ring-1 ring-neutral-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Btn variant="primary" className="flex-1" onClick={addReal}>
              등록
            </Btn>
            <Btn variant="default" onClick={() => setAdding(false)}>
              취소
            </Btn>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          <Btn variant="default" onClick={() => setAdding(true)}>
            <MessageSquarePlus size={12} /> 실제 리뷰 추가
          </Btn>
          <Btn variant="default" onClick={aiDraft} disabled={loading === "ai"}>
            {loading === "ai" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI 리뷰 초안
          </Btn>
          <Btn variant="primary" onClick={makeOrUpdateSection}>
            {hasSection ? "리뷰 섹션 갱신" : "리뷰 섹션 만들기"}
          </Btn>
          <Btn variant="default" onClick={genReviewImage} disabled={loading === "img" || reviews.length === 0}>
            {loading === "img" ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />} 리뷰 이미지
          </Btn>
        </div>
      )}
    </section>
  );
}
