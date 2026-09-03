"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isCloudMode } from "@/lib/supabase/config";

function LoginInner() {
  const params = useSearchParams();
  const from = params.get("from") || "/";
  const errParam = params.get("error");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(
    errParam === "not_allowed"
      ? "허용되지 않은 계정입니다. 관리자 이메일로 로그인하세요."
      : errParam
        ? "로그인에 실패했습니다. 다시 시도해 주세요."
        : null,
  );
  const [busy, setBusy] = useState(false);

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback?from=${encodeURIComponent(from)}` : undefined;

  async function google() {
    const sb = getBrowserSupabase();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setMsg(error.message);
      setBusy(false);
    }
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    const sb = getBrowserSupabase();
    if (!sb || !email) return;
    setBusy(true);
    setMsg(null);
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    if (error) setMsg(error.message);
    else setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F5] px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-8 text-center">
          <div className="text-[13px] font-bold tracking-[0.14em] text-neutral-400">AI DETAIL PAGE MAKER</div>
          <h1 className="mt-2 text-[20px] font-bold text-neutral-900">로그인</h1>
          <p className="mt-1 text-[13px] text-neutral-500">허용된 계정만 접근할 수 있는 개인용 도구입니다.</p>
        </div>

        {!isCloudMode ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 text-center text-[13px] text-neutral-600">
            현재 <b>로컬 모드</b>로 실행 중입니다. 로그인 없이 사용하세요.
            <a href="/" className="mt-4 block rounded-lg bg-neutral-900 py-2.5 font-semibold text-white">
              바로 시작하기
            </a>
          </div>
        ) : sent ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 text-center text-[13px] text-neutral-700">
            <b>{email}</b> 로 로그인 링크를 보냈습니다.
            <br />
            메일함을 확인해 주세요.
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
            <button
              onClick={google}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white py-2.5 text-[13px] font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
            >
              <span className="text-[15px]">G</span> Google 계정으로 계속
            </button>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200" /> 또는 <span className="h-px flex-1 bg-neutral-200" />
            </div>
            <form onSubmit={magicLink} className="space-y-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[13px] outline-none focus:border-neutral-900"
              />
              <button
                disabled={busy}
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-[13px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                로그인 링크 받기
              </button>
            </form>
          </div>
        )}

        {msg && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-[12px] text-red-600">
            {msg}
          </p>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F7F7F5]" />}>
      <LoginInner />
    </Suspense>
  );
}
