import type { LlmClient } from "./llm/client";
import { getLlmClient } from "./llm/client";
import { extractJson } from "@/lib/json";
import type {
  ProductInput,
  ProductAnalysis,
  PlannedSection,
  SectionCopy,
  ImagePrompt,
  ImagePromptSet,
  ImageRole,
} from "@/types/detail-page";

const SYSTEM = `너는 이커머스 상세페이지용 AI 이미지 프롬프트 엔지니어다.
Nano Banana / Higgsfield 같은 이미지 생성기에 넣을 프롬프트를 만든다.
규칙:
- 프롬프트는 영어로 작성한다(생성기 성능이 더 좋음).
- 각 섹션 목적에 맞는 구도/조명/분위기를 구체적으로 지정한다.
- 상세페이지는 세로 스크롤이므로 세로형(4:5, 3:4) 또는 정사각(1:1)을 주로 쓴다.
- 텍스트/로고/워터마크가 이미지에 들어가지 않도록 negativePrompt 에 명시한다.
- 하나의 섹션에 대해 서로 다른 각도의 후보를 여러 개 만든다.`;

const ASPECTS: ImagePrompt["aspectRatio"][] = ["1:1", "4:5", "3:4", "16:9", "9:16"];

export async function generateImagePrompts(
  section: PlannedSection,
  copy: SectionCopy,
  ctx: { input: ProductInput; analysis: ProductAnalysis },
  opts: { llm?: LlmClient; perRole?: number } = {},
): Promise<ImagePromptSet> {
  const llm = opts.llm ?? (await getLlmClient());
  const perRole = opts.perRole ?? 1;
  const roles: ImageRole[] = section.imageRoles.length ? section.imageRoles : ["featureExplainer"];

  const refUrl = ctx.input.images?.[0]?.url;

  const user = `아래 섹션에 필요한 이미지 생성 프롬프트를 만들어 JSON 으로 답하라.

[상품] ${ctx.input.name} / ${ctx.analysis.category}
[브랜드 톤] ${ctx.input.brandTone ?? "clean, trustworthy, minimal"}
[섹션 type] ${section.type}
[섹션 메시지] ${section.message}
[섹션 헤드라인] ${copy.headline}
[필요한 imageRole] ${roles.join(", ")}
${refUrl ? `[참고 이미지 URL] ${refUrl} (image-to-image 참고용)` : ""}

[출력 JSON]
{
  "prompts": [
    {
      "role": imageRole,                 // 위 목록 중 하나
      "prompt": string,                  // 영어, 구체적으로
      "negativePrompt": string,
      "aspectRatio": "1:1"|"4:5"|"3:4"|"16:9"|"9:16",
      "intent": string                   // 이 이미지가 섹션에서 하는 역할(한국어)
    }
  ]
}
role 당 프롬프트 ${perRole}개씩, 총 ${roles.length * perRole}개.`;

  const text = await llm.complete({
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
    expectJson: true,
    maxTokens: 2500,
    label: `imagePromptGenerator:${section.type}:${section.id}`,
  });

  const raw = extractJson<{ prompts?: Partial<ImagePrompt>[] }>(text);

  let prompts: ImagePrompt[] = (raw.prompts ?? [])
    .filter((p) => p.prompt)
    .map((p) => ({
      role: (roles.includes(p.role as ImageRole) ? p.role : roles[0]) as ImageRole,
      prompt: String(p.prompt).trim(),
      negativePrompt: p.negativePrompt?.trim() || "text, watermark, logo, caption, low quality, distortion, extra limbs",
      aspectRatio: ASPECTS.includes(p.aspectRatio as ImagePrompt["aspectRatio"])
        ? (p.aspectRatio as ImagePrompt["aspectRatio"])
        : section.type === "hero"
          ? "4:5"
          : "1:1",
      intent: p.intent?.trim() || `${section.type} 섹션 이미지`,
      referenceImageUrl: refUrl,
    }));

  if (prompts.length === 0) {
    prompts = roles.map((role) => ({
      role,
      prompt: `Korean e-commerce product photo of "${ctx.input.name}", ${role} composition, studio lighting, soft shadows, minimal neutral background, high detail, commercial photography`,
      negativePrompt: "text, watermark, logo, low quality, distortion",
      aspectRatio: section.type === "hero" ? "4:5" : "1:1",
      intent: `${section.type} 섹션 이미지`,
      referenceImageUrl: refUrl,
    }));
  }

  return { sectionId: section.id, prompts };
}

export async function generateAllImagePrompts(
  sections: PlannedSection[],
  copies: SectionCopy[],
  ctx: { input: ProductInput; analysis: ProductAnalysis },
  opts: { llm?: LlmClient; perRole?: number } = {},
): Promise<ImagePromptSet[]> {
  const llm = opts.llm ?? (await getLlmClient());
  const byId = new Map(copies.map((c) => [c.sectionId, c]));
  return Promise.all(
    sections.map((s) =>
      generateImagePrompts(s, byId.get(s.id) ?? fallbackCopy(s), ctx, { llm, perRole: opts.perRole }),
    ),
  );
}

function fallbackCopy(s: PlannedSection): SectionCopy {
  return { sectionId: s.id, type: s.type, headline: s.message };
}
