"use client";

import { useEffect, useState } from "react";
import { Sparkles, Info } from "lucide-react";

interface Status {
  provider: "nanobanana" | "higgsfield" | "mock";
  label: string;
  ready: boolean;
  model?: string;
}

/** 현재 이미지 생성기 상태 배지 + mock 일 때 연결 방법 안내 */
export function ProviderBadge({ compact = false }: { compact?: boolean }) {
  const [s, setS] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/image-provider")
      .then((r) => r.json())
      .then((j) => j.ok && setS(j))
      .catch(() => {});
  }, []);

  if (!s) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold ${
          s.ready
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }`}
        title="이미지 생성기 상태"
      >
        <Sparkles size={12} />
        {compact ? "" : "이미지"} {s.label}
        {!s.ready && <Info size={11} />}
      </button>

      {open && !s.ready && (
        <div className="absolute right-0 top-9 z-50 w-[300px] rounded-xl border border-neutral-200 bg-white p-3 text-[12px] leading-relaxed text-neutral-600 shadow-xl">
          <p className="font-bold text-neutral-900">실제 이미지 생성 연결하기</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                aistudio.google.com/apikey
              </a>{" "}
              에서 <b>Create API key</b>
            </li>
            <li>
              프로젝트 폴더의 <code className="rounded bg-neutral-100 px-1">.env</code> 파일에 붙여넣기:
              <pre className="mt-1 rounded bg-neutral-900 p-2 text-[10px] text-neutral-100">{`IMAGE_PROVIDER=nanobanana
NANOBANANA_API_KEY=여기에_키`}</pre>
            </li>
            <li>개발 서버 재시작 (<code className="rounded bg-neutral-100 px-1">npm run dev</code>)</li>
          </ol>
          <p className="mt-2 text-[11px] text-neutral-400">
            키가 없어도 지금은 미리보기 이미지로 전체 흐름이 동작합니다.
          </p>
        </div>
      )}
      {open && s.ready && (
        <div className="absolute right-0 top-9 z-50 w-[220px] rounded-xl border border-neutral-200 bg-white p-3 text-[12px] text-neutral-600 shadow-xl">
          <b className="text-neutral-900">{s.label}</b> 연결됨
          {s.model && <div className="mt-1 text-[11px] text-neutral-400">{s.model}</div>}
          <div className="mt-1.5 text-[11px] text-neutral-400">누끼컷을 넣으면 제품 원형을 유지해 생성합니다.</div>
        </div>
      )}
    </div>
  );
}
