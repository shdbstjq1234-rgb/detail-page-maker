"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Pencil, Sparkles, CopyPlus, Trash2, GripVertical } from "lucide-react";
import { RenderedSection, stepMap } from "@/components/detail-page/DetailPageRenderer";
import { SECTION_LABEL } from "@/lib/editor-doc";
import type { EditorSection } from "@/lib/editor-doc";
import { tokenVars, type DesignTokens } from "@/lib/design-tokens";
import { paletteVars, type ColorPalette } from "@/lib/color-direction";
import type { SectionColors } from "@/components/detail-page/_shared";

export type SectionAction = "edit" | "ai-image" | "duplicate" | "delete";

export function EditorCanvas({
  sections,
  selectedId,
  width,
  designTokens,
  palette,
  sectionStyles,
  onSelect,
  onAction,
  onReorder,
}: {
  sections: EditorSection[];
  selectedId: string | null;
  width: number;
  designTokens?: DesignTokens;
  palette?: ColorPalette;
  sectionStyles?: Record<string, SectionColors>;
  onSelect: (id: string) => void;
  onAction: (id: string, action: SectionAction) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const dragFrom = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  return (
    <article
      className="w-full select-none bg-white font-sans text-ink"
      style={{ width, ...(tokenVars(designTokens) as CSSProperties), ...(paletteVars(palette) as CSSProperties), ...(palette ? { background: palette.background, color: palette.textPrimary } : {}) }}
    >
      {(() => {
        const steps = stepMap(sections);
        return sections.map((s, i) => {
        const selected = selectedId === s.id;
        return (
          <div
            key={s.id}
            data-section-id={s.id}
            onClick={() => onSelect(s.id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (overIdx !== i) setOverIdx(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom.current !== null && dragFrom.current !== i) onReorder(dragFrom.current, i);
              dragFrom.current = null;
              setOverIdx(null);
            }}
            className={`group relative cursor-pointer transition-shadow ${
              selected ? "shadow-[inset_0_0_0_3px_#2563eb]" : "hover:shadow-[inset_0_0_0_2px_#bfdbfe]"
            } ${overIdx === i ? "section-drag-over" : ""}`}
          >
            {/* 좌상단: 섹션 라벨 + 드래그 핸들 */}
            <div
              className={`absolute left-2 top-2 z-20 flex items-center gap-1 rounded-md bg-neutral-900/85 px-1.5 py-1 text-[10px] font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 ${
                selected ? "opacity-100" : ""
              }`}
            >
              <span
                draggable
                onDragStart={(e) => {
                  dragFrom.current = i;
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  dragFrom.current = null;
                  setOverIdx(null);
                }}
                className="cursor-grab active:cursor-grabbing"
                title="드래그해서 순서 변경"
              >
                <GripVertical size={12} />
              </span>
              {String(i + 1).padStart(2, "0")} {SECTION_LABEL[s.type]}
            </div>

            {/* 우상단: 액션 */}
            <div
              className={`absolute right-2 top-2 z-20 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                selected ? "opacity-100" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <CanvasBtn title="편집" onClick={() => onAction(s.id, "edit")}>
                <Pencil size={12} />
              </CanvasBtn>
              <CanvasBtn title="AI 이미지" onClick={() => onAction(s.id, "ai-image")}>
                <Sparkles size={12} />
              </CanvasBtn>
              <CanvasBtn title="복제" onClick={() => onAction(s.id, "duplicate")}>
                <CopyPlus size={12} />
              </CanvasBtn>
              <CanvasBtn title="삭제" danger onClick={() => onAction(s.id, "delete")}>
                <Trash2 size={12} />
              </CanvasBtn>
            </div>

            <div className="pointer-events-none">
              <RenderedSection data={s} step={steps[s.id]} colors={sectionStyles?.[s.id] ?? null} />
            </div>
          </div>
        );
        });
      })()}
    </article>
  );
}

function CanvasBtn({
  children,
  title,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center rounded-md text-white backdrop-blur-sm transition-colors ${
        danger ? "bg-red-500/85 hover:bg-red-500" : "bg-neutral-900/85 hover:bg-neutral-900"
      }`}
    >
      {children}
    </button>
  );
}
