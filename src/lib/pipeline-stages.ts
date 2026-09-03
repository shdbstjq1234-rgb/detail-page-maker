/** 파이프라인 단계 → 사용자용 한국어 문구 + 진행률 계산 */
export const STAGE_TEXT: Record<string, string> = {
  analyze: "상품을 분석하고 있습니다",
  usp: "핵심 판매 포인트를 찾고 있습니다",
  plan: "상세페이지 구성을 만들고 있습니다",
  copy: "판매 카피를 작성하고 있습니다",
  imagePrompt: "필요한 이미지를 정리하고 있습니다",
  imageGenerate: "이미지를 만들고 있습니다",
  imageSelect: "이미지를 상세페이지에 배치하고 있습니다",
  assemble: "마무리하고 있습니다",
  done: "완료되었습니다",
};

export const STAGE_ORDER = [
  "analyze",
  "usp",
  "plan",
  "copy",
  "imagePrompt",
  "imageGenerate",
  "imageSelect",
  "assemble",
  "done",
];

export function stageProgress(lastStage: string | null): number {
  const i = lastStage ? STAGE_ORDER.indexOf(lastStage) : -1;
  return i >= 0 ? Math.round(((i + 1) / STAGE_ORDER.length) * 100) : 0;
}
