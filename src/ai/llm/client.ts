/**
 * LLM 클라이언트 추상화.
 *
 * 파이프라인의 모든 AI 단계는 이 인터페이스에만 의존한다.
 * - ANTHROPIC_API_KEY 가 있으면 Claude 사용
 * - 없으면 결정적(deterministic) 목업으로 자동 폴백 → 키 없이도 전체 파이프라인 시연 가능
 */

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmCompleteOptions {
  system: string;
  messages: LlmMessage[];
  /** 응답을 JSON 으로 강제 (system 프롬프트에 지시 + 파싱 유틸로 보정) */
  expectJson?: boolean;
  maxTokens?: number;
  /** 이 호출을 식별하기 위한 라벨 (로그용) */
  label?: string;
  /** 마지막 user 메시지에 첨부할 이미지 (data URL 또는 http URL). vision 지원 클라이언트만 사용. */
  images?: string[];
}

export interface LlmClient {
  readonly name: string;
  readonly model: string;
  complete(options: LlmCompleteOptions): Promise<string>;
}

let cached: LlmClient | null = null;

/** 환경에 맞는 LLM 클라이언트를 하나 만들어 캐시한다. */
export async function getLlmClient(): Promise<LlmClient> {
  if (cached) return cached;

  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (key) {
    const { AnthropicLlmClient } = await import("./anthropic");
    cached = new AnthropicLlmClient(key);
  } else {
    const { MockLlmClient } = await import("./mock");
    cached = new MockLlmClient();
  }
  return cached;
}

/** 테스트에서 강제로 교체할 때 사용 */
export function setLlmClient(client: LlmClient | null): void {
  cached = client;
}
