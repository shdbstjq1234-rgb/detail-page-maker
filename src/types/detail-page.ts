/**
 * 상세페이지 연동 - 도메인 타입 정의
 *
 * 파이프라인 전 구간이 이 타입들을 공유한다.
 *
 *  ProductInput
 *   → ProductAnalysis        (productAnalyzer)
 *   → USPSet                 (uspExtractor)
 *   → PagePlan               (pagePlanner)
 *   → SectionCopy[]          (copyGenerator)
 *   → ImagePromptSet[]       (imagePromptGenerator)
 *   → GeneratedImage[][]     (imageGenerator)
 *   → SelectedImage[]        (imageSelector)
 *   → DetailPage             (sectionMapper)
 */

// ---------------------------------------------------------------------------
// 0. 입력
// ---------------------------------------------------------------------------

export interface ProductInput {
  /** 상품명 */
  name: string;
  /** 카테고리 (예: "뷰티/스킨케어", "주방용품", "반려동물") */
  category?: string;
  /** 가격 (원) */
  price?: number;
  /** 자유 형식 상품 설명 / 셀러가 제공한 원문 */
  description?: string;
  /** 핵심 성분 / 소재 / 스펙 목록 */
  specs?: string[];
  /** 셀러가 강조하고 싶은 포인트 (선택) */
  sellingPoints?: string[];
  /** 참고 이미지 URL (상품컷, 누끼, 패키지 등) */
  images?: ProductImageRef[];
  /** 경쟁/레퍼런스 상세페이지 URL (Playwright 분석 대상) */
  referenceUrls?: string[];
  /** 브랜드 톤 (예: "미니멀·프리미엄", "친근·유쾌") */
  brandTone?: string;

  // ── 편집기에서 추가로 받는 필드 (선택). 파이프라인은 description/specs 로 접어서 사용 ──
  /** 판매 채널 (쿠팡 / 네이버 스마트스토어 / 기타) */
  salesChannel?: string;
  /** 재질 / 소재 */
  material?: string;
  /** 크기 / 사이즈 */
  size?: string;
  /** 구성품 */
  components?: string;
  /** 타깃 고객 (모르면 AI 가 분석) */
  targetCustomer?: string;
  /** 추가 요청사항 (톤, 강조점, 금지사항 등) */
  extraRequest?: string;
  /** 핵심 특징 (주요 특징 입력란) */
  features?: string[];
}

export interface ProductImageRef {
  url: string;
  /** 이미지 종류 힌트 */
  kind?: "product" | "cutout" | "package" | "detail" | "lifestyle" | "other";
  /** 사람이 붙인 설명 */
  note?: string;
}

// ---------------------------------------------------------------------------
// 1. 상품 분석
// ---------------------------------------------------------------------------

export interface ProductAnalysis {
  /** 한 줄 요약 */
  oneLiner: string;
  /** 상품 카테고리 (정규화) */
  category: string;
  /** 핵심 기능 / 특징 */
  keyFeatures: string[];
  /** 소재 / 성분 / 스펙 정리 */
  specs: string[];
  /** 주요 타깃 고객 */
  targetCustomers: TargetCustomer[];
  /** 고객이 겪는 문제 / 불편 */
  customerProblems: string[];
  /** 구매 이유 (동기) */
  purchaseReasons: string[];
  /** 구매 장벽 (망설이는 이유) */
  purchaseBarriers: string[];
  /** 경쟁사 대비 차별점 */
  differentiators: string[];
  /** 가격 포지셔닝 코멘트 */
  pricePositioning?: string;
  /** 레퍼런스 분석 결과 (있을 때) */
  referenceInsights?: ReferenceInsight[];
}

export interface TargetCustomer {
  label: string;
  /** 상황 / 니즈 서술 */
  context: string;
  priority: "primary" | "secondary";
}

export interface ReferenceInsight {
  url: string;
  /** 이 레퍼런스에서 잘한 점 */
  strengths: string[];
  /** 아쉬운 점 / 우리가 이길 지점 */
  gaps: string[];
  /** 관찰된 섹션 순서 */
  sectionOrder?: string[];
}

// ---------------------------------------------------------------------------
// 2. USP
// ---------------------------------------------------------------------------

export interface USP {
  /** 짧은 헤드라인용 문구 (예: "12시간 지속 보습") */
  headline: string;
  /** 근거 / 설명 */
  rationale: string;
  /** 뒷받침 근거 (수치, 인증, 후기 등) */
  proofPoints: string[];
  /** 0~100. 판매 기여 예상 강도 */
  strength: number;
}

export interface USPSet {
  /** strength 내림차순 정렬 */
  ranked: USP[];
  /** 상세페이지 최상단에 쓸 단 하나의 메시지 */
  primary: USP;
}

// ---------------------------------------------------------------------------
// 3. 페이지 설계
// ---------------------------------------------------------------------------

export type SectionType =
  | "hero"
  | "usp"
  | "problem"
  | "solution"
  | "feature"
  | "featureDetail"
  | "lifestyle"
  | "comparison"
  | "detail"
  | "howToUse"
  | "productInfo"
  | "review"
  | "cta";

