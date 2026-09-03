import type { LlmClient } from "./llm/client";
import { getLlmClient } from "./llm/client";
import { extractJson } from "@/lib/json";
import type { ReferenceInsight } from "@/types/detail-page";

/**
 * 경쟁/레퍼런스 상세페이지 URL 분석.
 *
 * 기본 구현: fetch 로 HTML 을 받아 텍스트만 추출 → LLM 으로 인사이트 정리.
 * 더 정밀한 분석(스크린샷, DOM 구조, 스크롤 캡처)이 필요하면
 * Playwright MCP 로 수집한 결과를 이 함수 대신 runPipeline({ analyzeReferences }) 로 주입한다.
 */
export async function analyzeReferenceUrls(
  urls: string[],
  opts: { llm?: LlmClient } = {},
): Promise<ReferenceInsight[]> {
  const llm = opts.llm ?? (await getLlmClient());
  const out: ReferenceInsight[] = [];

  for (const url of urls.slice(0, 5)) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; detail-page-engine/0.1)" },
      });
      const html = await res.text();
      const text = htmlToText(html).slice(0, 12000);

      const raw = await llm.complete({
        system:
          "너는 이커머스 상세페이지 분석가다. 주어진 페이지 텍스트에서 상세페이지 구성과 카피 전략을 분석한다. JSON 으로만 답한다.",
        messages: [
          {
            role: "user",
            content: `URL: ${url}\n\n[페이지 텍스트]\n${text}\n\n[출력 JSON]\n{ "strengths": string[], "gaps": string[], "sectionOrder": string[] }`,
          },
        ],
        expectJson: true,
        maxTokens: 1500,
        label: `referenceAnalyzer:${url}`,
      });

      const parsed = extractJson<Partial<ReferenceInsight>>(raw);
      out.push({
        url,
        strengths: parsed.strengths ?? [],
        gaps: parsed.gaps ?? [],
        sectionOrder: parsed.sectionOrder ?? [],
      });
    } catch (err) {
      console.error(`[referenceAnalyzer] ${url} 실패:`, err);
      out.push({ url, strengths: [], gaps: [`분석 실패: ${err instanceof Error ? err.message : err}`] });
    }
  }

  return out;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
