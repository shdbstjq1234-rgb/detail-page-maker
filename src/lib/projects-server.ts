import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project } from "./project";
import type { EditorDoc } from "./editor-doc";

/* eslint-disable @typescript-eslint/no-explicit-any */

function rowToProject(r: any): Project {
  return {
    id: r.id,
    name: r.name ?? "제목 없음",
    coverImage: r.cover_image ?? null,
    doc: (r.doc ?? {}) as EditorDoc,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function dbListProjects(sb: SupabaseClient): Promise<Project[]> {
  const { data, error } = await sb
    .from("projects")
    .select("id,name,cover_image,doc,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToProject);
}

export async function dbGetProject(sb: SupabaseClient, id: string): Promise<Project | null> {
  const { data, error } = await sb
    .from("projects")
    .select("id,name,cover_image,doc,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToProject(data) : null;
}

export async function dbCreateProject(
  sb: SupabaseClient,
  userId: string,
  input: { name?: string; doc: EditorDoc; coverImage?: string | null },
): Promise<Project> {
  const { data, error } = await sb
    .from("projects")
    .insert({ user_id: userId, name: input.name ?? "제목 없음", doc: input.doc, cover_image: input.coverImage ?? null })
    .select("id,name,cover_image,doc,created_at,updated_at")
    .single();
  if (error) throw new Error(error.message);
  return rowToProject(data);
}

export async function dbUpdateProject(
  sb: SupabaseClient,
  id: string,
  patch: { name?: string; doc?: EditorDoc; coverImage?: string | null },
): Promise<Project> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.doc !== undefined) row.doc = patch.doc;
  if (patch.coverImage !== undefined) row.cover_image = patch.coverImage;
  const { data, error } = await sb
    .from("projects")
    .update(row)
    .eq("id", id)
    .select("id,name,cover_image,doc,created_at,updated_at")
    .single();
  if (error) throw new Error(error.message);
  return rowToProject(data);
}

export async function dbDeleteProject(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