export interface PlannedSection {
  id: string;
  type: SectionType;
  /** 이 섹션이 전달할 단 하나의 메시지 */
  message: string;
  /** 배치 근거 (왜 이 위치인가) */
  reason: string;
  /** 이 섹션에 필요한 이미지 역할 */
  imageRoles: ImageRole[];
}

export interface PagePlan {
  /** 최종 섹션 순서 */
  sections: PlannedSection[];
  /** 전체 설계 의도 요약 */
  strategy: string;
}

export type ImageRole =
  | "heroMain"
  | "productCutout"
  | "usageScene"
  | "detailCloseup"
  | "featureExplainer"
  | "beforeAfter"
  | "comparison"
  | "lifestyle"
  | "infographic"
  | "structure"
  | "ingredient"
  | "sizeReference";

// ---------------------------------------------------------------------------
// 4. 카피
// ---------------------------------------------------------------------------

export interface SectionCopy {
  sectionId: string;
  type: SectionType;
  /** 크고 짧은 헤드라인 */
  headline: string;
  /** 보조 문구 (선택) */
  subheadline?: string;
  /** 본문 불릿 (긴 문단 금지) */
  bullets?: string[];
  /** 강조 수치/뱃지 (예: [{value:"98%", label:"재구매 의사"}]) */
  stats?: CopyStat[];
  /** CTA 문구 (cta 섹션 등) */
  cta?: string;
  /** 비교표 데이터 (comparison 섹션) */
  comparison?: ComparisonTable;
  /** 사용법 스텝 (howToUse 섹션) */
  steps?: HowToStep[];
  /** 제품 정보 스펙 표 (productInfo 섹션) */
  infoRows?: InfoRow[];
  /** 자유 텍스트 (fallback) */
  body?: string;
}

export interface CopyStat {
  value: string;
  label: string;
}

export interface ComparisonTable {
  /** 열 이름. 보통 ["우리 제품", "일반 제품"] */
  columns: string[];
  rows: ComparisonRow[];
}

export interface ComparisonRow {
  criterion: string;
  /** columns 와 같은 길이 */
  values: (string | boolean)[];
}

export interface HowToStep {
  order: number;
  title: string;
  description: string;
}

export interface InfoRow {
  label: string;
  value: string;
}

// ---------------------------------------------------------------------------
// 5. 이미지 프롬프트
// ---------------------------------------------------------------------------

export interface ImagePrompt {
  role: ImageRole;
  /** 이미지 생성기에 넣을 최종 프롬프트 (영문 권장) */
  prompt: string;
  /** 네거티브 프롬프트 */
  negativePrompt?: string;
  /** 종횡비 */
  aspectRatio: "1:1" | "4:5" | "3:4" | "16:9" | "9:16";
  /** 이 이미지가 상세페이지에서 하는 역할 설명 (선택 기준) */
  intent: string;
  /** 참고로 넣을 입력 이미지 URL (image-to-image 용) */
  referenceImageUrl?: string;
}

export interface ImagePromptSet {
  sectionId: string;
  prompts: ImagePrompt[];
}

// ---------------------------------------------------------------------------
// 6. 이미지 생성 결과
// ---------------------------------------------------------------------------

export type ImageProviderName = "mock" | "nanobanana" | "higgsfield";

export interface GeneratedImage {
  id: string;
  sectionId: string;
  role: ImageRole;
  provider: ImageProviderName;
  url: string;
  width: number;
  height: number;
  /** 생성에 사용된 프롬프트 */
  prompt: string;
  seed?: number;
  /** 프로바이더 원본 응답 (디버깅용) */
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// 7. 이미지 선택
// ---------------------------------------------------------------------------

export interface SelectedImage {
  sectionId: string;
  role: ImageRole;
  chosen: GeneratedImage;
  /** 후보 전체 (선택 안 된 것 포함) */
  candidates: GeneratedImage[];
  /** 선택 이유 */
  reason: string;
  /** 0~100 신뢰도 */
  score: number;
}

// ---------------------------------------------------------------------------
// 8. 최종 상세페이지
// ---------------------------------------------------------------------------

export interface DetailImage {
  url: string;
  width: number;
  height: number;
  alt: string;
  role: ImageRole;
}

export interface DetailSectionData {
  id: string;
  type: SectionType;
  copy: SectionCopy;
  images: DetailImage[];
}

export interface DetailPage {
  product: ProductInput;
  analysis: ProductAnalysis;
  usp: USPSet;
  plan: PagePlan;
  sections: DetailSectionData[];
  meta: {
    generatedAt: string;
    llmModel: string;
    imageProvider: ImageProviderName;
  };
}

// ---------------------------------------------------------------------------
// 9. 파이프라인 진행 상황 (스트리밍/로그용)
// ---------------------------------------------------------------------------

export type PipelineStage =
  | "analyze"
  | "usp"
  | "plan"
  | "copy"
  | "imagePrompt"
  | "imageGenerate"
  | "imageSelect"
  | "assemble"
  | "done";

export interface PipelineEvent {
  stage: PipelineStage;
  status: "start" | "success" | "error";
  message: string;
  /** 해당 단계 산출물 (부분) */
  payload?: unknown;
  at: string;
}
