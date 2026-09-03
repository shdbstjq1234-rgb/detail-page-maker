import type { ImageProvider } from "./types";
import { MockImageProvider } from "./mock";

/**
 * 이미지 생성기 선택.
 *   IMAGE_PROVIDER = mock | nanobanana | higgsfield
 * IMAGE_PROVIDER 를 지정하지 않아도, 키가 있으면 자동으로 그 프로바이더를 쓴다.
 * 어떤 키도 없으면 mock(placeholder)로 폴백한다.
 */
export async function getImageProvider(): Promise<ImageProvider> {
  const explicit = (process.env.IMAGE_PROVIDER || "").trim().toLowerCase();
  const nanoKey = process.env.NANOBANANA_API_KEY?.trim();
  const higgsKey = process.env.HIGGSFIELD_API_KEY?.trim();

  // 명시적 선택 우선
  if (explicit === "nanobanana" || (!explicit && nanoKey)) {
    if (nanoKey) {
      const { NanoBananaProvider } = await import("./nanoBanana");
      return new NanoBananaProvider(nanoKey, process.env.NANOBANANA_API_URL);
    }
    if (explicit === "nanobanana") console.warn("[image-provider] NANOBANANA_API_KEY 없음 → mock 폴백");
  }

  if (explicit === "higgsfield" || (!explicit && higgsKey)) {
    if (higgsKey) {
      const { HiggsfieldProvider } = await import("./higgsfield");
      return new HiggsfieldProvider(higgsKey, process.env.HIGGSFIELD_API_URL);
    }
    if (explicit === "higgsfield") console.warn("[image-provider] HIGGSFIELD_API_KEY 없음 → mock 폴백");
  }

  return new MockImageProvider();
}

/** 현재 활성 프로바이더 이름 (UI 표시용, 키 노출 없음) */
export function activeProviderName(): "mock" | "nanobanana" | "higgsfield" {
  const explicit = (process.env.IMAGE_PROVIDER || "").trim().toLowerCase();
  const nanoKey = !!process.env.NANOBANANA_API_KEY?.trim();
  const higgsKey = !!process.env.HIGGSFIELD_API_KEY?.trim();
  if ((explicit === "nanobanana" || !explicit) && nanoKey) return "nanobanana";
  if ((explicit === "higgsfield" || !explicit) && higgsKey) return "higgsfield";
  return "mock";
}

export * from "./types";
export { MockImageProvider } from "./mock";
