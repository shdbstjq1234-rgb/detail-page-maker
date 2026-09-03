"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Monitor,
  Smartphone,
  Eye,
  Download,
  Check,
  Loader2,
  CloudOff,
  Sparkles,
  Wand2,
  ShieldCheck,
} from "lucide-react";
import { ProviderBadge } from "./ProviderBadge";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function TopBar({
  name,
  onName,
  saveState,
  device,
  onDevice,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  preview,
  onPreview,
  onExport,
  onStudio,
  onAutoImages,
  onQa,
  qaCount = 0,
  qaHasError = false,
  minimal = false,
}: {
  name: string;
  onName: (v: string) => void;
  saveState: SaveState;
  device: "desktop" | "mobile";
  onDevice: (d: "desktop" | "mobile") => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  preview: boolean;
  onPreview: () => void;
  onExport: () => void;
  onStudio: () => void;
  onAutoImages: () => void;
  onQa: () => void;
  qaCount?: number;
  qaHasError?: boolean;
  minimal?: boolean;
}) {
  const router = useRouter();
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-3">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] font-semibold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <ArrowLeft size={14} /> 프로젝트
      </button>

      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="상세페이지 제목"
        className="w-56 rounded-md border border-transparent px-2 py-1.5 text-[13px] font-semibold outline-none hover:border-neutral-200 focus:border-neutral-900"
      />

      <SaveBadge state={saveState} />

      {minimal ? (
        <div className="ml-auto flex items-center gap-1.5">
          <ProviderBadge />
          <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-500">
            1 · 상품 등록
          </span>
        </div>
      ) : (
      <div className="ml-auto flex items-center gap-1.5">
        <div className="flex rounded-lg border border-neutral-200 p-0.5">
          <IconToggle active={device === "desktop"} onClick={() => onDevice("desktop")} title="데스크톱">
            <Monitor size={14} />
          </IconToggle>
          <IconToggle active={device === "mobile"} onClick={() => onDevice("mobile")} title="모바일">
            <Smartphone size={14} />
          </IconToggle>
        </div>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="실행 취소 (⌘Z)"
          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="다시 실행 (⌘⇧Z)"
          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
        >
          <Redo2 size={15} />
        </button>

        <ProviderBadge compact />

        <div className="flex overflow-hidden rounded-lg border border-violet-300">
          <button
            onClick={onAutoImages}
            title="누끼컷으로 전체 이미지 자동 생성 후 섹션에 배치"
            className="flex items-center gap-1 bg-violet-50 px-2.5 py-1.5 text-[12px] font-semibold text-violet-700 hover:bg-violet-100"
          >
            <Sparkles size={13} /> 누끼컷으로 전체 이미지 제작
          </button>
          <button
            onClick={onStudio}
            title="이미지 스튜디오 열기"
            className="border-l border-violet-300 bg-violet-50 px-2 py-1.5 text-violet-700 hover:bg-violet-100"
          >
            <Wand2 size={13} />
          </button>
        </div>

        <button
          onClick={onQa}
          title="출력 전 검수"
          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold ${
            qaHasError
              ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
              : qaCount > 0
                ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          <ShieldCheck size={13} /> 검수{qaCount > 0 ? ` ${qaCount}` : ""}
        </button>

        <button
          onClick={onPreview}
          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold ${
            preview ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          <Eye size={13} /> 미리보기
        </button>

        <button
          onClick={onExport}
          className="flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-neutral-800"
        >
          <Download size={13} /> 다운로드
        </button>
      </div>
      )}
    </header>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "saving")
    return (
      <span className="flex items-center gap-1 text-[11px] text-neutral-400">
        <Loader2 size={11} className="animate-spin" /> 저장 중…
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex items-center gap-1 text-[11px] text-emerald-600">
        <Check size={11} /> 저장됨
      </span>
    );
  if (state === "error")
    return (
      <span className="flex items-center gap-1 text-[11px] text-red-500">
        <CloudOff size={11} /> 저장 실패
      </span>
    );
  return null;
}

function IconToggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-md px-2 py-1 ${active ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}
    >
      {children}
    </button>
  );
}
