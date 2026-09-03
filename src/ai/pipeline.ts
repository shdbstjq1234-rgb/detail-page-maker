import { getLlmClient } from "./llm/client";
import { getImageProvider } from "@/image-providers";
import { analyzeProduct } from "./productAnalyzer";
import { extractUSP } from "./uspExtractor";
import { planPage } from "./pagePlanner";
import { generateAllCopy } from "./copyGenerator";
import { generateAllImagePrompts } from "./imagePromptGenerator";
import { generateImages } from "./imageGenerator";
import { selectAllImages } from "./imageSelector";
import { assembleDetailPage } from "./sectionMapper";
import type {
  ProductInput,
  DetailPage,
  PipelineEvent,
  ReferenceInsight,
} from "@/types/detail-page";

export type PipelineListener = (event: PipelineEvent) => void;

export interface RunPipelineOptions {
  onEvent?: PipelineListener;
  /** 레퍼런스 URL 분석기 (예: Playwright 기반). 없으면 건너뜀. */
  analyzeReferences?: (urls: string[]) => Promise<ReferenceInsight[]>;
  /** 이미지 프롬프트 role 당 후보 프롬프트 수 */
  promptsPerRole?: number;
  /** 프롬프트당 생성 이미지 수 */
  candidatesPerPrompt?: number;
  /** 이미지 단계를 건너뛴다 (카피/설계만 빠르게 보고 싶을 때) */
  skipImages?: boolean;
}

/**
 * 상품 입력 → 최종 상세페이지 전체 파이프라인.
 *
 *  analyze → usp → plan → copy → imagePrompt → imageGenerate → imageSelect → assemble
 */
export async function runPipeline(
  input: ProductInput,
  options: RunPipelineOptions = {},
): Promise<DetailPage> {
  const { onEvent } = options;
  const emit = (e: Omit<PipelineEvent, "at">) =>
    onEvent?.({ ...e, at: new Date().toISOString() });

  const llm = await getLlmClient();
  const imageProvider = await getImageProvider();

  // 0. (선택) 레퍼런스 분석
  let referenceInsights: ReferenceInsight[] = [];
  if (options.analyzeReferences && input.referenceUrls?.length) {
    emit({ stage: "analyze", status: "start", message: "레퍼런스 상세페이지 분석 중" });
    try {
      referenceInsights = await options.analyzeReferences(input.referenceUrls);
      emit({ stage: "analyze", status: "success", message: `레퍼런스 ${referenceInsights.length}건 분석`, payload: referenceInsights });
    } catch (err) {
      emit({ stage: "analyze", status: "error", message: `레퍼런스 분석 실패: ${msg(err)}` });
    }
  }

  // 1. 상품 분석
  emit({ stage: "analyze", status: "start", message: "상품 분석 중" });
  const analysis = await analyzeProduct(input, { llm, referenceInsights });
  emit({ stage: "analyze", status: "success", message: analysis.oneLiner, payload: analysis });

  // 2. USP 추출
  emit({ stage: "usp", status: "start", message: "USP 추출 중" });
  const usp = await extractUSP(input, analysis, { llm });
  emit({ stage: "usp", status: "success", message: `최강 USP: ${usp.primary.headline}`, payload: usp });

  // 3. 섹션 설계
  emit({ stage: "plan", status: "start", message: "상세페이지 섹션 설계 중" });
  const plan = await planPage(input, analysis, usp, { llm });
  emit({ stage: "plan", status: "success", message: `${plan.sections.length}개 섹션 설계`, payload: plan });

  // 4. 섹션별 카피
  emit({ stage: "copy", status: "start", message: "섹션별 카피 생성 중" });
  const copies = await generateAllCopy({ input, analysis, usp, plan }, { llm });
  emit({ stage: "copy", status: "success", message: `카피 ${copies.length}개 생성`, payload: copies });

  // 5. 섹션별 이미지 프롬프트
  emit({ stage: "imagePrompt", status: "start", message: "이미지 생성 프롬프트 작성 중" });
  const promptSets = await generateAllImagePrompts(plan.sections, copies, { input, analysis }, {
    llm,
    perRole: options.promptsPerRole ?? 1,
  });
  const promptCount = promptSets.reduce((n, s) => n + s.prompts.length, 0);
  emit({ stage: "imagePrompt", status: "success", message: `프롬프트 ${promptCount}개 작성`, payload: promptSets });

  // 6~7. 이미지 생성 + 선택
  let selected: Awaited<ReturnType<typeof selectAllImages>> = [];
  if (!options.skipImages) {
    emit({ stage: "imageGenerate", status: "start", message: `${imageProvider.name} 로 이미지 생성 중` });
    const candidates = await generateImages(promptSets, {
      provider: imageProvider,
      candidatesPerPrompt: options.candidatesPerPrompt,
    });
    const total = candidates.reduce((n, c) => n + c.length, 0);
    emit({ stage: "imageGenerate", status: "success", message: `후보 이미지 ${total}장 생성`, payload: candidates });

    emit({ stage: "imageSelect", status: "start", message: "섹션별 최적 이미지 선택 중" });
    selected = await selectAllImages(plan.sections, candidates, { input }, { llm });
    emit({ stage: "imageSelect", status: "success", message: `이미지 ${selected.length}장 배치 확정`, payload: selected });
  } else {
    emit({ stage: "imageGenerate", status: "success", message: "이미지 단계 건너뜀(skipImages)" });
  }

  // 8. 조립
  emit({ stage: "assemble", status: "start", message: "최종 상세페이지 조립 중" });
  const page = assembleDetailPage({
    input,
    analysis,
    usp,
    plan,
    copies,
    selected,
    llmModel: llm.model,
    imageProvider: imageProvider.name,
  });
  emit({ stage: "assemble", status: "success", message: "상세페이지 데이터 완성", payload: page.meta });
  emit({ stage: "done", status: "success", message: "완료" });

  return page;
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
