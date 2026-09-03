"use client";

/**
 * 프로젝트 저장소 (클라이언트).
 *  - 로컬 모드: localStorage
 *  - 클라우드 모드: /api/projects* (Supabase, RLS)
 * 두 경우 모두 같은 인터페이스.
 */
import { isCloudMode } from "./supabase/config";
import { deriveCover, newProject, type Project } from "./project";
import type { EditorDoc } from "./editor-doc";

const LS_KEY = "dpm:projects";

// ---- 로컬 (localStorage) ---------------------------------------------------

function lsAll(): Project[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? (JSON.parse(raw) as Project[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function lsWrite(list: Project[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

// ---- 통합 API ------------------------------------------------------------

export async function listProjects(): Promise<Project[]> {
  if (!isCloudMode) {
    return lsAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const res = await fetch("/api/projects", { cache: "no-store" });
  if (!res.ok) throw new Error("프로젝트 목록을 불러오지 못했습니다.");
  return (await res.json()).projects as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isCloudMode) return lsAll().find((p) => p.id === id) ?? null;
  const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("프로젝트를 불러오지 못했습니다.");
  return (await res.json()).project as Project;
}

export async function createProject(name?: string): Promise<Project> {
  const p = newProject(name);
  if (!isCloudMode) {
    lsWrite([p, ...lsAll()]);
    return p;
  }
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: p.name, doc: p.doc }),
  });
  if (!res.ok) throw new Error("프로젝트를 만들지 못했습니다.");
  return (await res.json()).project as Project;
}

export async function saveProjectDoc(id: string, doc: EditorDoc): Promise<Project> {
  const name = doc.product.name?.trim() || "제목 없음";
  const coverImage = deriveCover(doc);
  if (!isCloudMode) {
    const list = lsAll();
    const idx = list.findIndex((p) => p.id === id);
    const now = new Date().toISOString();
    const base = idx === -1 ? newProject(name) : list[idx];
    const updated: Project = { ...base, id, name, coverImage, doc, updatedAt: now };
    if (idx === -1) list.unshift(updated);
    else list[idx] = updated;
    lsWrite(list);
    return updated;
  }
  const payload = JSON.stringify({ name, coverImage, doc });
  // Vercel 서버리스 본문 한도(4.5MB) 대비 — data URL 이미지가 섞이면 초과할 수 있음
  if (payload.length > 3_800_000) {
    throw new Error(
      "저장할 데이터가 너무 큽니다. 이미지가 원본(data URL)으로 들어간 것 같아요. " +
        "이미지 스튜디오에서 다시 생성하면 저장용 URL로 바뀝니다.",
    );
  }
  const res = await fetch(`/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  if (!res.ok) {
    const detail = res.status === 413 ? " (용량 초과)" : ` (${res.status})`;
    throw new Error(`자동 저장에 실패했습니다${detail}.`);
  }
  return (await res.json()).project as Project;
}

export async function deleteProject(id: string): Promise<void> {
  if (!isCloudMode) {
    lsWrite(lsAll().filter((p) => p.id !== id));
    return;
  }
  const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("삭제에 실패했습니다.");
}

export async function duplicateProject(id: string): Promise<Project> {
  if (!isCloudMode) {
    const src = lsAll().find((p) => p.id === id);
    if (!src) throw new Error("원본을 찾을 수 없습니다.");
    const copy = newProject(`${src.name} 복사본`);
    copy.doc = JSON.parse(JSON.stringify(src.doc)) as EditorDoc;
    copy.coverImage = src.coverImage;
    lsWrite([copy, ...lsAll()]);
    return copy;
  }
  const res = await fetch(`/api/projects/${id}/duplicate`, { method: "POST" });
  if (!res.ok) throw new Error("복제에 실패했습니다.");
  return (await res.json()).project as Project;
}
