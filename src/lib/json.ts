/**
 * LLM 이 돌려준 텍스트에서 JSON 을 안전하게 추출한다.
 * ```json ... ``` 코드펜스, 앞뒤 잡담이 섞여 있어도 첫 번째 완전한 JSON 값을 파싱한다.
 */
export function extractJson<T>(text: string): T {
  const trimmed = text.trim();

  // 1) 코드펜스 우선
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;

  // 2) 그대로 파싱 시도
  try {
    return JSON.parse(candidate) as T;
  } catch {
    // continue
  }

  // 3) 첫 { 또는 [ 부터 짝이 맞는 지점까지 잘라서 파싱
  const start = candidate.search(/[[{]/);
  if (start === -1) {
    throw new Error(`JSON 을 찾을 수 없습니다:\n${text.slice(0, 500)}`);
  }
  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        const slice = candidate.slice(start, i + 1);
        return JSON.parse(slice) as T;
      }
    }
  }
  throw new Error(`완결되지 않은 JSON:\n${text.slice(0, 500)}`);
}

/** 배열 길이를 맞춘다. 부족하면 filler 로 채우고, 넘치면 자른다. */
export function padArray<T>(arr: T[], length: number, filler: (i: number) => T): T[] {
  const out = arr.slice(0, length);
  while (out.length < length) out.push(filler(out.length));
  return out;
}

/** 0~100 범위로 clamp */
export function clampScore(n: unknown, fallback = 50): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.max(0, Math.min(100, Math.round(v)));
}
