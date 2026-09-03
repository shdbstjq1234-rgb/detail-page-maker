import type { ImageProvider, ImageGenRequest, ImageGenResult } from "./types";
import { ratioToSize } from "./types";

/**
 * 목업 이미지 프로바이더.
 * 실제 생성 API 없이 placeholder 이미지 URL 을 만들어 파이프라인을 끝까지 굴린다.
 * 후보마다 색/시드를 다르게 줘서 imageSelector 가 고를 대상이 생긴다.
 */
export class MockImageProvider implements ImageProvider {
  readonly name = "mock" as const;

  async generate(req: ImageGenRequest): Promise<ImageGenResult[]> {
    const { width, height } = ratioToSize(req.aspectRatio);
    const palette = ["e9e4dc", "dfe6e2", "e7e0e6", "e2e6ee", "efe7dc"];
    const label = encodeURIComponent(req.prompt.slice(0, 24).replace(/\s+/g, "+"));

    return Array.from({ length: req.count }, (_, i) => {
      const bg = palette[i % palette.length];
      return {
        url: `https://placehold.co/${width}x${height}/${bg}/555?text=${label}+%23${i + 1}`,
        width,
        height,
        seed: (req.seed ?? 1000) + i,
        raw: { provider: "mock", index: i },
      } satisfies ImageGenResult;
    });
  }
}
