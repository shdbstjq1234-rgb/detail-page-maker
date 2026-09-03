"use client";

import { useEffect, useState } from "react";
import { FileCheck2, Plus, Trash2, Loader2, AlertTriangle, Upload } from "lucide-react";
import type { EditorDoc } from "@/lib/editor-doc";
import { EVIDENCE_TYPES, libraryApi, type Evidence } from "@/lib/library";
import { uploadImage } from "@/lib/upload";
import { Btn, Field, Select, TextArea, TextInput } from "./ui";

type Mutate = (fn: (d: EditorDoc) => void) => void;

/**
 * Evidence 매니저.
 * 시험성적서·인증서를 등록하면 그 수치를 상세페이지에 쓸 수 있게 된다.
 * 등록되지 않은 수치·인증은 QA 가 계속 경고한다 (없는 근거를 만들지 않기 위해).
 */
export function EvidencePanel({
  doc,
  mutate,
  projectId,
}: {
  doc: EditorDoc;
  mutate: Mutate;
  projectId: string;
}) {
  const [items, setItems] = useState<Evidence[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Evidence>>({ type: "시험성적서", result: "" });

  const load = async () => {
    try {
      setItems(await libraryApi.listEvidence(projectId));
    } catch (e) {
      setErr((e as Error).message);
      setItems([]);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // doc 에 근거 텍스트를 심어 QA·카피 생성이 참조하게 한다
  const syncToDoc = (list: Evidence[]) =>
    mutate((d) => {
      d.evidence = list.map((e) => ({
        id: e.id,
        type: e.type,
        institution: e.institution ?? undefined,
        result: e.result,
        claimAllowed: e.claimAllowed ?? undefined,
      }));
    });

  useEffect(() => {
    if (items) syncToDoc(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const save = async () => {
    if (!draft.result?.trim()) {
      setErr("자료에 적힌 실제 결과값을 입력해 주세요. (예: UPF 50+)");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const saved = await libraryApi.saveEvidence({ ...draft, projectId });
      setItems((p) => [saved, ...(p ?? [])]);
      setDraft({ type: "시험성적서", result: "" });
      setAdding(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setItems((p) => (p ?? []).filter((x) => x.id !== id));
    try {
      await libraryApi.deleteEvidence(id);
    } catch {
      void load();
    }
  };

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
        <FileCheck2 size={12} /> 근거자료 (Evidence)
      </h3>
      <p className="text-[10.5px] leading-relaxed text-neutral-500">
        시험성적서·인증서를 등록하면 그 수치를 상세페이지에 쓸 수 있습니다. 등록 안 된 수치·인증은 검수에서 계속
        경고합니다.
      </p>

      {items === null ? (
        <div className="flex justify-center py-3 text-neutral-300">
          <Loader2 size={14} className="animate-spin" />
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <ul className="space-y-1">
              {items.map((e) => (
                <li key={e.id} className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-2 py-1.5">
                  <div className="flex items-start gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-[11.5px] font-bold text-emerald-900">
                        <span className="rounded bg-emerald-600/10 px-1 text-[9.5px] font-semibold">{e.type}</span>
                        <span className="truncate">{e.result}</span>
                      </div>
                      {(e.institution || e.claimAllowed) && (
                        <div className="truncate text-[10px] text-emerald-800/70">
                          {e.institution}
                          {e.institution && e.claimAllowed ? " · " : ""}
                          {e.claimAllowed ? `허용 표현: ${e.claimAllowed}` : ""}
                        </div>
                      )}
                      {e.documentUrl && (
                        <a
                          href={e.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-emerald-700 underline underline-offset-2"
                        >
                          자료 보기
                        </a>
                      )}
                      {e.projectId === null && (
                        <span className="ml-1 text-[9.5px] text-emerald-700/60">· 모든 프로젝트 공용</span>
                      )}
                    </div>
                    <button onClick={() => remove(e.id)} className="rounded p-0.5 text-emerald-700/60 hover:bg-emerald-100">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 py-1.5 text-[11px] font-semibold text-neutral-500 hover:border-neutral-500 hover:text-neutral-800"
            >
              <Plus size={11} /> 근거자료 추가
            </button>
          ) : (
            <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-2.5">
              <Field label="자료 종류">
                <Select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
                  {EVIDENCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="실제 결과값" hint="자료에 적힌 그대로">
                <TextInput
                  value={draft.result ?? ""}
                  placeholder="예: UPF 50+ / 항균 99.9% / 하중 100kg"
                  onChange={(e) => setDraft((d) => ({ ...d, result: e.target.value }))}
                />
              </Field>
              <Field label="시험·발급 기관">
                <TextInput
                  value={draft.institution ?? ""}
                  placeholder="예: FITI시험연구원"
                  onChange={(e) => setDraft((d) => ({ ...d, institution: e.target.value }))}
                />
              </Field>
              <Field label="허용 표현" hint="이 근거로 페이지에 써도 되는 문구">
                <TextArea
                  rows={2}
                  value={draft.claimAllowed ?? ""}
                  placeholder="예: 자외선 차단 UPF 50+ (FITI 시험 기준)"
                  onChange={(e) => setDraft((d) => ({ ...d, claimAllowed: e.target.value }))}
                />
              </Field>
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 py-2 text-[11px] text-neutral-500 hover:border-neutral-500">
                <Upload size={11} />
                {draft.documentUrl ? "자료 파일 교체" : "자료 이미지 첨부 (선택)"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (ev) => {
                    const f = ev.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const url = await uploadImage(String(reader.result), {
                        projectId,
                        kind: "original",
                        filename: "evidence",
                      });
                      setDraft((d) => ({ ...d, documentUrl: url }));
                    };
                    reader.readAsDataURL(f);
                  }}
                />
              </label>
              {draft.documentUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.documentUrl} alt="" className="h-20 w-full rounded border border-neutral-200 object-cover" />
              )}
              <div className="flex gap-1.5">
                <Btn variant="primary" className="flex-1" onClick={save} disabled={busy}>
                  {busy ? <Loader2 size={11} className="animate-spin" /> : null} 저장
                </Btn>
                <Btn variant="default" onClick={() => { setAdding(false); setErr(null); }}>
                  취소
                </Btn>
              </div>
            </div>
          )}
        </>
      )}

      {err && (
        <p className="flex items-start gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[10.5px] text-red-600">
          <AlertTriangle size={10} className="mt-0.5 shrink-0" />
          {err}
        </p>
      )}
    </section>
  );
}
