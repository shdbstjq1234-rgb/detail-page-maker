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
