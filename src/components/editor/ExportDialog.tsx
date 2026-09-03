"use client";

import { useState } from "react";
import { X, Loader2, FileImage, Scissors, Archive, AlertTriangle, Images } from "lucide-react";
import { downloadDataUrl, downloadUrlsZip, downloadZip, renderNode, splitByHeight } from "@/lib/export-image";

type Mode = "png" | "jpg" | "split" | "zip" | "assets";

export function ExportDialog({
  open,
  onClose,
  getNode,
  baseName,
  demoReviewCount = 0,
  images = [],
  qaIssueCount = 0,
  onQa,
}: {
  open: boolean;
  onClose: () => void;
  getNode: () => HTMLElement | null;
  baseName: string;
  demoReviewCount?: number;
  /** 상세페이지에 쓰인 생성 이미지 원본 (ZIP 다운로드용) */
  images?: { name: string; url: string }[];
  /** 검수에서 발견된 error+warn 건수 */
  qaIssueCount?: number;
  onQa?: () => void;
}) {
  const [busy, setBusy] = useState<Mode | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [sliceH, setSliceH] = useState(1400);
  const safe = (baseName || "detail-page").replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ.-]/g, "_").slice(0, 40);

  async function run(mode: Mode) {
    setErr(null);
    setDone(null);

    if (mode === "assets") {
      if (!images.length) {
        setErr("아직 생성된 이미지가 없습니다.");
        return;
      }
      setBusy(mode);
      try {
        const r = await downloadUrlsZip(`${safe}_images.zip`, images);
        setDone(`이미지 ${r.ok}개 ZIP 저장 완료${r.failed ? ` (${r.failed}개 실패)` : ""}`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "다운로드에 실패했습니다.");
      } finally {
        setBusy(null);
      }
      return;
    }

    const node = getNode();
    if (!node) {
      setErr("미리보기를 찾을 수 없습니다.");
      return;
    }
    setBusy(mode);
    try {
      // 폰트/이미지 로드 대기 (최대 3초, 백그라운드 탭에서 무한 대기 방지)
      if (document.fonts?.ready) {
        await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
      }
      await new Promise((r) => setTimeout(r, 120));

      // 긴 페이지는 배율을 낮춰 속도 확보 (쿠팡/스마트스토어 업로드엔 충분한 해상도)
      const tall = node.scrollHeight > 9000;
      const scale = tall ? 1.6 : 2;

      if (mode === "jpg") {
        downloadDataUrl(`${safe}.jpg`, await renderNode(node, { format: "jpg", scale }));
        setDone("JPG 저장 완료");
      } else if (mode === "png") {
        downloadDataUrl(`${safe}.png`, await renderNode(node, { format: "png", scale }));
        setDone("PNG 저장 완료");
      } else {
        const full = await renderNode(node, { format: "png", scale });
        const parts = await splitByHeight(full, Math.round(sliceH * scale));
        if (parts.length === 1) {
          downloadDataUrl(`${safe}.png`, parts[0]);
          setDone("PNG 저장 완료 (분할할 만큼 길지 않음)");
        } else if (mode === "split") {
          parts.forEach((p, i) => setTimeout(() => downloadDataUrl(`${safe}_${i + 1}.png`, p), i * 400));
          setDone(`${parts.length}장으로 나눠 저장 완료`);
        } else {
          await downloadZip(
            `${safe}.zip`,
            parts.map((dataUrl, i) => ({ name: `${safe}_${String(i + 1).padStart(2, "0")}.png`, dataUrl })),
          );
          setDone(`ZIP 저장 완료 (${parts.length}장)`);
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "다운로드에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[420px] rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[15px] font-bold">상세페이지 다운로드</h2>
          <button onClick={onClose} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-[11px] text-neutral-400">
          편집 화면 · 버튼은 빠지고 상세페이지만 저장됩니다. 페이지가 길면 30초~1분 걸릴 수 있어요.
        </p>

        {qaIssueCount > 0 && (
          <button
            onClick={() => {
              onClose();
              onQa?.();
            }}
            className="mb-3 flex w-full items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-[12px] text-amber-800 hover:bg-amber-100"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              검수에서 <b>{qaIssueCount}건</b>이 발견됐어요. 다운로드 전에 확인하려면 눌러주세요.
            </span>
          </button>
        )}

        {demoReviewCount > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              현재 AI가 작성한 리뷰 초안 {demoReviewCount}개가 포함되어 있습니다. 실제 판매용이라면 실제 구매 후기로
              교체해 주세요.
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Row
            icon={<FileImage size={16} />}
            title="긴 PNG 한 장"
            desc="상세페이지 전체를 이미지 한 장으로"
            loading={busy === "png"}
            onClick={() => run("png")}
          />
          <Row
            icon={<FileImage size={16} />}
            title="긴 JPG 한 장"
            desc="용량이 작은 JPG로"
            loading={busy === "jpg"}
            onClick={() => run("jpg")}
          />
          <Row
            icon={<Scissors size={16} />}
            title="여러 장으로 분할 (PNG)"
            desc="쿠팡·스마트스토어 업로드용으로 잘라서 각각 다운로드"
            loading={busy === "split"}
            onClick={() => run("split")}
          />
          <Row
            icon={<Archive size={16} />}
            title="분할 + ZIP"
            desc="분할한 이미지를 압축 파일 하나로"
            loading={busy === "zip"}
            onClick={() => run("zip")}
          />
          <Row
            icon={<Images size={16} />}
            title={`생성 이미지 모음 (ZIP)${images.length ? ` · ${images.length}장` : ""}`}
            desc="AI로 만든 이미지 원본을 낱장으로 한 번에"
            loading={busy === "assets"}
            onClick={() => run("assets")}
          />
        </div>

        <label className="mt-4 flex items-center justify-between text-[12px] text-neutral-600">
          분할 높이 (px)
          <input
            type="number"
            min={600}
            max={4000}
            step={100}
            value={sliceH}
            onChange={(e) => setSliceH(Math.max(600, Number(e.target.value) || 1400))}
            className="w-24 rounded-lg border border-neutral-200 px-2 py-1 text-right outline-none focus:border-neutral-900"
          />
        </label>

        {busy && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-2 text-[12px] text-neutral-600">
            <Loader2 size={12} className="animate-spin" /> 이미지를 만들고 있어요… 창을 닫지 마세요.
          </p>
        )}
        {done && !busy && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">{done}</p>
        )}
        {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{err}</p>}
      </div>
    </div>
  );
}

function Row({
  icon,
  title,
  desc,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-3 py-3 text-left transition-colors hover:border-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
    >
      <span className="text-neutral-700">{loading ? <Loader2 size={16} className="animate-spin" /> : icon}</span>
      <span className="flex-1">
        <span className="block text-[13px] font-semibold text-neutral-900">{title}</span>
        <span className="block text-[11px] text-neutral-500">{desc}</span>
      </span>
    </button>
  );
}
