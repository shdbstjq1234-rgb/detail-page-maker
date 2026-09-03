"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DetailPageRenderer } from "@/components/detail-page/DetailPageRenderer";
import { LeftPanel } from "@/components/editor/LeftPanel";
import { RightPanel } from "@/components/editor/RightPanel";
import { TopBar, type SaveState } from "@/components/editor/TopBar";
import { EditorCanvas, type SectionAction } from "@/components/editor/EditorCanvas";
import { ExportDialog } from "@/components/editor/ExportDialog";
import { SetupScreen } from "@/components/editor/SetupScreen";
import { ImageStudio } from "@/components/editor/ImageStudio";
import {
  fromDetailPage,
  makeSection,
  makeSlot,
  recommendSlots,
  toProductInput,
  uid,
  SECTION_IMAGE_ROLE,
  type EditorDoc,
} from "@/lib/editor-doc";
import { IMAGE_PRESETS } from "@/lib/image-presets";
import { deriveTokens } from "@/lib/design-tokens";
import { getProject, saveProjectDoc } from "@/lib/store";
import type { DetailPage, PipelineEvent, SectionType } from "@/types/detail-page";

const DEVICE_W = { desktop: 820, mobile: 414 } as const;

export default function EditorRoute() {
  const routeParams = useParams<{ id: string }>();
  const id = routeParams.id;
  const router = useRouter();

  const [doc, setDoc] = useState<EditorDoc | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [past, setPast] = useState<EditorDoc[]>([]);
  const [future, setFuture] = useState<EditorDoc[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [device, setDevice] = useState<"desktop" | "mobile">("mobile");
  const [preview, setPreview] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [scrollToAi, setScrollToAi] = useState(0);
  const [showStudio, setShowStudio] = useState(false);
  const [studioFocus, setStudioFocus] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [genErr, setGenErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const firstSave = useRef(true);
  const docRef = useRef<EditorDoc | null>(null);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  // 로드
  useEffect(() => {
    let alive = true;
    getProject(id)
      .then((p) => {
        if (!alive) return;
        if (!p) {
          setLoadErr("프로젝트를 찾을 수 없습니다.");
          return;
        }
        setDoc(p.doc);
        setSelectedId(p.doc.sections[0]?.id ?? null);
      })
      .catch((e) => alive && setLoadErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, [id]);

  // 자동 저장 (디바운스)
  useEffect(() => {
    if (!doc) return;
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(() => {
      saveProjectDoc(id, doc)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 800);
    return () => clearTimeout(t);
  }, [doc, id]);

  // 선택 섹션으로 스크롤
  useEffect(() => {
    if (!selectedId) return;
    canvasScrollRef.current
      ?.querySelector(`[data-section-id="${selectedId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId]);

  const commit = useCallback((next: EditorDoc) => {
    const cur = docRef.current;
    if (cur) setPast((p) => [...p.slice(-49), cur]);
    setFuture([]);
    docRef.current = next; // 연속 mutate() 가 직전 결과를 보도록 동기 갱신
    setDoc(next);
  }, []);

  const mutate = useCallback(
    (fn: (d: EditorDoc) => void) => {
      const cur = docRef.current;
      if (!cur) return;
      const next = structuredClone(cur);
      fn(next);
      commit(next);
    },
    [commit],
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      if (docRef.current) setFuture((f) => [docRef.current!, ...f]);
      docRef.current = p[p.length - 1];
      setDoc(p[p.length - 1]);
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      if (docRef.current) setPast((p) => [...p, docRef.current!]);
      docRef.current = f[0];
      setDoc(f[0]);
      return f.slice(1);
    });
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const selectedSection = useMemo(
    () => doc?.sections.find((s) => s.id === selectedId) ?? null,
    [doc, selectedId],
  );

  // 최초 생성 직후 1회: 이미지 계획 + 디자인 토큰 초기화
  const planReady = Boolean(doc?.imagePlan?.length);
  useEffect(() => {
    if (!doc || !doc.analysis || planReady) return;
    mutate((d) => {
      if (!d.imagePlan || d.imagePlan.length === 0) d.imagePlan = recommendSlots(d);
      if (!d.designTokens) d.designTokens = deriveTokens(d.product);
    });
    fetch("/api/design-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: doc.product }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.tokens) mutate((d) => void (d.designTokens = j.tokens));
      })
      .catch(() => {});
  }, [doc, planReady, mutate]);

  const recomputePlan = useCallback(() => {
    mutate((d) => {
      const fresh = recommendSlots(d);
      const prev = new Map((d.imagePlan ?? []).map((s) => [s.presetKey, s]));
      d.imagePlan = fresh.map((s) => {
        const old = prev.get(s.presetKey);
        return old
          ? {
              ...s,
              enabled: old.enabled,
              prompt: old.prompt,
              negativePrompt: old.negativePrompt,
              planDetail: old.planDetail,
              chosen: old.chosen,
              candidates: old.candidates,
              versions: old.versions,
              status: old.status,
              referenceUrl: old.referenceUrl,
              ratio: old.ratio,
              sectionId: old.sectionId ?? s.sectionId,
            }
          : s;
      });
    });
  }, [mutate]);

  const generate = useCallback(async () => {
    if (!doc) return;
    setGenErr(null);
    setEvents([]);
    setRunning(true);
    const ac = new AbortController();
    abortRef.current = ac;
    const prevProduct = doc.product;
    try {
      const res = await fetch("/api/generate?stream=1", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(toProductInput(prevProduct)),
        signal: ac.signal,
      });
      if (!res.body) throw new Error("서버 응답이 없습니다.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          const evt = JSON.parse(line);
          if (evt.type === "event") setEvents((p) => [...p, evt.event as PipelineEvent]);
          else if (evt.type === "done") {
            const next = fromDetailPage(evt.page as DetailPage, prevProduct);
            // 재생성 시 리뷰·디자인토큰은 유지
            const prev = docRef.current;
            if (prev?.reviews) next.reviews = prev.reviews;
            if (prev?.designTokens) next.designTokens = prev.designTokens;
            commit(next);
            setSelectedId(next.sections[0]?.id ?? null);
          } else if (evt.type === "error") setGenErr(friendlyError(evt.error as string));
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setGenErr(friendlyError((e as Error).message));
    } finally {
      setRunning(false);
    }
  }, [doc, commit]);

  const applyReferenceOrder = useCallback(
    (order: SectionType[], tone?: string) => {
      mutate((d) => {
        const pool = [...d.sections];
        const next: typeof d.sections = [];
        for (const t of order) {
          const idx = pool.findIndex((s) => s.type === t);
          if (idx !== -1) next.push(pool.splice(idx, 1)[0]);
          else next.push(makeSection(t));
        }
        next.push(...pool);
        d.sections = next;
        if (tone && tone !== "light") for (const s of d.sections) s.layout = { ...s.layout, tone: tone as never };
      });
    },
    [mutate],
  );

  const onSectionAction = useCallback(
    (sid: string, action: SectionAction) => {
      setSelectedId(sid);
      if (action === "ai-image") {
        // 이 섹션을 대상으로 하는 이미지 슬롯이 없으면 하나 만든다
        mutate((d) => {
          d.imagePlan = d.imagePlan ?? [];
          if (!d.imagePlan.some((s) => s.sectionId === sid)) {
            const sec = d.sections.find((s) => s.id === sid);
            if (sec) {
              const preset =
                IMAGE_PRESETS.find((p) => p.sections.includes(sec.type) && p.group !== "모델") ??
                IMAGE_PRESETS.find((p) => p.role === SECTION_IMAGE_ROLE[sec.type]);
              const slot = makeSlot(preset?.key ?? "featureExplain", d.product, sid, d.designTokens);
              slot.enabled = true;
              d.imagePlan.push(slot);
            }
          }
        });
        setStudioFocus(sid);
        setShowStudio(true);
      }
      if (action === "duplicate")
        mutate((d) => {
          const idx = d.sections.findIndex((s) => s.id === sid);
          if (idx === -1) return;
          const clone = structuredClone(d.sections[idx]);
          clone.id = uid();
          clone.copy = { ...clone.copy, sectionId: clone.id };
          d.sections.splice(idx + 1, 0, clone);
        });
      if (action === "delete")
        mutate((d) => {
          d.sections = d.sections.filter((s) => s.id !== sid);
        });
    },
    [mutate],
  );

  const reorder = useCallback(
    (from: number, to: number) => {
      mutate((d) => {
        const [m] = d.sections.splice(from, 1);
        d.sections.splice(to, 0, m);
      });
    },
    [mutate],
  );

  if (loadErr) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-3 bg-[#F7F7F5] text-[13px] text-neutral-500">
        {loadErr}
        <button onClick={() => router.push("/")} className="rounded-lg bg-neutral-900 px-4 py-2 font-semibold text-white">
          프로젝트 목록으로
        </button>
      </main>
    );
  }
  if (!doc) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#F7F7F5] text-neutral-400">
        <Loader2 className="animate-spin" />
      </main>
    );
  }

  const width = DEVICE_W[device];
  // 아직 한 번도 AI 생성을 하지 않은 프로젝트 → 상품 등록 화면
  const showSetup = (!doc.analysis && !doc.usp) || (running && !doc.analysis);

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F7F5]">
      <TopBar
        name={doc.product.name ?? ""}
        onName={(v) => mutate((d) => void (d.product.name = v))}
        saveState={saveState}
        device={device}
        onDevice={setDevice}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={undo}
        onRedo={redo}
        preview={preview}
        onPreview={() => setPreview((v) => !v)}
        onExport={() => setShowExport(true)}
        onStudio={() => {
          setStudioFocus(null);
          setShowStudio(true);
        }}
        minimal={showSetup}
      />

      {showSetup ? (
        <div className="flex-1 overflow-y-auto">
          <SetupScreen
            doc={doc}
            mutate={mutate}
            projectId={id}
            onGenerate={generate}
            onStop={() => abortRef.current?.abort()}
            running={running}
            events={events}
            error={genErr}
          />
        </div>
      ) : (
      <div className="flex min-h-0 flex-1">
        {!preview && (
          <LeftPanel
            doc={doc}
            mutate={mutate}
            projectId={id}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onGenerate={generate}
            onStop={() => abortRef.current?.abort()}
            running={running}
            events={events}
            error={genErr}
            onApplyReferenceOrder={applyReferenceOrder}
          />
        )}

        <div ref={canvasScrollRef} className="flex flex-1 justify-center overflow-y-auto bg-neutral-100 py-8">
          <div
            className="h-fit shrink-0 overflow-hidden rounded-[26px] border-[10px] border-neutral-900 bg-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)]"
            style={{ width: width + 20 }}
          >
            {preview ? (
              <div style={{ width }}>
                <DetailPageRenderer page={doc} />
              </div>
            ) : (
              <EditorCanvas
                sections={doc.sections}
                selectedId={selectedId}
                width={width}
                designTokens={doc.designTokens}
                onSelect={setSelectedId}
                onAction={onSectionAction}
                onReorder={reorder}
              />
            )}
          </div>
        </div>

        {!preview && (
          <RightPanel doc={doc} section={selectedSection} mutate={mutate} projectId={id} scrollToAi={scrollToAi} />
        )}
      </div>
      )}

      {/* 다운로드용 숨김 렌더 (고정 폭) */}
      <div ref={exportRef} aria-hidden className="pointer-events-none fixed left-[-99999px] top-0" style={{ width: 800 }}>
        <DetailPageRenderer page={doc} />
      </div>

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        getNode={() => exportRef.current?.firstElementChild as HTMLElement | null}
        baseName={doc.product.name ?? "detail-page"}
        demoReviewCount={
          doc.sections.some((s) => s.type === "review")
            ? (doc.reviews ?? []).filter((r) => r.source === "demo").length
            : 0
        }
      />

      {showStudio && (
        <ImageStudio
          open={showStudio}
          onClose={() => setShowStudio(false)}
          doc={doc}
          mutate={mutate}
          projectId={id}
          focusSectionId={studioFocus}
          onRecompute={recomputePlan}
        />
      )}
    </main>
  );
}

function friendlyError(raw: string): string {
  const s = raw || "";
  if (/api key|anthropic|401|unauthor/i.test(s)) return "AI 키 설정에 문제가 있어요. 환경변수를 확인해 주세요. (없어도 목업으로 동작합니다)";
  if (/timeout|ETIMEDOUT|폴링/i.test(s)) return "이미지 생성이 오래 걸려 중단됐어요. 잠시 후 다시 시도해 주세요.";
  if (/network|fetch failed|ENOTFOUND/i.test(s)) return "네트워크 연결을 확인해 주세요.";
  return `문제가 발생했어요: ${s.slice(0, 160)}`;
}
