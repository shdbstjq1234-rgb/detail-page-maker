import Anthropic from "@anthropic-ai/sdk";
import type { LlmClient, LlmCompleteOptions } from "./client";

const DEFAULT_MODEL = "claude-opus-5";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];

function resolveEffort(): Effort {
  const raw = process.env.LLM_EFFORT?.trim().toLowerCase() as Effort | undefined;
  return raw && EFFORTS.includes(raw) ? raw : "medium";
}

/**
 * Claude 기반 LLM 클라이언트.
 * 상품 분석 / 카피 / 이미지 프롬프트 생성에 사용한다.
 */
export class AnthropicLlmClient implements LlmClient {
  readonly name = "anthropic";
  readonly model: string;
  private client: Anthropic;
  private effort: Effort;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.model = process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;
    this.effort = resolveEffort();
  }

  async complete(options: LlmCompleteOptions): Promise<string> {
    const { system, messages, expectJson, maxTokens = 8000, images } = options;

    const systemPrompt = expectJson
      ? `${system}\n\n반드시 유효한 JSON 하나만 출력한다. 코드펜스(\`\`\`)나 설명 문장을 붙이지 않는다.`
      : system;

    const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 이미지 첨부: 마지막 user 메시지를 멀티모달 블록으로 교체
    if (images?.length) {
      const lastUserIdx = apiMessages.map((m) => m.role).lastIndexOf("user");
      if (lastUserIdx !== -1) {
        const text = apiMessages[lastUserIdx].content as string;
        apiMessages[lastUserIdx] = {
          role: "user",
          content: [
            ...images.map((src) => toImageBlock(src)),
            { type: "text" as const, text },
          ],
        };
      }
    }

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      output_config: { effort: this.effort },
      messages: apiMessages,
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!text) {
      throw new Error(`Claude 응답이 비어 있습니다 (label=${options.label ?? "?"})`);
    }
    return text;
  }
}

/** data URL 또는 http URL → Anthropic image content block */
function toImageBlock(src: string): Anthropic.ImageBlockParam {
  const m = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(src);
  if (m) {
    return {
      type: "image",
      source: { type: "base64", media_type: m[1] as Anthropic.Base64ImageSource["media_type"], data: m[2] },
    };
  }
  return { type: "image", source: { type: "url", url: src } };
}
