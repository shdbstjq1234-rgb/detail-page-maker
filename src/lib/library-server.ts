import type { SupabaseClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 라이브러리 테이블 공통 CRUD.
 * DB(snake_case) ↔ 앱(camelCase) 매핑을 한 곳에서 관리한다.
 */

export type LibraryKind = "brands" | "characters" | "evidence" | "references";

interface Spec {
  table: string;
  /** DB 컬럼 → 앱 필드 */
  toApp: (r: any) => any;
  /** 앱 필드 → DB 컬럼 (undefined 는 제외) */
  toDb: (b: any) => Record<string, unknown>;
  orderBy: string;
}

const pick = (o: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out;
};

const SPECS: Record<LibraryKind, Spec> = {
  brands: {
    table: "brands",
    orderBy: "updated_at",
    toApp: (r) => ({
      id: r.id,
      name: r.name,
      displayName: r.display_name,
      logoUrl: r.logo_url,
      logoDarkUrl: r.logo_dark_url,
      brandColor: r.brand_color,
      secondaryColor: r.secondary_color,
      brandTone: r.brand_tone,
      description: r.description,
      prefixOn: r.prefix_on ?? true,
      updatedAt: r.updated_at,
    }),
    toDb: (b) =>
      pick({
        name: b.name,
        display_name: b.displayName,
        logo_url: b.logoUrl,
        logo_dark_url: b.logoDarkUrl,
        brand_color: b.brandColor,
        secondary_color: b.secondaryColor,
        brand_tone: b.brandTone,
        description: b.description,
        prefix_on: b.prefixOn,
      }),
  },
  characters: {
    table: "characters",
    orderBy: "updated_at",
    toApp: (r) => ({
      id: r.id,
      brandId: r.brand_id,
      name: r.name,
      genderPresentation: r.gender_presentation,
      ageRange: r.age_range,
      memo: r.memo,
      images: Array.isArray(r.images) ? r.images : [],
      active: r.active ?? true,
      updatedAt: r.updated_at,
    }),
    toDb: (b) =>
      pick({
        brand_id: b.brandId,
        name: b.name,
        gender_presentation: b.genderPresentation,
        age_range: b.ageRange,
        memo: b.memo,
        images: b.images,
        active: b.active,
      }),
  },
  evidence: {
    table: "evidence",
    orderBy: "created_at",
    toApp: (r) => ({
      id: r.id,
      projectId: r.project_id,
      type: r.type,
      institution: r.institution,
      documentUrl: r.document_url,
      result: r.result ?? "",
      claimAllowed: r.claim_allowed,
      expiry: r.expiry,
      memo: r.memo,
      updatedAt: r.updated_at,
    }),
    toDb: (b) =>
      pick({
        project_id: b.projectId,
        type: b.type,
        institution: b.institution,
        document_url: b.documentUrl,
        result: b.result,
        claim_allowed: b.claimAllowed,
        expiry: b.expiry || null,
        memo: b.memo,
      }),
  },
  references: {
    table: "page_references",
    orderBy: "updated_at",
    toApp: (r) => ({
      id: r.id,
      name: r.name,
      sourceUrl: r.source_url,
      thumbUrl: r.thumb_url,
      analysis: r.analysis ?? {},
      updatedAt: r.updated_at,
    }),
    toDb: (b) =>
      pick({
        name: b.name,
        source_url: b.sourceUrl,
        thumb_url: b.thumbUrl,
        analysis: b.analysis,
      }),
  },
};

export function specFor(kind: string): Spec | null {
  return (SPECS as Record<string, Spec>)[kind] ?? null;
}

export async function libList(sb: SupabaseClient, kind: LibraryKind, filter?: { projectId?: string }) {
  const spec = SPECS[kind];
  let q = sb.from(spec.table).select("*").order(spec.orderBy, { ascending: false }).limit(200);
  if (kind === "evidence" && filter?.projectId) {
    // 프로젝트 전용 + 공용(project_id null) 자료를 함께
    q = sb
      .from(spec.table)
      .select("*")
      .or(`project_id.eq.${filter.projectId},project_id.is.null`)
      .order(spec.orderBy, { ascending: false })
      .limit(200);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(spec.toApp);
}

export async function libCreate(sb: SupabaseClient, kind: LibraryKind, userId: string, body: any) {
  const spec = SPECS[kind];
  const { data, error } = await sb
    .from(spec.table)
    .insert({ ...spec.toDb(body), user_id: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return spec.toApp(data);
}

export async function libUpdate(sb: SupabaseClient, kind: LibraryKind, id: string, body: any) {
  const spec = SPECS[kind];
  const { data, error } = await sb.from(spec.table).update(spec.toDb(body)).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return spec.toApp(data);
}

export async function libDelete(sb: SupabaseClient, kind: LibraryKind, id: string) {
  const spec = SPECS[kind];
  const { error } = await sb.from(spec.table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
