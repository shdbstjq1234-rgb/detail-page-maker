import { NextRequest, NextResponse } from "next/server";
import { getLlmClient } from "@/ai/llm/client";
import { extractJson } from "@/lib/json";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * "정보 붙여넣기" — 셀러가 받은 상품 자료(중국 셀러 원문, 스펙표, 메모 등)를
 * 통째로 붙여넣으면 상품 입력 필드로 구조화한다.
 *
 * body: { text: string }
 * → { ok, fields: Partial<ProductInput-ish>, notes: string, source }
 *
 * 절대 없는 스펙/수치/인증을 지어내지 않는다. 원문에 있는 정보만 옮긴다.
 */

type ParsedFields = {
  name?: string;
  category?: string;
  price?: number;
  description?: string;
  material?: string;
  size?: string;
  components?: string;
  targetCustomer?: string;
  salesChannel?: string;
  brandTone?: string;
  features?: string[];
  specs?: string[];
  sellingPoints?: string[];
  extraRequest?: string;
};

export async function POST(req: NextRequest) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const text = (body.text ?? "").toString().trim();
  if (text.length < 4) {
    return NextResponse.json({ ok: false, error: "붙여넣은 내용이 너무 짧습니다." }, { status: 400 });
  }
  const clipped = text.slice(0, 12000);

  const llm = await getLlmClient();

  if (llm.name === "mock") {
    const fields = heuristic(clipped);
    return NextResponse.json({ ok: true, fields, notes: heuristicNotes(fields), source: "heuristic" });
  }

  try {
    const raw = await llm.complete({
      system:
        "너는 한국 이커머스 상세페이지 기획자다. 셀러가 붙여넣은 상품 원문(메모/스펙표/번역문 등)을 읽고 " +
        "상세페이지 제작에 필요한 입력값으로 구조화한다. 규칙: (1) 원문에 실제로 있는 정보만 옮긴다. " +
        "(2) 소재·치수·인증·수치·효능을 추측해서 만들지 않는다. 불확실하면 비워둔다. " +
        "(3) description 은 원문을 자연스러운 한국어 2~4문장으로 정리하되 과장/미사여구를 넣지 않는다. " +
        "(4) features 는 '무엇을 해준다' 형태의 짧은 구절 3~8개. sellingPoints 는 구매 이유가 되는 강점만. " +
        "(5) specs 는 '항목: 값' 형태로 원문에 명시된 것만. JSON 하나만 출력한다.",
      messages: [
        {
          role: "user",
          content:
            `[상품 원문]\n${clipped}\n\n` +
            `[출력 JSON 스키마]\n{\n` +
            `  "name": string,            // 상품명 (브랜드 접두어 없이 핵심 명칭)\n` +
            `  "category": string,        // "대분류/소분류" 형태 추정 가능\n` +
            `  "price": number|null,      // 원문에 판매가가 명시된 경우만 숫자(원)\n` +
            `  "description": string,     // 2~4문장 정리\n` +
            `  "material": string,        // 소재/원단 (명시된 것만)\n` +
            `  "size": string,            // 치수/사이즈 (명시된 것만)\n` +
            `  "components": string,      // 구성품 (명시된 것만)\n` +
            `  "targetCustomer": string,  // 원문에서 유추되는 주 타깃 (없으면 "")\n` +
            `  "salesChannel": string,    // "쿠팡"|"네이버 스마트스토어"|"" 중\n` +
            `  "brandTone": string,       // 원문 톤에서 느껴지는 분위기 한 구절 (없으면 "")\n` +
            `  "features": string[],\n` +
            `  "specs": string[],         // "항목: 값"\n` +
            `  "sellingPoints": string[],\n` +
            `  "notes": string            // 상세페이지에서 셀러가 반드시 보완해야 할 정보(빠진 스펙/인증/수치)를 1~3줄로\n` +
            `}`,
        },
      ],
      expectJson: true,
      maxTokens: 1600,
      label: "parse-info",
    });
    const p = extractJson<ParsedFields & { notes?: string }>(raw);
    const fields = sanitize(p);
    const notes = (p.notes || "").toString().trim() || heuristicNotes(fields);
    return NextResponse.json({ ok: true, fields, notes, source: "llm" });
  } catch (e) {
    const fields = heuristic(clipped);
    return NextResponse.json({
      ok: true,
      fields,
      notes: heuristicNotes(fields),
      source: "heuristic",
      warn: e instanceof Error ? e.message : String(e),
    });
  }
}

