"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Plus, Trash2, Loader2, Upload, UserRound, Check } from "lucide-react";
import type { EditorDoc } from "@/lib/editor-doc";
import { brandedName, libraryApi, type Brand, type Character } from "@/lib/library";
import { uploadImage } from "@/lib/upload";
import { Btn, Field, TextArea, TextInput } from "./ui";

type Mutate = (fn: (d: EditorDoc) => void) => void;

/**
 * 브랜드 · 모델(캐릭터) 라이브러리.
 * 브랜드를 고르면 톤·로고·상품명 접두어가 프로젝트에 적용된다.
 * 모델을 고르면 이미지 생성 시 "사람 외형만" 참고한다 (옷·소품은 절대 복사하지 않음).
 */
export function BrandPanel({ doc, mutate, projectId }: { doc: EditorDoc; mutate: Mutate; projectId: string }) {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [chars, setChars] = useState<Character[] | null>(null);
  const [tab, setTab] = useState<"brand" | "model">("brand");
  const [editing, setEditing] = useState<Partial<Brand> | null>(null);
  const [editingChar, setEditingChar] = useState<Partial<Character> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [b, c] = await Promise.all([libraryApi.listBrands(), libraryApi.listCharacters()]);
      setBrands(b);
      setChars(c);
    } catch {
      setBrands([]);
      setChars([]);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const activeBrand = brands?.find((b) => b.id === doc.brandId) ?? null;
  const activeChar = chars?.find((c) => c.id === doc.characterId) ?? null;

  const selectBrand = (b: Brand | null) =>
    mutate((d) => {
      d.brandId = b?.id ?? undefined;
      d.brandSnapshot = b
        ? { name: b.name, displayName: b.displayName ?? undefined, logoUrl: b.logoUrl ?? undefined, brandColor: b.brandColor ?? undefined, prefixOn: b.prefixOn }
        : undefined;
      if (b) {
        if (b.brandTone) d.product.brandTone = b.brandTone;
        if (d.product.name) d.product.name = brandedName(b, d.product.name);
      }
    });

  const selectChar = (c: Character | null) =>
    mutate((d) => {
      d.characterId = c?.id ?? undefined;
      d.characterSnapshot = c
        ? { name: c.name, genderPresentation: c.genderPresentation ?? undefined, ageRange: c.ageRange ?? undefined, images: c.images }
        : undefined;
    });

  const saveBrand = async () => {
    if (!editing?.name?.trim()) return;
    setBusy(true);
    try {
      const saved = await libraryApi.saveBrand(editing);
      setBrands((p) => {
        const rest = (p ?? []).filter((x) => x.id !== saved.id);
        return [saved, ...rest];
      });
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  const saveChar = async () => {
    if (!editingChar?.name?.trim()) return;
    setBusy(true);
    try {
      const saved = await libraryApi.saveCharacter(editingChar);
      setChars((p) => {
        const rest = (p ?? []).filter((x) => x.id !== saved.id);
        return [saved, ...rest];
      });
      setEditingChar(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
          <BadgeCheck size={12} /> 브랜드 · 모델
        </h3>
        <div className="ml-auto flex rounded-md border border-neutral-200 p-0.5 text-[10px] font-semibold">
          <button
            onClick={() => setTab("brand")}
            className={`rounded px-1.5 py-0.5 ${tab === "brand" ? "bg-neutral-900 text-white" : "text-neutral-500"}`}
          >
            브랜드
          </button>
          <button
            onClick={() => setTab("model")}
            className={`rounded px-1.5 py-0.5 ${tab === "model" ? "bg-neutral-900 text-white" : "text-neutral-500"}`}
          >
            모델
          </button>
        </div>
      </div>

      {tab === "brand" ? (
        brands === null ? (
          <Spinner />
        ) : editing ? (
          <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-2.5">
            <Field label="브랜드명">
              <TextInput
                value={editing.name ?? ""}
                placeholder="예: RUNON / 모아하우스"
                onChange={(e) => setEditing((b) => ({ ...b, name: e.target.value }))}
              />
            </Field>
            <Field label="브랜드 톤">
              <TextInput
                value={editing.brandTone ?? ""}
                placeholder="예: 스포티·에너지 / 생활·편안함"
                onChange={(e) => setEditing((b) => ({ ...b, brandTone: e.target.value }))}
              />
            </Field>
            <Field label="브랜드 컬러 (선택)">
              <div className="flex gap-1.5">
                <input
                  type="color"
                  value={editing.brandColor ?? "#222222"}
                  onChange={(e) => setEditing((b) => ({ ...b, brandColor: e.target.value }))}
                  className="h-8 w-10 cursor-pointer rounded border border-neutral-200"
                />
                <TextInput
                  value={editing.brandColor ?? ""}
                  placeholder="#222222"
                  onChange={(e) => setEditing((b) => ({ ...b, brandColor: e.target.value }))}
                />
              </div>
            </Field>
            <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 py-2 text-[11px] text-neutral-500 hover:border-neutral-500">
              <Upload size={11} /> {editing.logoUrl ? "로고 교체" : "로고 업로드 (PNG/SVG)"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const url = await uploadImage(String(reader.result), { projectId, kind: "original", filename: "logo" });
                    setEditing((b) => ({ ...b, logoUrl: url }));
                  };
                  reader.readAsDataURL(f);
                }}
              />
            </label>
            {editing.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={editing.logoUrl} alt="" className="h-10 w-full rounded border border-neutral-200 object-contain p-1" />
            )}
            <label className="flex items-center gap-1.5 text-[11px] text-neutral-600">
              <input
                type="checkbox"
                checked={editing.prefixOn ?? true}
                onChange={(e) => setEditing((b) => ({ ...b, prefixOn: e.target.checked }))}
                className="accent-neutral-900"
              />
              상품명 앞에 브랜드명 자동 추가
            </label>
            <div className="flex gap-1.5">
              <Btn variant="primary" className="flex-1" onClick={saveBrand} disabled={busy}>
                {busy && <Loader2 size={11} className="animate-spin" />} 저장
              </Btn>
              <Btn variant="default" onClick={() => setEditing(null)}>
                취소
              </Btn>
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-1">
              {brands.map((b) => (
                <li
                  key={b.id}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                    doc.brandId === b.id ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
                  }`}
                >
                  {b.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logoUrl} alt="" className="h-6 w-10 shrink-0 rounded object-contain" />
                  ) : (
                    <span
                      className="h-6 w-10 shrink-0 rounded"
                      style={{ background: b.brandColor ?? "#e5e5e5" }}
                    />
                  )}
                  <button onClick={() => selectBrand(doc.brandId === b.id ? null : b)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-1 text-[11.5px] font-semibold text-neutral-800">
                      {b.name}
                      {doc.brandId === b.id && <Check size={10} className="text-emerald-600" />}
                    </span>
                    <span className="block truncate text-[10px] text-neutral-400">{b.brandTone || "톤 미설정"}</span>
                  </button>
                  <button onClick={() => setEditing(b)} className="rounded px-1 text-[10px] text-neutral-500 hover:bg-neutral-100">
                    수정
                  </button>
                  <button
                    onClick={async () => {
                      setBrands((p) => (p ?? []).filter((x) => x.id !== b.id));
                      await libraryApi.deleteBrand(b.id).catch(() => void load());
                    }}
                    className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100"
                  >
                    <Trash2 size={11} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setEditing({ name: "", prefixOn: true })}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 py-1.5 text-[11px] font-semibold text-neutral-500 hover:border-neutral-500 hover:text-neutral-800"
            >
              <Plus size={11} /> 브랜드 추가
            </button>
            {activeBrand && (
              <p className="text-[10px] text-neutral-500">
                적용됨 · {activeBrand.prefixOn ? "상품명 앞에 브랜드명이 붙습니다." : "상품명은 그대로 둡니다."}
                {activeBrand.logoUrl ? " 로고는 실제 파일로 합성됩니다(AI가 다시 그리지 않음)." : ""}
              </p>
            )}
          </>
        )
      ) : chars === null ? (
        <Spinner />
      ) : editingChar ? (
        <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-2.5">
          <Field label="모델 이름">
            <TextInput
              value={editingChar.name ?? ""}
              placeholder="예: 지민 (20대 여성)"
              onChange={(e) => setEditingChar((c) => ({ ...c, name: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-1.5">
            <Field label="성별 표현">
              <TextInput
                value={editingChar.genderPresentation ?? ""}
                placeholder="여성 / 남성"
                onChange={(e) => setEditingChar((c) => ({ ...c, genderPresentation: e.target.value }))}
              />
            </Field>
            <Field label="연령대">
              <TextInput
                value={editingChar.ageRange ?? ""}
                placeholder="20대 후반"
                onChange={(e) => setEditingChar((c) => ({ ...c, ageRange: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="메모">
            <TextArea
              rows={2}
              value={editingChar.memo ?? ""}
              placeholder="분위기, 헤어스타일 등"
              onChange={(e) => setEditingChar((c) => ({ ...c, memo: e.target.value }))}
            />
          </Field>
          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 py-2 text-[11px] text-neutral-500 hover:border-neutral-500">
            <Upload size={11} /> 얼굴·체형 참고 사진 추가
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(ev) => {
                const files = Array.from(ev.target.files ?? []);
                files.forEach((f) => {
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const url = await uploadImage(String(reader.result), { projectId, kind: "original", filename: "char" });
                    setEditingChar((c) => ({ ...c, images: [...(c?.images ?? []), url] }));
                  };
                  reader.readAsDataURL(f);
                });
              }}
            />
          </label>
          {(editingChar.images ?? []).length > 0 && (
            <div className="grid grid-cols-4 gap-1">
              {(editingChar.images ?? []).map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={u} alt="" className="aspect-square rounded border border-neutral-200 object-cover" />
              ))}
            </div>
          )}
          <p className="rounded bg-amber-50 px-2 py-1 text-[10px] leading-relaxed text-amber-800">
            이 사진은 <b>얼굴·체형·헤어스타일</b>만 참고합니다. 사진 속 옷·소품·배경은 절대 따라 그리지 않습니다.
          </p>
          <div className="flex gap-1.5">
            <Btn variant="primary" className="flex-1" onClick={saveChar} disabled={busy}>
              {busy && <Loader2 size={11} className="animate-spin" />} 저장
            </Btn>
            <Btn variant="default" onClick={() => setEditingChar(null)}>
              취소
            </Btn>
          </div>
        </div>
      ) : (
        <>
          <ul className="space-y-1">
            {chars.map((c) => (
              <li
                key={c.id}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                  doc.characterId === c.id ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
                }`}
              >
                {c.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.images[0]} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                    <UserRound size={13} />
                  </span>
                )}
                <button onClick={() => selectChar(doc.characterId === c.id ? null : c)} className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-1 text-[11.5px] font-semibold text-neutral-800">
                    {c.name}
                    {doc.characterId === c.id && <Check size={10} className="text-emerald-600" />}
                  </span>
                  <span className="block truncate text-[10px] text-neutral-400">
                    {[c.genderPresentation, c.ageRange].filter(Boolean).join(" · ") || "정보 없음"} · 사진 {c.images?.length ?? 0}장
                  </span>
                </button>
                <button onClick={() => setEditingChar(c)} className="rounded px-1 text-[10px] text-neutral-500 hover:bg-neutral-100">
                  수정
                </button>
                <button
                  onClick={async () => {
                    setChars((p) => (p ?? []).filter((x) => x.id !== c.id));
                    await libraryApi.deleteCharacter(c.id).catch(() => void load());
                  }}
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100"
                >
                  <Trash2 size={11} />
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setEditingChar({ name: "", images: [], active: true })}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 py-1.5 text-[11px] font-semibold text-neutral-500 hover:border-neutral-500 hover:text-neutral-800"
          >
            <Plus size={11} /> 모델 추가
          </button>
          {activeChar && (
            <p className="text-[10px] text-neutral-500">
              적용됨 · 모델컷 생성 시 이 사람의 얼굴·체형만 참고합니다.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-3 text-neutral-300">
      <Loader2 size={14} className="animate-spin" />
    </div>
  );
}
