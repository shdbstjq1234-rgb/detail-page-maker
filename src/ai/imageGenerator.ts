import { getImageProvider } from "@/image-providers";
import type { ImageProvider } from "@/image-providers";
import type { GeneratedImage, ImagePromptSet } from "@/types/detail-page";

/**
 * 섹션별 이미지 프롬프트 → 실제 이미지 후보 생성.
 * 각 프롬프트마다 candidatesPerPrompt 장의 후보를 만든다.
 * (이후 imageSelector 가 role 별로 1장씩 고른다.)
 */
export async function generateImages(
  promptSets: ImagePromptSet[],
  opts: { provider?: ImageProvider; candidatesPerPrompt?: number } = {},
): Promise<GeneratedImage[][]> {
  const provider = opts.provider ?? (await getImageProvider());
  const count =
    opts.candidatesPerPrompt ??
    Math.max(1, Number(process.env.IMAGE_CANDIDATES_PER_SECTION) || 3);

  return Promise.all(
    promptSets.map(async (set) => {
      const perPrompt = await Promise.all(
        set.prompts.map(async (p, pi) => {
          try {
            const results = await provider.generate({
              prompt: p.prompt,
              negativePrompt: p.negativePrompt,
              aspectRatio: p.aspectRatio,
              referenceImageUrl: p.referenceImageUrl,
              count,
              seed: 1000 + pi * 100,
            });
            return results
              .filter((r) => r.url)
              .map(
                (r, i): GeneratedImage => ({
                  id: `${set.sectionId}-${p.role}-${pi}-${i}`,
                  sectionId: set.sectionId,
                  role: p.role,
                  provider: provider.name,
                  url: r.url,
                  width: r.width,
                  height: r.height,
                  prompt: p.prompt,
                  seed: r.seed,
                  raw: r.raw,
                }),
              );
          } catch (err) {
            console.error(`[imageGenerator] ${set.sectionId}/${p.role} 실패:`, err);
            return [];
          }
        }),
      );
      return perPrompt.flat();
    }),
  );
}
