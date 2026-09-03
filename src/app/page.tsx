"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Trash2, Pencil, ImageOff, LogOut, Loader2 } from "lucide-react";
import { isCloudMode } from "@/lib/supabase/config";
import {
  createProject,
  deleteProject,
  duplicateProject,
  listProjects,
} from "@/lib/store";
import type { Project } from "@/lib/project";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setProjects(await listProjects());
    } catch (e) {
      setError((e as Error).message);
      setProjects([]);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function onNew() {
    setBusy("new");
    setError(null);
    try {
      const p = await createProject();
      router.push(`/editor/${p.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function onDuplicate(id: string) {
    setBusy(id);
    try {
      await duplicateProject(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("이 프로젝트를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setBusy(id);
    try {
      await deleteProject(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1080px] px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-[12px] font-bold tracking-[0.16em] text-neutral-400">AI DETAIL PAGE MAKER</div>
          <h1 className="mt-1 text-[22px] font-bold text-neutral-900">내 상세페이지</h1>
        </div>
        <div className="flex items-center gap-2">
          {isCloudMode && (
            <form action="/auth/signout" method="post">
              <button className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-600 hover:bg-neutral-50">
                <LogOut size={13} /> 로그아웃
              </button>
            </form>
          )}
          <button
            onClick={onNew}
            disabled={busy === "new"}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy === "new" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            새 상세페이지 만들기
          </button>
        </div>
      </header>

      {!isCloudMode && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
          로컬 모드로 실행 중입니다. 프로젝트가 이 브라우저에만 저장됩니다. 배포하려면 Supabase 환경변수를 설정하세요.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>
      )}

      {projects === null ? (
        <div className="mt-16 flex justify-center text-neutral-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-16 rounded-2xl border border-dashed border-neutral-300 bg-white/60 py-20 text-center">
          <p className="text-[14px] font-semibold text-neutral-700">아직 만든 상세페이지가 없어요</p>
          <p className="mt-1 text-[12px] text-neutral-500">위의 “새 상세페이지 만들기”로 시작하세요.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-shadow hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.15)]"
            >
              <button
                onClick={() => router.push(`/editor/${p.id}`)}
                className="block aspect-[4/3] w-full overflow-hidden bg-neutral-100"
              >
                {p.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-neutral-300">
                    <ImageOff size={28} />
                  </span>
                )}
              </button>
              <div className="p-4">
                <div className="truncate text-[14px] font-semibold text-neutral-900">
                  {p.name || "제목 없음"}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-400">
                  {new Date(p.updatedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}
                </div>
                <div className="mt-3 flex gap-1.5">
                  <button
                    onClick={() => router.push(`/editor/${p.id}`)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-neutral-900 py-1.5 text-[11px] font-semibold text-white hover:bg-neutral-800"
                  >
                    <Pencil size={12} /> 계속 편집
                  </button>
                  <button
                    onClick={() => onDuplicate(p.id)}
                    disabled={busy === p.id}
                    className="flex items-center justify-center rounded-lg border border-neutral-200 px-2 py-1.5 text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
                    title="복제"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
                    disabled={busy === p.id}
                    className="flex items-center justify-center rounded-lg border border-neutral-200 px-2 py-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                    title="삭제"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
