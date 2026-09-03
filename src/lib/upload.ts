"use client";

/**
 * 이미지 저장.
 *  - 클라우드 모드: Supabase Storage 업로드 → 공개 URL
 *  - 로컬 모드: data URL 을 그대로 쓰되, 큰 이미지는 localStorage 용량을 위해 축소
 */
export async function uploadImage(
  dataUrl: string,
  opts: { projectId: string; kind?: "original" | "generated"; filename?: string },
): Promise<string> {
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl,
        projectId: opts.projectId,
        kind: opts.kind ?? "original",
        filename: opts.filename ?? "image",
      }),
    });
    const data = await res.json();
    if (data.ok && data.stored && data.url) return data.url as string; // Storage 업로드 성공
  } catch {
    /* 폴백 */
  }
  // 로컬 모드: data URL 은 브라우저에 남으므로 너무 크면 축소 (localStorage 보호)
  if (dataUrl.startsWith("data:image/") && dataUrl.length > 500_000) {
    try {
      return await shrinkDataUrl(dataUrl, 1280, 0.82);
    } catch {
      /* 축소 실패 시 원본 */
    }
  }
  return dataUrl;
}

/** data URL 을 최대폭 maxW 로 리사이즈하고 JPEG 로 재인코딩 */
export function shrinkDataUrl(dataUrl: string, maxW = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / (img.naturalWidth || maxW));
      const w = Math.round((img.naturalWidth || maxW) * scale);
      const h = Math.round((img.naturalHeight || maxW) * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("img load"));
    img.src = dataUrl;
  });
}
