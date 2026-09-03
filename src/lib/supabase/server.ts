import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  AUTH_SECRET,
  OWNER_USER_ID,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  authMode,
  isCloudMode,
  isEmailAllowed,
} from "./config";
import { AUTH_COOKIE, computeAuthToken, safeEqual } from "@/lib/auth-cookie";

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

  // 비밀번호 게이트 모드: 쿠키만 검증하고 고정 소유자로 취급
  if (authMode === "password") {
    const jar = await cookies();
    const token = jar.get(AUTH_COOKIE)?.value ?? "";
    const expected = await computeAuthToken(AUTH_SECRET);
    if (token && safeEqual(token, expected)) {
      return { local: false as const, id: OWNER_USER_ID, email: "owner" };
    }
    return null;
  }

  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isEmailAllowed(user.email)) return null;
  return { local: false as const, id: user.id, email: user.email ?? null };
}
