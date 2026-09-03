/**
 * 비밀번호 게이트(APP_PASSWORD) 모드용 세션 쿠키.
 * Edge(middleware) 와 Node(route handler) 양쪽에서 동작하도록 Web Crypto 만 사용한다.
 */

export const AUTH_COOKIE = "dpm_auth";

/** 비밀번호 원문을 노출하지 않는 결정적 토큰 (secret 기반 SHA-256) */
export async function computeAuthToken(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`dpm-owner-v1:${secret}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 비밀번호 원문의 해시 (salt 포함). 코드/환경변수에 원문을 두지 않기 위함. */
export async function hashPassword(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`dpm-pw-v1:${pw}`));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 상수시간 비교 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
