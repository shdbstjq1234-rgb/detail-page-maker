"use client";

import { useMemo } from "react";
import { X, AlertOctagon, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import type { EditorDoc } from "@/lib/editor-doc";
import { runQa, qaSummary, type QaFinding } from "@/lib/qa";

const META: Record<QaFinding["level"], { icon: typeof Info; cls: string; label: string }> = {
  error: { icon: AlertOctagon, cls: "text-red-600 bg-red-50 border-red-200", label: "고쳐야 함" },
  warn: { icon: AlertTriangle, cls: "text-amber-700 bg-amber-50 border-amber-200", label: "확인 필요" },
  info: { icon: Info, cls: "text-neutral-600 bg-neutral-50 border-neutral-200", label: "권장" },
};

export function QaDialog({
  open,
  onClose,
  doc,
  onGoSection,
}: {
  open: boolean;
  onClose: () => void;
  doc: EditorDoc;
  onGoSection: (sectionId: string) => void;
}) {
  const findings = useMemo(() => (open ? runQa(doc) : []), [open, doc]);
  const sum = qaSummary(findings);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-[480px] flex-col rounded-2xl border border-neutral-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
          <h2 className="text-[15px] font-bold">출력 전 검수</h2>
          <button onClick={onClose} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 px-5 py-3 text-[12px]">
          <Pill n={sum.error} label="고쳐야 함" cls="bg-red-50 text-red-700" />
          <Pill n={sum.warn} label="확인 필요" cls="bg-amber-50 text-amber-700" />
          <Pill n={sum.info} label="권장" cls="bg-neutral-100 text-neutral-600" />
        </div>

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {findings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center text-[13px] text-neutral-500">
              <CheckCircle2 size={28} className="text-emerald-500" />
              문제를 찾지 못했어요. 바로 다운로드해도 좋습니다.
            </div>
          ) : (
            <ul className="space-y-2">
              {findings.map((f) => {
                const m = META[f.level];
                const Icon = m.icon;
                return (
                  <li key={f.id} className={`rounded-xl border px-3 py-2.5 ${m.cls}`}>
                    <div className="flex items-start gap-2">
                      <Icon size={14} className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-bold">
                          {f.sectionLabel ? `[${f.sectionLabel}] ` : ""}
                          {f.title}
                        </div>
                        <div className="mt-0.5 text-[11.5px] leading-relaxed opacity-90">{f.detail}</div>
                        {f.sectionId && (
                          <button
                            onClick={() => {
                              onGoSection(f.sectionId!);
                              onClose();
                            }}
                            className="mt-1.5 rounded-md bg-white/70 px-2 py-0.5 text-[11px] font-semibold underline-offset-2 hover:underline"
                          >
                            이 섹션 보기 →
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 font-semibold ${cls}`}>
      {label} {n}
    </span>
  );
}
