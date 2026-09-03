"use client";

/**
 * 상세페이지 DOM → 이미지 파일.
 *  - domToPng: 외부 이미지를 fetch 해 data URL 로 인라인하므로 canvas 오염(taint) 없이 저장된다.
 *  - split: 긴 세로 이미지를 쿠팡/스마트스토어 업로드용으로 여러 장으로 자른다.
 */
import { domToPng, domToJpeg } from "modern-screenshot";
import JSZip from "jszip";

export interface RenderOpts {
  /** 결과 픽셀 배율 (2 = 레티나) */
  scale?: number;
  format?: "png" | "jpg";
}

export async function renderNode(node: HTMLElement, opts: RenderOpts = {}): Promise<string> {
  const scale = opts.scale ?? 2;
  const options = {
    scale,
    backgroundColor: "#ffffff",
    // 폰트가 늦게 붙어도 기다리도록
    features: { removeControlCharacter: true },
  };
  return opts.format === "jpg" ? domToJpeg(node, { ...options, quality: 0.92 }) : domToPng(node, options);
}

/** dataURL 이미지를 sliceHeight(px, 원본 좌표계) 단위로 세로 분할 */
export async function splitByHeight(dataUrl: string, sliceHeight = 1400): Promise<string[]> {
  const img = await loadImage(dataUrl);
  if (img.height <= sliceHeight) return [dataUrl];
  const out: string[] = [];
  for (let y = 0; y < img.height; y += sliceHeight) {
    const h = Math.min(sliceHeight, img.height - y);
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, y, img.width, h, 0, 0, img.width, h);
    out.push(c.toDataURL("image/png"));
  }
  return out;
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadZip(filename: string, files: { name: string; dataUrl: string }[]) {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, f.dataUrl.split(",")[1], { base64: true });
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(filename, url);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * 원격/데이터 URL 이미지들을 받아 ZIP 하나로 묶어 다운로드.
 * 상세페이지에 쓴 생성 이미지 원본을 한 번에 저장할 때 사용.
 */
export async function downloadUrlsZip(
  filename: string,
  items: { name: string; url: string }[],
): Promise<{ ok: number; failed: number }> {
  const zip = new JSZip();
  let ok = 0;
  let failed = 0;
  await Promise.all(
    items.map(async (it) => {
      try {
        let blob: Blob;
        if (it.url.startsWith("data:")) {
          const [head, b64] = it.url.split(",");
          const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/png";
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          blob = new Blob([arr], { type: mime });
        } else {
          const res = await fetch(it.url, { mode: "cors" });
          if (!res.ok) throw new Error(String(res.status));
          blob = await res.blob();
        }
        const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg").split("+")[0];
        zip.file(`${it.name}.${ext}`, blob);
        ok++;
      } catch {
        failed++;
      }
    }),
  );
  if (ok === 0) throw new Error("저장할 이미지를 가져오지 못했습니다.");
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(filename, url);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { ok, failed };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