// ---------------------------------------------------------------------------

function sanitize(p: ParsedFields): ParsedFields {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const arr = (v: unknown) =>
    Array.isArray(v)
      ? [...new Set(v.map((x) => String(x).trim()).filter((x) => x.length > 0 && x.length < 120))].slice(0, 12)
      : undefined;
  const price =
    typeof p.price === "number" && isFinite(p.price) && p.price > 0 && p.price < 100_000_000
      ? Math.round(p.price)
      : undefined;
  const channel = str(p.salesChannel);
  const out: ParsedFields = {
    name: str(p.name) || undefined,
    category: str(p.category) || undefined,
    price,
    description: str(p.description) || undefined,
    material: str(p.material) || undefined,
    size: str(p.size) || undefined,
    components: str(p.components) || undefined,
    targetCustomer: str(p.targetCustomer) || undefined,
    salesChannel: ["쿠팡", "네이버 스마트스토어"].includes(channel) ? channel : undefined,
    brandTone: str(p.brandTone) || undefined,
    features: arr(p.features),
    specs: arr(p.specs),
    sellingPoints: arr(p.sellingPoints),
  };
  return out;
}

/** 라벨 기반 휴리스틱 파서 (키 없을 때) */
function heuristic(text: string): ParsedFields {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const pick = (keys: string[]): string | undefined => {
    for (const line of lines) {
      const m = line.match(/^[\-\*•]?\s*([^:：|]+)[:：|]\s*(.+)$/);
      if (!m) continue;
      const label = m[1].replace(/\s/g, "").toLowerCase();
      if (keys.some((k) => label.includes(k))) return m[2].trim();
    }
    return undefined;
  };

  const priceRaw = pick(["가격", "판매가", "소비자가", "price", "정가"]);
  const price = priceRaw ? Number(priceRaw.replace(/[^0-9]/g, "")) || undefined : undefined;

  const name =
    pick(["상품명", "제품명", "품명", "productname", "name", "모델명"]) ||
    lines[0]?.replace(/^[\-\*•#]\s*/, "").slice(0, 60);

  // 라벨 없는 나머지 줄 → 특징 후보
  const featureLines = lines
    .filter((l) => !/^[^:：|]{1,14}[:：|]/.test(l))
    .map((l) => l.replace(/^[\-\*•]\s*/, "").trim())
    .filter((l) => l.length >= 4 && l.length <= 90);

  const specLines = lines
    .filter((l) => /^[^:：|]{1,16}[:：|]\s*.+/.test(l))
    .filter((l) => !/^(상품명|제품명|품명|가격|판매가|정가)/.test(l))
    .slice(0, 12);

  return {
    name: name || undefined,
    category: pick(["카테고리", "분류", "category", "품목"]) || undefined,
    price,
    description: featureLines.slice(0, 4).join(" ") || text.slice(0, 300) || undefined,
    material: pick(["소재", "재질", "원단", "material", "성분"]) || undefined,
    size: pick(["크기", "사이즈", "치수", "size", "규격", "중량", "무게"]) || undefined,
    components: pick(["구성", "구성품", "세트구성", "패키지", "포함"]) || undefined,
    targetCustomer: pick(["타깃", "타겟", "대상", "추천대상", "target"]) || undefined,
    salesChannel: /쿠팡|coupang/i.test(text)
      ? "쿠팡"
      : /스마트스토어|네이버/i.test(text)
        ? "네이버 스마트스토어"
        : undefined,
    features: featureLines.slice(0, 8).length ? featureLines.slice(0, 8) : undefined,
    specs: specLines.length ? specLines : undefined,
  };
}

function heuristicNotes(f: ParsedFields): string {
  const missing: string[] = [];
  if (!f.material) missing.push("소재/원단");
  if (!f.size) missing.push("정확한 치수·중량");
  if (!f.price) missing.push("판매가");
  if (!f.components) missing.push("구성품");
  const base =
    missing.length > 0
      ? `상세페이지 신뢰도를 위해 다음 정보를 보완하면 좋습니다: ${missing.join(", ")}.`
      : "핵심 정보가 대부분 채워졌습니다. 인증·시험 수치가 있다면 별도로 추가하세요.";
  return `${base} 원문에 없는 인증·성능 수치(예: 항균 99%, 방수)는 자동으로 넣지 않았습니다.`;
}
