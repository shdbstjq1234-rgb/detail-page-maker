/**
 * 라이브러리 — 브랜드 / 캐릭터(모델) / Evidence(근거자료) / 레퍼런스.
 * 프로젝트를 넘나들며 재사용하는 자산. 타입 + 클라이언트 fetch 헬퍼.
 */

export interface Brand {
  id: string;
  name: string;
  displayName?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  brandColor?: string | null;
  secondaryColor?: string | null;
  brandTone?: string | null;
  description?: string | null;
  /** 상품명 앞에 브랜드명 자동 추가 */
  prefixOn: boolean;
  updatedAt?: string;
}

export interface Character {
  id: string;
  brandId?: string | null;
  name: string;
  genderPresentation?: string | null;
  ageRange?: string | null;
  memo?: string | null;
  /** 얼굴·체형 참고 이미지 */
  images: string[];
  active: boolean;
  updatedAt?: string;
}

export const EVIDENCE_TYPES = ["시험성적서", "인증서", "특허·디자인등록", "성분·원료표", "공식 스펙", "기타"] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export interface Evidence {
  id: string;
  projectId?: string | null;
  type: string;
  institution?: string | null;
  documentUrl?: string | null;
  /** 자료에 적힌 실제 결과값 — 예: "UPF 50+", "항균 99.9%" */
  result: string;
  /** 이 근거로 페이지에 써도 되는 표현 */
  claimAllowed?: string | null;
  expiry?: string | null;
  memo?: string | null;
  updatedAt?: string;
}

export interface PageReference {
  id: string;
  name: string;
  sourceUrl?: string | null;
  thumbUrl?: string | null;
  /** 디자인 문법만 저장 (제품/브랜드/로고는 복사하지 않는다) */
  analysis: ReferenceAnalysis;
  updatedAt?: string;
}

export interface ReferenceAnalysis {
  layout?: string;
  spacing?: string;
  typography?: string;
  imageStyle?: string;
  sectionOrder?: string[];
  copyDensity?: string;
  colorUsage?: string;
  photoRatio?: string;
  modelUsage?: string;
  informationDensity?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// 클라이언트 API

type Kind = "brands" | "characters" | "evidence" | "references";

async function req<T>(kind: Kind, init?: RequestInit & { id?: string; query?: string }): Promise<T> {
  const id = init?.id ? `/${init.id}` : "";
  const q = init?.query ? `?${init.query}` : "";
  const res = await fetch(`/api/library/${kind}${id}${q}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error ?? "요청에 실패했습니다.");
  return data as T;
}

export const libraryApi = {
  listBrands: () => req<{ items: Brand[] }>("brands").then((d) => d.items),
  saveBrand: (b: Partial<Brand>) =>
    req<{ item: Brand }>("brands", { method: b.id ? "PUT" : "POST", id: b.id, body: JSON.stringify(b) }).then((d) => d.item),
  deleteBrand: (id: string) => req<{ ok: true }>("brands", { method: "DELETE", id }),

  listCharacters: () => req<{ items: Character[] }>("characters").then((d) => d.items),
  saveCharacter: (c: Partial<Character>) =>
    req<{ item: Character }>("characters", { method: c.id ? "PUT" : "POST", id: c.id, body: JSON.stringify(c) }).then((d) => d.item),
  deleteCharacter: (id: string) => req<{ ok: true }>("characters", { method: "DELETE", id }),

  listEvidence: (projectId?: string) =>
    req<{ items: Evidence[] }>("evidence", { query: projectId ? `projectId=${projectId}` : undefined }).then((d) => d.items),
  saveEvidence: (e: Partial<Evidence>) =>
    req<{ item: Evidence }>("evidence", { method: e.id ? "PUT" : "POST", id: e.id, body: JSON.stringify(e) }).then((d) => d.item),
  deleteEvidence: (id: string) => req<{ ok: true }>("evidence", { method: "DELETE", id }),

  listReferences: () => req<{ items: PageReference[] }>("references").then((d) => d.items),
  saveReference: (r: Partial<PageReference>) =>
    req<{ item: PageReference }>("references", { method: r.id ? "PUT" : "POST", id: r.id, body: JSON.stringify(r) }).then((d) => d.item),
  deleteReference: (id: string) => req<{ ok: true }>("references", { method: "DELETE", id }),
};

// ---------------------------------------------------------------------------
// 도메인 헬퍼

/** 브랜드 접두어를 붙인 상품명 */
export function brandedName(brand: Brand | null | undefined, productName: string): string {
  const n = productName.trim();
  if (!brand?.prefixOn) return n;
  const label = (brand.displayName || brand.name || "").trim();
  if (!label || !n) return n;
  return n.startsWith(label) ? n : `${label} ${n}`;
}

/** Evidence 를 QA·카피 생성에서 쓸 "근거 텍스트" 로 펼친다 */
export function evidenceHaystack(list: Evidence[]): string {
  return list
    .flatMap((e) => [e.result, e.claimAllowed, e.institution, e.type, e.memo])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** 캐릭터 레퍼런스는 "사람 외형"만 쓰라는 강한 지시문 (옷·소품 복사 금지) */
export function characterPromptBlock(c: Character | null | undefined): string {
  if (!c || !c.images?.length) return "";
  const who = [c.genderPresentation, c.ageRange].filter(Boolean).join(", ");
  return [
    `CHARACTER REFERENCE (identity only): ${c.name}${who ? ` — ${who}` : ""}.`,
    "Use the character reference images ONLY for the person's identity: face, facial structure, hairstyle,",
    "skin appearance, body type, height impression and body proportions.",
    "DO NOT copy clothing, shoes, accessories, bags, products, logos, props or background from the character reference.",
    "All clothing and products must come only from the PRODUCT REFERENCE of this project.",
  ].join(" ");
}
