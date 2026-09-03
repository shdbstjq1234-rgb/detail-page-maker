import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isCloudMode, isEmailAllowed } from "./config";

/** 서버(Route Handler / Server Component)용 Supabase 클라이언트. 로컬 모드면 null. */
export async function getServerSupabase() {
  if (!isCloudMode) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* Server Component 에서 호출된 경우 무시 (미들웨어가 갱신) */
        }
      },
    },
  });
}

/**
 * 현재 요청의 로그인 사용자를 반환한다.
 * - 로컬 모드: { local: true } (항상 허용)
 * - 클라우드 모드: 허용 이메일이면 user, 아니면 null
 */
export async function getAuthedUser() {
  if (!isCloudMode) return { local: true as const, id: "local", email: null };
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isEmailAllowed(user.email)) return null;
  return { local: false as const, id: user.id, email: user.email ?? null };
}
