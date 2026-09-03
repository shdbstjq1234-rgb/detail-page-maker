import type { LlmClient } from "./llm/client";
import { getLlmClient } from "./llm/client";
import { extractJson, clampScore } from "@/lib/json";
import type {
  GeneratedImage,
  SelectedImage,
  PlannedSection,
  ProductInput,
} from "@/types/detail-page";

const SYSTEM = `너는 상세페이지 아트 디렉터다.
같은 역할(role)로 생성된 여러 이미지 후보 중 상세페이지에 쓸 1장을 고른다.
기준: 섹션 메시지 부합도 > 구도/가독성 > 브랜드 톤 > 시선 유도.
JSON 으로만 답한다.`;

/**
 * 섹션의 이미지 후보들을 role 별로 묶어 각 role 마다 1장씩 선택한다.
 */
export async function selectImagesForSection(
  section: PlannedSection,
  candidates: GeneratedImage[],
  ctx: { input: ProductInput },
  opts: { llm?: LlmClient } = {},
): Promise<SelectedImage[]> {
  if (candidates.length === 0) return [];
  const llm = opts.llm ?? (await getLlmClient());

  const byRole = new Map<string, GeneratedImage[]>();
  for (const img of candidates) {
    const list = byRole.get(img.role) ?? [];
    list.push(img);
    byRole.set(img.role, list);
  }

  const picks: SelectedImage[] = [];

  for (const [role, imgs] of byRole) {
    if (imgs.length === 1) {
      picks.push({
        sectionId: section.id,
        role: imgs[0].role,
        chosen: imgs[0],
        candidates: imgs,
        reason: "후보가 1장뿐",
        score: 70,
      });
      continue;
    }

    const user = `아래는 "${ctx.input.name}" 상세페이지 [${section.type}] 섹션, role=${role} 의 이미지 후보다.
섹션 메시지: ${section.message}

[후보]
${imgs.map((im, i) => `#${i} seed=${im.seed ?? "-"} ${im.width}x${im.height}\n   prompt: ${im.prompt}`).join("\n")}

[출력 JSON]
{ "chosenIndex": number, "reason": string, "score": number }  // score 0~100`;

    let chosenIndex = 0;
    let reason = "기본 선택";
    let score = 65;
    try {
      const text = await llm.complete({
        system: SYSTEM,
        messages: [{ role: "user", content: user }],
        expectJson: true,
        maxTokens: 800,
        label: `imageSelector:${section.type}:${section.id}:${role}`,
      });
      const raw = extractJson<{ chosenIndex?: number; reason?: string; score?: number }>(text);
      chosenIndex = Number.isInteger(raw.chosenIndex) ? Math.max(0, Math.min(imgs.length - 1, raw.chosenIndex!)) : 0;
      reason = raw.reason?.trim() || reason;
      score = clampScore(raw.score, 65);
    } catch (err) {
      console.error(`[imageSelector] ${section.id}/${role} 실패, 0번 사용:`, err);
    }

    picks.push({
      sectionId: section.id,
      role: imgs[chosenIndex].role,
      chosen: imgs[chosenIndex],
      candidates: imgs,
      reason,
      score,
    });
  }

  return picks;
}

export async function selectAllImages(
  sections: PlannedSection[],
  candidatesBySection: GeneratedImage[][],
  ctx: { input: ProductInput },
  opts: { llm?: LlmClient } = {},
): Promise<SelectedImage[]> {
  const llm = opts.llm ?? (await getLlmClient());
  const out = await Promise.all(
    sections.map((s, i) => selectImagesForSection(s, candidatesBySection[i] ?? [], ctx, { llm })),
  );
  return out.flat();
}
