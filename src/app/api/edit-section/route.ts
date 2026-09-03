import { NextRequest, NextResponse } from "next/server";
import { getLlmClient } from "@/ai/llm/client";
import { extractJson } from "@/lib/json";
import type { SectionCopy, SectionType } from "@/types/detail-page";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Patch {
  copy?: Partial<SectionCopy>;
  layout?: { tone?: string; align?: "left" | "center"; padding?: number; headlineScale?: number };
  note?: string;
}

/**
 * 선택한 섹션 하나를 자연어 지시로 수정.
 * body: { section: {type, copy, layout?}, instruction: string, product?: {name,category} }
 * → { ok, patch: { copy?, layout? } }
 *
 * ANTHROPIC_API_KEY 있으면 Claude, 없으면 키워드 휴리스틱(키 없이도 동작).
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const section = body.section as { type: SectionType; copy: SectionCopy; layout?: Patch["layout"] } | undefined;
  const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
  if (!section?.copy || !instruction) {
    return NextResponse.json({ ok: false, error: "수정할 섹션과 요청 문구가 필요합니다." }, { status: 400 });
  }
  const product = (body.product ?? {}) as { name?: string; category?: string };

  const llm = await getLlmClient();

  if (llm.name === "mock") {
    return NextResponse.json({ ok: true, patch: heuristicPatch(instruction, section), source: "heuristic" });
  }

  try {
    const raw = await llm.complete({
      system:
        "너는 한국 이커머스 상세페이지 카피라이터 겸 디자이너다. 주어진 섹션 하나를 사용자의 요청대로 고친다. " +
        "구매전환 중심의 짧고 강한 카피를 쓴다. 설명문처럼 길게 쓰지 않는다. JSON 으로만 답한다.",
      messages: [
        {
          role: "user",
          content:
            `상품: ${product.name ?? "-"} / ${product.category ?? "-"}\n` +
            `섹션 타입: ${section.type}\n` +
            `현재 섹션(JSON):\n${JSON.stringify({ copy: section.copy, layout: section.layout ?? {} })}\n\n` +
            `요청: "${instruction}"\n\n` +
            `[출력 JSON] 바뀐 필드만 넣는다. 형식:\n` +
            `{ "copy": { "headline"?: string, "subheadline"?: string, "bullets"?: string[], "cta"?: string,\n` +
            `           "stats"?: [{"value":string,"label":string}] },\n` +
            `  "layout": { "tone"?: "light"|"gray"|"dark"|"accent", "align"?: "left"|"center",\n` +
            `              "padding"?: number, "headlineScale"?: number } }`,
        },
      ],
      expectJson: true,
      maxTokens: 900,
      label: "edit-section",
    });
    const parsed = extractJson<Patch>(raw);
    return NextResponse.json({ ok: true, patch: sanitize(parsed), source: "llm" });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------

function sanitize(p: Patch): Patch {
  const out: Patch = {};
  if (p.copy && typeof p.copy === "object") {
    out.copy = {};
    if (typeof p.copy.headline === "string") out.copy.headline = p.copy.headline;
    if (typeof p.copy.subheadline === "string") out.copy.subheadline = p.copy.subheadline;
    if (Array.isArray(p.copy.bullets)) out.copy.bullets = p.copy.bullets.map(String).slice(0, 6);
    if (typeof p.copy.cta === "string") out.copy.cta = p.copy.cta;
    if (Array.isArray(p.copy.stats))
      out.copy.stats = p.copy.stats
        .filter((s) => s && typeof s.value === "string")
        .map((s) => ({ value: String(s.value), label: String(s.label ?? "") }))
        .slice(0, 4);
  }
  if (p.layout && typeof p.layout === "object") {
    out.layout = {};
    if (["light", "gray", "dark", "accent"].includes(p.layout.tone as string)) out.layout.tone = p.layout.tone;
    if (p.layout.align === "left" || p.layout.align === "center") out.layout.align = p.layout.align;
    if (typeof p.layout.padding === "number") out.layout.padding = clamp(p.layout.padding, 0.3, 2.5);
    if (typeof p.layout.headlineScale === "number") out.layout.headlineScale = clamp(p.layout.headlineScale, 0.6, 2);
  }
  return out;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** 키 없이 동작하는 규칙 기반 수정 */
function heuristicPatch(
  instr: string,
  section: { type: SectionType; copy: SectionCopy; layout?: Patch["layout"] },
): Patch {
  const s = instr.toLowerCase();
  const copy: Partial<SectionCopy> = {};
  const layout: NonNullable<Patch["layout"]> = {};
  const h = section.copy.headline ?? "";

  if (/(짧게|간결|줄여|한 ?줄)/.test(s)) {
    if (h) copy.headline = h.split(/[.,·\n]/)[0].trim().slice(0, 20);
    if (section.copy.subheadline) copy.subheadline = section.copy.subheadline.split(/[.,\n]/)[0].trim();
    if (section.copy.bullets) copy.bullets = section.copy.bullets.slice(0, 2);
  }
  if (/(강하게|강한|쎄게|임팩트|강조)/.test(s)) {
    if (h) copy.headline = `${h.replace(/[.!]+$/, "")}, 지금 확인하세요`;
    layout.headlineScale = 1.25;
  }
  if (/(고급|럭셔리|프리미엄|애플|luxury|apple)/.test(s)) {
    layout.tone = "light";
    layout.align = "center";
    layout.headlineScale = 1.15;
    layout.padding = 1.4;
  }
  if (/(미니멀|심플|깔끔|minimal)/.test(s)) {
    layout.tone = "light";
    layout.padding = 1.5;
    if (section.copy.bullets) copy.bullets = section.copy.bullets.slice(0, 3);
  }
  if (/(쿠팡|스마트스토어|판매|전환)/.test(s)) {
    layout.tone = "gray";
    layout.headlineScale = 1.3;
    layout.align = "left";
  }
  if (/(밝게|화이트|하얀)/.test(s)) layout.tone = "light";
  if (/(어둡게|블랙|검정|다크|dark)/.test(s)) layout.tone = "dark";
  if (/(가운데|센터|중앙|center)/.test(s)) layout.align = "center";
  if (/(왼쪽|좌측|left)/.test(s)) layout.align = "left";
  if (/(제품.*크게|이미지.*크게|크게 보여)/.test(s)) layout.padding = 0.7;
  if (/(여백|넓게|공간)/.test(s)) layout.padding = 1.7;
  if (/(20대|여성|타깃|타겟)/.test(s) && section.copy.subheadline) {
    copy.subheadline = `${section.copy.subheadline} — 취향까지 챙기는 선택`;
  }

  const patch: Patch = {};
  if (Object.keys(copy).length) patch.copy = copy;
  if (Object.keys(layout).length) patch.layout = layout;
  if (!patch.copy && !patch.layout) patch.note = "인식된 수정 키워드가 없어요. ‘더 강하게’, ‘더 고급스럽게’, ‘배경 어둡게’ 처럼 요청해 보세요.";
  return patch;
}
