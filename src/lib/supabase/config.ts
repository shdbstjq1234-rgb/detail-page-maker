/**
 * Supabase 설정 여부 / 허용 이메일.
 *
 * NEXT_PUBLIC_SUPABASE_URL 이 없으면 앱은 "로컬 모드"로 동작한다:
 *  - 로그인 없이 바로 사용
 *  - 프로젝트/이미지는 브라우저 localStorage 에 저장
 * 값을 채우면 자동으로 "클라우드 모드"(로그인 + Supabase DB/Storage)로 전환된다.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

/** 클라우드 모드 여부 (브라우저/서버 공통으로 판정 가능) */
export const isCloudMode = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** 로그인 허용 이메일 (쉼표로 여러 개). 서버에서만 사용. */
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAIL || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = allowedEmails();
  // ALLOWED_EMAIL 미설정 시: 아무도 통과시키지 않는다(배포 사고 방지).
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}

export const STORAGE_BUCKET = "project-media";

/**
 * 인증 모드.
 *  - "local"    : Supabase 미설정. 로그인 없음, localStorage 저장.
 *  - "password" : Supabase 설정 + APP_PASSWORD 설정. 공유 비밀번호 1개로 접근. (Supabase Auth 불필요)
 *  - "supabase" : Supabase 설정 + APP_PASSWORD 미설정. Supabase Auth(구글/매직링크) + ALLOWED_EMAIL 화이트리스트.
 */
export const APP_PASSWORD = process.env.APP_PASSWORD?.trim() || "";
export const AUTH_SECRET = process.env.APP_SESSION_SECRET?.trim() || APP_PASSWORD || "dpm-dev-secret";
/** 비밀번호 모드에서 projects.user_id 로 저장할 고정 소유자 id */
export const OWNER_USER_ID =
  process.env.OWNER_USER_ID?.trim() || "00000000-0000-4000-8000-000000000001";

export type AuthMode = "local" | "password" | "supabase";
export const authMode: AuthMode = !isCloudMode ? "local" : APP_PASSWORD ? "password" : "supabase";
export const isPasswordGate = authMode === "password";
