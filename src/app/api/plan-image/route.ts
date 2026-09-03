import { NextRequest, NextResponse } from "next/server";
import { getLlmClient } from "@/ai/llm/client";
import { extractJson } from "@/lib/json";

export const runtime = "nodejs";
export const maxDuration = 120;

const PRODUCT_LOCK =
  "keep the exact product shape, proportions, color, material, pattern, buttons, ports, handles, logo and label from the reference — never redesign the product";
const NEGATIVE =
  "distorted product, changed product color, altered product structure, warped logo, extra accessories, deformed hands, extra fingers, malformed body, garbled text, watermark, lowres, cartoon, 3d render look when photo is expected";

/**
 * Higgsfield 요청 전 Claude Prompt Planning. (spec #4)
 * body: { preset, product, section?, usp?, tokens?, currentPrompt?, instruction? }
 * → { ok, prompt, negativePrompt, planDetail, source }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const preset = (body.preset ?? {}) as { key?: string; label?: string; scene?: string; purpose?: string; role?: string; group?: string };
  const product = (body.product ?? {}) as { name?: string; category?: string; targetCustomer?: string };
  const section = (body.section ?? {}) as { type?: string; headline?: string };
  const usp = typeof body.usp === "string" ? body.usp : "";
  const mood = ((body.tokens ?? {}) as { mood?: string }).mood ?? "clean minimal premium mood";
  const currentPrompt = typeof body.currentPrompt === "string" ? body.currentPrompt : "";
  const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";

  const llm = await getLlmClient();

  if (llm.name === "mock") {
    return NextResponse.json({
      ok: true,
      ...heuristic({ preset, product, section, usp, mood, currentPrompt, instruction }),
      source: "heuristic",
    });
  }

  try {
    const raw = await llm.complete({
      system:
        "너는 광고 사진 감독이자 AI 이미지 프롬프트 엔지니어다. 주어진 상세페이지 이미지 슬롯 하나에 대해 " +
        "촬영 기획서를 정리하고, Higgsfield(image-to-image) 에 바로 넣을 영문 프롬프트를 만든다. " +
        "가장 중요한 것은 레퍼런스 상품과 '같은 제품처럼' 보이는 것이다. JSON 으로만 답한다.",
      messages: [
        {
          role: "user",
          content:
            `이미지 슬롯: ${preset.label} (${preset.key}) — ${preset.purpose}\n` +
            `연출 방향: ${preset.scene}\n` +
            `상품: ${product.name ?? "-"} / ${product.category ?? "-"} / 타깃: ${product.targetCustomer ?? "-"}\n` +
            `배치 섹션: ${section.type ?? "-"} — "${section.headline ?? ""}"\n` +
            `핵심 USP: ${usp || "-"}\n` +
            `상세페이지 색·무드: ${mood}\n` +
            (currentPrompt ? `현재 프롬프트: ${currentPrompt}\n` : "") +
            (instruction ? `수정 요청: "${instruction}"\n` : "") +
            `\n[출력 JSON]\n{\n` +
            `  "planDetail": string,  // IMAGE PURPOSE / PRIMARY USP / PRODUCT PRESERVATION / SCENE / COMPOSITION / CAMERA / LIGHTING / MATERIAL / COLOR / MOOD / REALISM / NEGATIVE 를 줄바꿈으로 정리 (한국어 가능)\n` +
            `  "prompt": string,      // Higgsfield 최종 영문 프롬프트 (제품 원형 유지 문구 포함, 1~3문장)\n` +
            `  "negativePrompt": string\n}`,
        },
      ],
      expectJson: true,
      maxTokens: 1100,
      label: "plan-image",
    });
    const p = extractJson<{ planDetail?: string; prompt?: string; negativePrompt?: string }>(raw);
    return NextResponse.json({
      ok: true,
      prompt: (p.prompt || "").trim() || heuristic({ preset, product, section, usp, mood, currentPrompt, instruction }).prompt,
      negativePrompt: (p.negativePrompt || "").trim() || NEGATIVE,
      planDetail: (p.planDetail || "").trim(),
      source: "llm",
    });
  } catch (e) {
    return NextResponse.json({
      ok: true,
      ...heuristic({ preset, product, section, usp, mood, currentPrompt, instruction }),
      source: "heuristic",
      warn: e instanceof Error ? e.message : String(e),
    });
  }
}

// ---------------------------------------------------------------------------

function heuristic(a: {
  preset: { label?: string; scene?: string; purpose?: string; group?: string };
  product: { name?: string; category?: string; targetCustomer?: string };
  section: { type?: string; headline?: string };
  usp: string;
  mood: string;
  currentPrompt: string;
  instruction: string;
}) {
  const name = a.product.name?.trim() || "the product";
  const scene = a.preset.scene || "premium commercial product photo";
  const isModel = a.preset.group === "모델" || /model|body|walking/i.test(scene);

  // 자연어 수정 반영 (spec #24)
  const tweaks: string[] = [];
  const s = a.instruction.toLowerCase();
  if (/(제품.*크게|더 크게|크게 보여)/.test(s)) tweaks.push("product fills most of the frame");
  if (/(작게|여백)/.test(s)) tweaks.push("more negative space around the product");
  if (/(배경.*흰|흰색|화이트|white)/.test(s)) tweaks.push("clean pure white seamless background");
  if (/(배경.*검|어둡|블랙|dark|black)/.test(s)) tweaks.push("dark moody background");
  if (/(물.*튀|splash|스플래시)/.test(s)) tweaks.push("more dramatic water splash frozen in motion");
  if (/(스튜디오|광고|studio)/.test(s)) tweaks.push("studio advertising lighting, editorial polish");
  if (/(자연스럽|natural|캐주얼)/.test(s)) tweaks.push("natural candid feel, less staged");
  if (/(3d|씨지|render)/.test(s)) tweaks.push("real photography, avoid 3d render look");
  if (/(프리미엄|고급|럭셔리|premium|luxury)/.test(s)) tweaks.push("high-end luxury product photography");
  if (/(햇빛|sunlight|자연광)/.test(s)) tweaks.push("warm natural sunlight");
  if (/(낮은 각도|로우앵글|low angle|카메라.*낮)/.test(s)) tweaks.push("low camera angle looking slightly up");
  const km = s.match(/(20|30|40|50|60)대\s*(남성|여성)/);
  if (km) tweaks.push(`Korean ${km[2] === "여성" ? "woman" : "man"} in ${km[1]}s`);
  else if (isModel) tweaks.push("Korean model matching the product target audience");

  const planDetail = [
    `IMAGE PURPOSE: ${a.preset.purpose || "-"}`,
    `PRIMARY USP: ${a.usp || "-"}`,
    `PRODUCT PRESERVATION: 형태·비율·색상·소재·로고·라벨을 레퍼런스와 100% 동일하게 유지`,
    `SCENE: ${scene}`,
    `COMPOSITION: 제품을 중심 또는 삼분할 지점, 명확한 포그라운드/배경 분리`,
    `CAMERA: ${isModel ? "full/half body framing, 50mm 느낌, eye-level~low" : "product-level, 85mm 느낌, shallow depth of field"}`,
    `LIGHTING: soft key light + gentle fill + subtle rim light`,
    `MATERIAL: 제품 소재 질감이 그대로 드러나도록`,
    `COLOR: ${a.mood}`,
    `MOOD: Korean high-end e-commerce advertisement`,
    `REALISM: photorealistic commercial photography`,
    `NEGATIVE: ${NEGATIVE}`,
  ].join("\n");

  const prompt =
    `${name}, ${scene}` +
    (tweaks.length ? `, ${tweaks.join(", ")}` : "") +
    `, Korean e-commerce detail page image, photorealistic commercial photography, color mood: ${a.mood}, high detail. ${PRODUCT_LOCK}.`;

  return { prompt, negativePrompt: NEGATIVE, planDetail };
}
