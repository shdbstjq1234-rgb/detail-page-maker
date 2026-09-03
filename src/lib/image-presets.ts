/**
 * AI 이미지 스튜디오 프리셋 카탈로그 (spec #1, #6, #7, #8).
 * 상품 카테고리에 따라 필요한 세트를 다르게 추천한다.
 */
import type { ImageRole } from "@/types/detail-page";
import type { SectionType } from "@/types/detail-page";

export type AspectRatio = "1:1" | "4:5" | "3:4" | "16:9" | "9:16";
export type PresetGroup = "기본" | "모델" | "연출" | "디테일" | "리뷰";

export interface ImagePreset {
  key: string;
  label: string;
  group: PresetGroup;
  role: ImageRole;
  ratio: AspectRatio;
  /** 이 이미지가 상세페이지에서 담당하는 역할 */
  purpose: string;
  /** 프롬프트 scene/연출 조각 (영문) */
  scene: string;
  /** 이 프리셋이 잘 맞는 섹션 타입 */
  sections: SectionType[];
  /** 카테고리 키워드 힌트. 비어 있으면 대부분 상품에 관련. */
  categories?: RegExp;
  /** 기본 추천 ON 여부 */
  defaultOn?: boolean;
}

export const IMAGE_PRESETS: ImagePreset[] = [
  // ── 기본 ──
  { key: "heroMain", label: "메인 HERO", group: "기본", role: "heroMain", ratio: "4:5",
    purpose: "상세페이지 첫 화면에서 핵심 USP를 표현", scene: "premium commercial product hero shot, seamless studio background, dramatic soft key light, hero framing",
    sections: ["hero"], defaultOn: true },
  { key: "floating", label: "플로팅 제품컷", group: "연출", role: "productCutout", ratio: "1:1",
    purpose: "제품을 공중에 띄워 형태와 디테일을 강조", scene: "3D floating product levitation, subtle shadow beneath, clean gradient backdrop, weightless feel",
    sections: ["hero", "usp", "feature"] },
  { key: "splash", label: "공중부양 / Splash", group: "연출", role: "featureExplainer", ratio: "1:1",
    purpose: "역동적인 스플래시로 제품을 임팩트 있게", scene: "product with dynamic liquid or powder splash frozen in motion, high-speed capture, dramatic",
    sections: ["usp", "feature"], categories: /뷰티|스킨|음료|세정|샴푸|워터|가습/i },
  { key: "aiScene", label: "AI 연출컷", group: "연출", role: "featureExplainer", ratio: "4:5",
    purpose: "감성적인 연출로 제품의 분위기와 스토리 표현", scene: "art-directed editorial scene, cinematic composition, moody color grading, storytelling atmosphere",
    sections: ["solution", "lifestyle"], defaultOn: true },
  { key: "lifestyle", label: "라이프스타일", group: "기본", role: "lifestyle", ratio: "4:5",
    purpose: "실제 생활 환경에서 제품 사용 장면", scene: "authentic lifestyle scene, real home or outdoor environment, natural window light, candid moment",
    sections: ["lifestyle", "solution", "howToUse"], defaultOn: true },
  { key: "featureExplain", label: "기능 설명", group: "기본", role: "featureExplainer", ratio: "4:5",
    purpose: "핵심 기능 하나를 명확하게 시각화", scene: "feature-focused shot with clear visual emphasis on one function, clean supporting graphic space",
    sections: ["feature", "featureDetail"], defaultOn: true },
  { key: "macro", label: "소재 Macro", group: "디테일", role: "detailCloseup", ratio: "3:4",
    purpose: "소재·질감을 극단적 클로즈업으로", scene: "extreme macro close-up of material and texture, shallow depth of field, tactile detail",
    sections: ["featureDetail", "detail"], defaultOn: true },
  { key: "detail", label: "Detail", group: "디테일", role: "detailCloseup", ratio: "1:1",
    purpose: "마감·구조 디테일을 보여주는 컷", scene: "detail shot of finish, seams, ports and craftsmanship, crisp studio light",
    sections: ["detail", "featureDetail"], defaultOn: true },
  { key: "comparison", label: "Comparison", group: "연출", role: "comparison", ratio: "16:9",
    purpose: "일반 제품과의 차이를 직관적으로", scene: "side-by-side comparison composition, ours vs ordinary, clear visual contrast",
    sections: ["comparison"], categories: /./ },
  { key: "usage", label: "Usage", group: "기본", role: "usageScene", ratio: "16:9",
    purpose: "실제 사용하는 모습 / 사용 방법", scene: "step-by-step usage scene, hands interacting with the product naturally",
    sections: ["howToUse", "solution"] },
  { key: "water", label: "Water / Liquid", group: "연출", role: "featureExplainer", ratio: "1:1",
    purpose: "물·액체 연출로 방수·보습 등 표현", scene: "water surface and droplets interacting with the product, liquid landscape, glossy reflection",
    sections: ["feature", "usp"], categories: /방수|발수|워터|가습|음료|세정|스킨|보습|주방|텀블러|보온/i },
  { key: "structure", label: "제품 구조", group: "디테일", role: "structure", ratio: "4:5",
    purpose: "제품 구조·부품 구성을 분해도처럼", scene: "clean exploded-view / structure illustration of the product parts, labeled space",
    sections: ["featureDetail", "productInfo"], categories: /가전|의자|텐트|프레임|조립|가구|배터리|충전/i },
  { key: "beforeAfter", label: "Before / After", group: "연출", role: "beforeAfter", ratio: "16:9",
    purpose: "사용 전후 변화를 대비로", scene: "before and after split composition showing the change this product delivers",
    sections: ["problem", "solution"], categories: /뷰티|스킨|청소|세정|정리|수납|다이어트/i },
  { key: "packaging", label: "Packaging", group: "디테일", role: "productCutout", ratio: "1:1",
    purpose: "패키지·구성품 컷", scene: "clean packaging and included components laid out, catalog style on white",
    sections: ["productInfo"] },
  { key: "flatlay", label: "Flat Lay", group: "디테일", role: "productCutout", ratio: "1:1",
    purpose: "제품 전체를 평면 배치로 한눈에", scene: "top-down flat lay of the full product and accessories, organized, soft even light",
    sections: ["productInfo", "detail"] },

  // ── 모델 (사람 등장) ──
  { key: "modelFull", label: "전신 모델", group: "모델", role: "lifestyle", ratio: "9:16",
    purpose: "전체 착용감 / 핏 / 실루엣", scene: "full-body shot of a Korean model wearing/using the product, natural pose, advertising quality",
    sections: ["lifestyle", "hero"], categories: /패션|의류|옷|셔츠|니트|자켓|바지|치마|원피스|신발|양말|레깅스|가방/i },
  { key: "modelHalf", label: "상반신 모델", group: "모델", role: "lifestyle", ratio: "4:5",
    purpose: "제품 핏 / 제품과 얼굴의 관계", scene: "upper-body shot of a Korean model, product fit emphasis, balanced face and product, soft light",
    sections: ["lifestyle", "usp"], categories: /패션|의류|뷰티|스킨|이어폰|안경|모자|목걸이|스카프/i },
  { key: "walkingSnap", label: "Walking Snap", group: "모델", role: "usageScene", ratio: "9:16",
    purpose: "실제 사용 / 활동성 / 화보 느낌", scene: "walking snap of a Korean model in motion, street or park, fashion editorial energy",
    sections: ["lifestyle"], categories: /패션|의류|신발|운동|러닝|가방|아웃도어/i },
  { key: "backView", label: "Back View", group: "모델", role: "structure", ratio: "9:16",
    purpose: "뒷면 구조 / 핏 / 전체 비율", scene: "back view of a Korean model wearing the product, rear design and fit detail",
    sections: ["detail", "featureDetail"], categories: /패션|의류|가방|백팩|자켓|원피스/i },
  { key: "closeupBody", label: "Close-up (신체 접촉부)", group: "모델", role: "detailCloseup", ratio: "1:1",
    purpose: "제품과 신체가 닿는 부분 클로즈업", scene: "close-up of the product where it contacts the body (hand, foot, ear, skin), realistic",
    sections: ["featureDetail", "feature"], categories: /양말|이어폰|안경|장갑|마스크|스킨|화장품|신발/i },

  // ── 리뷰 ──
  { key: "reviewMood", label: "리뷰 분위기 컷", group: "리뷰", role: "lifestyle", ratio: "4:5",
    purpose: "리뷰 섹션에 쓸 실사용 분위기 사진", scene: "warm authentic user-generated style scene, product in everyday use, cozy natural light",
    sections: [] },
  { key: "reviewHand", label: "리뷰 실사용 손 컷", group: "리뷰", role: "usageScene", ratio: "1:1",
    purpose: "제품을 실제 사용하는 손", scene: "hands using the product in a real setting, casual candid framing",
    sections: [] },
];

export const PRESET_GROUPS: PresetGroup[] = ["기본", "모델", "연출", "디테일", "리뷰"];

export function presetByKey(key: string) {
  return IMAGE_PRESETS.find((p) => p.key === key);
}
