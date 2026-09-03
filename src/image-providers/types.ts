import type { ImageProviderName } from "@/types/detail-page";

export interface ImageGenRequest {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: "1:1" | "4:5" | "3:4" | "16:9" | "9:16";
  /** image-to-image 참고 이미지 */
  referenceImageUrl?: string;
  /** 이 요청으로 만들 후보 장수 */
  count: number;
  seed?: number;
}

export interface ImageGenResult {
  url: string;
  width: number;
  height: number;
  seed?: number;
  raw?: unknown;
}

export interface ImageProvider {
  readonly name: ImageProviderName;
  generate(req: ImageGenRequest): Promise<ImageGenResult[]>;
}

/** "4:5" → {width,height} (긴 변 1000 기준 · 기본 1:1 이면 1000×1000) */
export function ratioToSize(ratio: ImageGenRequest["aspectRatio"]): { width: number; height: number } {
  const [w, h] = ratio.split(":").map(Number);
  const long = 1000;
  return w >= h
    ? { width: long, height: Math.round((long * h) / w) }
    : { width: Math.round((long * w) / h), height: long };
}
