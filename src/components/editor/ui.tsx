"use client";

import { useRef, useState, type ReactNode } from "react";

/** 편집기 공통 폼 프리미티브 (한국 이커머스 툴 톤: 밝고 정갈하게) */

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] font-semibold text-neutral-700">{label}</span>
        {hint && <span className="text-[11px] text-neutral-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} resize-y leading-relaxed ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} appearance-none pr-8 ${props.className ?? ""}`} />;
}

export function Btn({
  children,
  variant = "default",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "default" | "ghost" | "danger" }) {
  const v = {
    primary: "bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-40",
    default: "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 disabled:opacity-40",
    ghost: "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
    danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  }[variant];
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${v} ${className}`}
    >
      {children}
    </button>
  );
}

/** 문자열 배열 편집기 (bullets / specs / sellingPoints) */
export function ListEditor({
  items,
  onChange,
  placeholder = "항목 입력",
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex gap-1.5">
          <TextInput
            value={it}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <Btn variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="삭제">
            ✕
          </Btn>
        </div>
      ))}
      <Btn variant="default" className="w-full" onClick={() => onChange([...items, ""])}>
        + 항목 추가
      </Btn>
    </div>
  );
}

/** 파일 → data URL. 드래그앤드롭 + 클릭 업로드 겸용 존 */
export function DropZone({
  onFiles,
  multiple = true,
  label = "이미지를 드래그하거나 클릭해 업로드",
  compact = false,
}: {
  onFiles: (dataUrls: string[]) => void;
  multiple?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  async function handle(files: FileList | null) {
    if (!files || !files.length) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const urls = await Promise.all(imgs.map(fileToDataUrl));
    onFiles(urls);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void handle(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors ${
        compact ? "px-3 py-4" : "px-4 py-8"
      } ${over ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 bg-neutral-50/50 hover:border-neutral-300"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => {
          void handle(e.target.files);
          e.currentTarget.value = "";
        }}
      />
      <span className="text-[16px]">🖼️</span>
      <span className="mt-1 text-[12px] text-neutral-500">{label}</span>
    </div>
  );
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function SectionCard({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-2 text-[12px] transition-colors ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
      }`}
    >
      {children}
    </div>
  );
}
