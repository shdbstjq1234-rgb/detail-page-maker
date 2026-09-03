/**
 * 카테고리별 상세페이지 기획 프리셋.
 *
 * 한국 쿠팡·스마트스토어에서 그 카테고리 상세페이지가 실제로 무엇을 다루는지를 정리한 것.
 *  - sections        : 이 카테고리에 잘 맞는 섹션 순서
 *  - sellingPoints   : 반드시 짚어야 하는 소구점 (체크리스트)
 *  - anxieties       : 구매 전에 소비자가 하는 걱정 → 페이지 중간중간 해소
 *  - comparison      : 비교표에 쓰는 기준
 *  - imageCuts       : 꼭 필요한 이미지 컷 (역할 + 왜 필요한지)
 *  - infoRows        : 제품 정보표 항목
 *  - headlines       : 이 카테고리에서 실제로 잘 읽히는 헤드라인 예시
 *
 * 절대 이걸 모든 상품에 강제하지 않는다. 시작점으로 제안하고 사용자가 고친다.
 */
import type { ImageRole, SectionType } from "@/types/detail-page";

export interface CategoryPreset {
  key: string;
  label: string;
  /** 상품명·카테고리 텍스트로 자동 감지 */
  match: RegExp;
  sections: SectionType[];
  sellingPoints: string[];
  anxieties: string[];
  comparison: string[];
  imageCuts: { role: ImageRole; label: string; why: string }[];
  infoRows: string[];
  headlines: string[];
}

const COMMON_INFO = ["제품명", "소재", "크기", "구성품", "원산지", "제조사", "품질보증기준", "A/S 안내"];

export const CATEGORY_PRESETS: CategoryPreset[] = [
  {
    key: "socks",
    label: "양말 · 레깅스 · 이너",
    match: /양말|삭스|스타킹|레깅스|이너|속옷|덧신/i,
    sections: ["hero", "usp", "problem", "solution", "feature", "featureDetail", "lifestyle", "comparison", "detail", "productInfo", "review", "cta"],
    sellingPoints: [
      "밀착 · 흘러내림 (논슬립 실리콘, 밴드 지지력)",
      "통기 · 땀 배출 (메쉬 구조, 기능성 원단)",
      "쿠션 · 충격 흡수 (발바닥 두께, 발뒤꿈치 보강)",
      "내구성 (반복 세탁 후 늘어남, 보풀)",
      "사이즈 정확도 (mm 표기, 신축 범위)",
      "세트 구성 · 장당 단가",
    ],
    anxieties: ["세탁하면 늘어나지 않을까", "발볼이 넓은데 조이지 않을까", "사진보다 얇지 않을까", "미끄럼 방지가 실제로 될까"],
    comparison: ["논슬립 처리", "발목 지지력", "통기 구조", "세탁 후 형태 유지", "봉제 마감", "장당 가격"],
    imageCuts: [
      { role: "heroMain", label: "착용 히어로컷", why: "발에 신은 상태의 첫인상" },
      { role: "detailCloseup", label: "발바닥 논슬립 확대", why: "가장 강한 기능을 눈으로 증명" },
      { role: "featureExplainer", label: "메쉬 통기 구조", why: "안 보이는 기능을 시각화" },
      { role: "usageScene", label: "러닝/운동 착용 장면", why: "쓰는 상황을 상상하게" },
      { role: "sizeReference", label: "사이즈 표", why: "구매 직전 확인" },
      { role: "productCutout", label: "3켤레 구성컷", why: "세트 가치 전달" },
    ],
    infoRows: ["제품명", "소재 혼용률", "사이즈(mm)", "구성", "제조국", "세탁 방법"],
    headlines: [
      "뛸 때마다 흘러내리던 그 불편함",
      "발바닥에서 붙잡아 줍니다",
      "세탁 열 번 해도 그대로",
      "얇은데 안 비칩니다",
    ],
  },
  {
    key: "mask",
    label: "마스크 · 자외선 차단 소품",
    match: /마스크|넥워머|암커버|쿨토시|자외선\s*차단|페이스커버/i,
    sections: ["hero", "usp", "problem", "solution", "feature", "featureDetail", "lifestyle", "comparison", "detail", "howToUse", "productInfo", "review", "cta"],
    sellingPoints: [
      "숨쉬기 편한 정도 (통기 구조, 입 공간)",
      "밀착 · 흘러내림 (귀걸이, 조절 방식)",
      "냉감 · 열감 (여름 착용감)",
      "자외선 차단 (※ UPF 수치는 시험성적서 있을 때만)",
      "피부 자극 (소재, 봉제선 위치)",
      "세탁 후 기능 유지",
    ],
    anxieties: ["숨이 답답하지 않을까", "안경에 김이 서리지 않을까", "귀가 아프지 않을까", "세탁하면 기능이 없어질까"],
    comparison: ["통기성", "밀착 구조", "냉감 소재", "귀 편안함", "세탁 내구성"],
    imageCuts: [
      { role: "heroMain", label: "모델 착용 히어로", why: "착용 인상이 구매를 좌우" },
      { role: "featureExplainer", label: "공기 흐름 시각화", why: "통기성은 말보다 그림" },
      { role: "detailCloseup", label: "봉제·귀걸이 확대", why: "마감 품질 증명" },
      { role: "usageScene", label: "야외 활동 장면", why: "언제 쓰는지" },
      { role: "comparison", label: "일반 마스크 비교", why: "차이를 눈으로" },
    ],
    infoRows: ["제품명", "소재", "사이즈", "색상", "제조국", "세탁 방법", "주의사항"],
    headlines: [
      "숨쉬기 편해서 더 오래 쓰게 됩니다",
      "얼굴에 딱, 흘러내리지 않게",
      "여름에도 답답하지 않게",
    ],
  },
  {
    key: "kitchen",
    label: "주방용품 · 조리도구",
    match: /주방|텀블러|보온병|컵|머그|그릇|도마|프라이팬|냄비|수저|밀폐|도시락|조리|식기|칼|주걱/i,
    sections: ["hero", "usp", "problem", "solution", "feature", "featureDetail", "detail", "lifestyle", "comparison", "howToUse", "productInfo", "review", "cta"],
    sellingPoints: [
      "위생 · 세척 편의 (분해 여부, 식기세척기)",
      "밀폐력 · 누수 (뚜껑 구조, 패킹)",
      "보온·보냉 시간 (※ 실측 근거 있을 때만)",
      "소재 안전성 (식품용 인증 자료 있을 때만)",
      "용량 · 크기 (실제 담기는 양)",
      "내열/내냉 (전자레인지·냉동 가능 여부)",
    ],
    anxieties: ["세척이 번거롭지 않을까", "냄새가 배지 않을까", "새지 않을까", "전자레인지에 써도 되나", "생각보다 작지 않을까"],
    comparison: ["밀폐 구조", "분해 세척", "내열 범위", "용량 대비 부피", "냄새 배임", "마감 품질"],
    imageCuts: [
      { role: "heroMain", label: "제품 히어로", why: "형태와 재질감" },
      { role: "structure", label: "분해 구조도", why: "세척 편의를 구조로 증명" },
      { role: "featureExplainer", label: "밀폐 테스트(뒤집기)", why: "누수 걱정 해소" },
      { role: "sizeReference", label: "손·식탁 대비 크기", why: "크기 감 잡기" },
      { role: "usageScene", label: "실제 사용 장면", why: "언제 쓰는지" },
      { role: "detailCloseup", label: "패킹·마감 확대", why: "품질 신뢰" },
    ],
    infoRows: ["제품명", "소재", "용량", "크기", "내열/내냉 온도", "전자레인지·식기세척기", "제조국"],
    headlines: [
      "설거지가 줄어드는 구조",
      "가방에 눕혀도 새지 않게",
      "다 쓰고 나면 접어서 한쪽에",
      "냄새 안 배는 게 생각보다 중요합니다",
    ],
  },
  {
    key: "storage",
    label: "수납 · 정리용품",
    match: /수납|정리|선반|서랍|바구니|박스|행거|옷걸이|리빙박스|트레이/i,
    sections: ["hero", "problem", "solution", "usp", "feature", "detail", "lifestyle", "comparison", "howToUse", "productInfo", "review", "cta"],
    sellingPoints: [
      "수납량 (실제로 몇 개가 들어가는지)",
      "공간 효율 (설치 전/후 비교)",
      "하중 · 튼튼함",
      "설치 난이도 (도구 필요 여부, 시간)",
      "크기 호환 (내 공간에 맞는지)",
      "쌓기·연결 가능 여부",
    ],
    anxieties: ["우리 집에 안 맞으면 어쩌지", "무너지지 않을까", "조립이 어렵지 않을까", "생각보다 작지 않을까"],
    comparison: ["수납량", "하중", "설치 시간", "확장·적재", "마감"],
    imageCuts: [
      { role: "beforeAfter", label: "정리 전 / 후", why: "이 카테고리에서 가장 강한 컷" },
      { role: "heroMain", label: "설치 완료 히어로", why: "완성된 모습" },
      { role: "sizeReference", label: "치수 도면", why: "공간 호환 확인" },
      { role: "usageScene", label: "실제 물건 담은 컷", why: "수납량 실감" },
      { role: "structure", label: "조립 구조", why: "설치 난이도 해소" },
    ],
    infoRows: ["제품명", "소재", "외경/내경 치수", "허용 하중", "구성품", "설치 방식", "제조국"],
    headlines: [
      "쌓아두던 자리가 이렇게 정리됩니다",
      "생각보다 훨씬 많이 들어갑니다",
      "드라이버 없이 5분이면 끝",
    ],
  },
  {
    key: "bag",
    label: "가방 · 지갑 · 파우치",
    match: /가방|백팩|크로스백|토트|파우치|지갑|카드지갑|보스턴|에코백|클러치/i,
    sections: ["hero", "usp", "problem", "solution", "feature", "featureDetail", "detail", "lifestyle", "comparison", "productInfo", "review", "cta"],
    sellingPoints: [
      "수납 구성 (칸 개수, 무엇이 들어가는지)",
      "크기 · 두께 (실제 착용 비율)",
      "소재 · 마감 (봉제, 지퍼 브랜드)",
      "무게 (오래 들었을 때)",
      "실용 디테일 (안주머니, 캐리어 걸이)",
      "데일리 코디 범용성",
    ],
    anxieties: ["사진보다 작지 않을까", "노트북이 들어갈까", "어깨가 아프지 않을까", "금방 헤지지 않을까"],
    comparison: ["수납 칸", "지퍼·봉제 마감", "무게", "형태 유지", "소재 내구성"],
    imageCuts: [
      { role: "heroMain", label: "모델 착용컷", why: "몸 대비 크기 감" },
      { role: "usageScene", label: "수납 실물컷 (물건 넣은)", why: "수납량은 말보다 사진" },
      { role: "detailCloseup", label: "지퍼·봉제 확대", why: "마감 품질" },
      { role: "structure", label: "내부 구조 펼침컷", why: "칸 구성 이해" },
      { role: "sizeReference", label: "치수 표기", why: "구매 직전 확인" },
      { role: "lifestyle", label: "데일리 코디", why: "소유 장면 상상" },
    ],
    infoRows: ["제품명", "소재", "가로×세로×폭", "무게", "수납 구성", "색상", "제조국"],
    headlines: [
      "휴대폰, 카드지갑, 이어폰까지 한 번에",
      "작아 보여도 들어갈 건 다 들어갑니다",
      "매일 드는 가방이라 무게부터 줄였습니다",
    ],
  },
  {
    key: "apparel",
    label: "의류 · 패션",
    match: /티셔츠|셔츠|니트|자켓|코트|패딩|원피스|바지|청바지|반바지|맨투맨|후드|블라우스|스커트/i,
    sections: ["hero", "usp", "feature", "featureDetail", "detail", "lifestyle", "comparison", "productInfo", "review", "cta"],
    sellingPoints: [
      "핏 (실측 사이즈, 모델 착용 정보)",
      "소재 · 촉감 (혼용률, 두께감)",
      "비침 · 늘어남",
      "계절감 (언제 입는지)",
      "세탁 관리 (수축, 물빠짐)",
      "코디 범용성",
    ],
    anxieties: ["사이즈가 맞을까", "비치지 않을까", "세탁하면 줄어들까", "색이 사진과 다를까", "생각보다 얇지 않을까"],
    comparison: ["원단 두께", "비침 정도", "세탁 후 수축", "봉제 마감", "핏"],
    imageCuts: [
      { role: "heroMain", label: "전신 착용컷", why: "핏이 첫 구매 이유" },
      { role: "detailCloseup", label: "원단 텍스처 매크로", why: "촉감·두께 전달" },
      { role: "lifestyle", label: "코디 3종", why: "활용도" },
      { role: "sizeReference", label: "실측 사이즈표", why: "반품률을 좌우" },
      { role: "comparison", label: "컬러 라인업", why: "옵션 선택" },
    ],
    infoRows: ["제품명", "소재 혼용률", "실측 사이즈", "모델 착용 정보", "색상", "세탁 방법", "제조국"],
    headlines: [
      "한 장만 입어도 정리돼 보이게",
      "비침 걱정 없이 입는 두께",
      "세탁해도 그대로인 이유",
    ],
  },
  {
    key: "beauty",
    label: "뷰티 소품 · 화장 도구",
    match: /뷰티|화장|브러시|퍼프|거울|고데기|드라이기|네일|미용|클렌징\s*도구|헤어/i,
    sections: ["hero", "usp", "problem", "solution", "feature", "featureDetail", "detail", "howToUse", "lifestyle", "productInfo", "review", "cta"],
    sellingPoints: [
      "피부 자극 · 소재 안전성",
      "세척 · 위생 관리",
      "사용 편의 (그립, 무게, 각도)",
      "결과물 차이 (전/후)",
      "휴대성",
      "내구성 · 교체 주기",
    ],
    anxieties: ["피부에 자극되지 않을까", "세척이 어렵지 않을까", "금방 망가지지 않을까", "실제로 차이가 있을까"],
    comparison: ["소재", "세척 편의", "그립감", "내구성", "휴대성"],
    imageCuts: [
      { role: "heroMain", label: "제품 히어로", why: "질감·마감" },
      { role: "beforeAfter", label: "사용 전 / 후", why: "결과가 곧 구매 이유" },
      { role: "detailCloseup", label: "소재 매크로", why: "피부에 닿는 부분" },
      { role: "usageScene", label: "사용 장면", why: "사용법 이해" },
      { role: "sizeReference", label: "손 대비 크기", why: "휴대성" },
    ],
    infoRows: ["제품명", "소재", "크기", "구성", "세척 방법", "제조국", "주의사항"],
    headlines: [
      "매일 피부에 닿는 거라 소재부터 골랐습니다",
      "세척이 쉬워야 계속 씁니다",
      "손에 쥐는 순간 차이가 납니다",
    ],
  },
  {
    key: "camping",
    label: "캠핑 · 아웃도어",
    match: /캠핑|아웃도어|텐트|침낭|랜턴|코펠|버너|타프|화로|아이스박스|등산|낚시/i,
    sections: ["hero", "usp", "problem", "solution", "feature", "featureDetail", "detail", "lifestyle", "howToUse", "comparison", "productInfo", "review", "cta"],
    sellingPoints: [
      "설치·철수 시간",
      "휴대 부피 · 무게",
      "내구성 (바람, 비, 반복 사용)",
      "수납·정리 편의",
      "안전 (화기, 하중)",
      "실사용 환경 적합성",
    ],
    anxieties: ["혼자서 칠 수 있을까", "비 오면 새지 않을까", "차에 들어갈까", "바람에 넘어가지 않을까"],
    comparison: ["설치 시간", "수납 부피", "무게", "내수압/내구성", "구성품"],
    imageCuts: [
      { role: "heroMain", label: "설치 완료 캠핑장 컷", why: "이 카테고리 최고 후킹" },
      { role: "usageScene", label: "설치 과정 스텝컷", why: "난이도 우려 해소" },
      { role: "sizeReference", label: "수납 시 크기", why: "차량 적재 걱정" },
      { role: "detailCloseup", label: "폴대·원단 마감", why: "내구성 신뢰" },
      { role: "lifestyle", label: "야간 감성컷", why: "소유 욕구" },
    ],
    infoRows: ["제품명", "소재", "펼쳤을 때 크기", "수납 시 크기", "무게", "구성품", "제조국"],
    headlines: [
      "혼자서도 10분이면 완성",
      "차 트렁크에 이만큼만 차지합니다",
      "비 오는 날 한 번 써보면 압니다",
    ],
  },
  {
    key: "pet",
    label: "반려동물용품",
    match: /반려|강아지|고양이|펫|사료|급식기|하네스|리드줄|스크래처|배변|캣타워/i,
    sections: ["hero", "problem", "solution", "usp", "feature", "featureDetail", "detail", "lifestyle", "howToUse", "productInfo", "review", "cta"],
    sellingPoints: [
      "안전성 (물어도 되는 소재, 삼킴 위험)",
      "위생 · 세척",
      "체형·체중별 사이즈",
      "우리 아이가 좋아할지",
      "냄새 · 소음",
      "내구성 (물어뜯음)",
    ],
    anxieties: ["물어뜯어도 괜찮을까", "우리 아이 사이즈에 맞을까", "세척이 될까", "냄새가 배지 않을까"],
    comparison: ["소재 안전성", "세척 방식", "사이즈 범위", "내구성", "미끄럼 방지"],
    imageCuts: [
      { role: "heroMain", label: "반려동물 사용컷", why: "가장 강한 감성 후킹" },
      { role: "sizeReference", label: "체중·체형별 사이즈", why: "오구매 방지" },
      { role: "detailCloseup", label: "봉제·소재 확대", why: "안전 신뢰" },
      { role: "usageScene", label: "실사용 장면", why: "사용 상황" },
      { role: "structure", label: "분해 세척 구조", why: "위생 걱정 해소" },
    ],
    infoRows: ["제품명", "소재", "사이즈(체중 기준)", "구성", "세척 방법", "제조국", "주의사항"],
    headlines: [
      "물고 뜯어도 버티게 만들었습니다",
      "우리 아이 체형에 맞는 사이즈부터",
      "매일 쓰는 거라 세척이 쉬워야 합니다",
    ],
  },
  {
    key: "stationery",
    label: "문구 · 완구 · 취미",
    match: /문구|색연필|연필|펜|노트|다이어리|스티커|장난감|블록|인형|퍼즐|슬라임|보드게임|만들기/i,
    sections: ["hero", "usp", "feature", "featureDetail", "detail", "lifestyle", "howToUse", "comparison", "productInfo", "review", "cta"],
    sellingPoints: [
      "안전성 (연령, 소재, KC ※ 인증자료 있을 때만)",
      "구성 · 수량 (몇 개가 들어있는지)",
      "실제 결과물 (색감, 촉감, 완성도)",
      "사용 연령대",
      "정리·보관",
      "재구매 · 리필 가능 여부",
    ],
    anxieties: ["아이가 써도 안전할까", "생각보다 양이 적지 않을까", "금방 질리지 않을까", "정리가 어렵지 않을까"],
    comparison: ["구성 수량", "소재 안전", "발색·품질", "보관 편의", "가격 대비 양"],
    imageCuts: [
      { role: "heroMain", label: "전체 구성컷", why: "양과 구성이 곧 가치" },
      { role: "detailCloseup", label: "질감·발색 매크로", why: "품질 증명" },
      { role: "usageScene", label: "사용/놀이 장면", why: "쓰는 모습 상상" },
      { role: "productCutout", label: "구성품 낱개 배열", why: "무엇이 들어있는지" },
      { role: "sizeReference", label: "손 대비 크기", why: "크기 감" },
    ],
    infoRows: ["제품명", "구성/수량", "소재", "사용 연령", "크기", "제조국", "주의사항"],
    headlines: [
      "펼쳐보면 생각보다 많이 들어있습니다",
      "손에 묻지 않고, 정리도 쉽게",
      "한 번 사면 오래 쓰는 구성",
    ],
  },
  {
    key: "car",
    label: "자동차용품",
    match: /자동차|차량|카매트|거치대|차량용|썬바이저|블랙박스|세차|트렁크\s*정리/i,
    sections: ["hero", "problem", "solution", "usp", "feature", "featureDetail", "detail", "howToUse", "comparison", "productInfo", "review", "cta"],
    sellingPoints: [
      "차종 호환 (내 차에 맞는지)",
      "설치 방식 · 시간",
      "고정력 (주행 중 흔들림)",
      "시야·안전 방해 여부",
      "내열 (여름 차 안 온도)",
      "탈부착 · 세척",
    ],
    anxieties: ["내 차에 맞을까", "주행 중 떨어지지 않을까", "여름에 녹거나 냄새나지 않을까", "설치가 어렵지 않을까"],
    comparison: ["차종 호환", "고정 방식", "설치 시간", "내열", "탈부착"],
    imageCuts: [
      { role: "heroMain", label: "차량 장착 히어로", why: "장착 모습이 곧 구매 판단" },
      { role: "usageScene", label: "설치 스텝컷", why: "난이도 해소" },
      { role: "detailCloseup", label: "고정부 확대", why: "고정력 신뢰" },
      { role: "sizeReference", label: "호환 차종·치수", why: "오구매 방지" },
    ],
    infoRows: ["제품명", "호환 차종", "소재", "크기", "설치 방식", "구성품", "제조국"],
    headlines: [
      "주행 중에 흔들리면 아무 의미 없으니까",
      "공구 없이 1분이면 장착",
      "여름 차 안에서도 버티게",
    ],
  },
  {
    key: "bath",
    label: "욕실 · 생활용품",
    match: /욕실|수건|타월|칫솔|치약|비누|샤워|배수구|변기|청소|세제|빨래|생활용품/i,
    sections: ["hero", "problem", "solution", "usp", "feature", "detail", "lifestyle", "howToUse", "comparison", "productInfo", "review", "cta"],
    sellingPoints: [
      "위생 · 물때·곰팡이",
      "건조 속도 · 물빠짐",
      "설치 (타공 여부, 흡착력)",
      "냄새",
      "교체 주기 · 소모품 비용",
      "미끄럼 방지",
    ],
    anxieties: ["곰팡이가 생기지 않을까", "떨어지지 않을까", "냄새가 나지 않을까", "타일에 구멍 뚫어야 하나"],
    comparison: ["건조·배수 구조", "설치 방식", "곰팡이 저항", "내구성", "교체 비용"],
    imageCuts: [
      { role: "heroMain", label: "욕실 설치 히어로", why: "설치된 모습" },
      { role: "beforeAfter", label: "정리 전 / 후", why: "변화 실감" },
      { role: "featureExplainer", label: "물빠짐 구조", why: "위생 기능 시각화" },
      { role: "detailCloseup", label: "흡착·고정부", why: "떨어짐 걱정 해소" },
    ],
    infoRows: ["제품명", "소재", "크기", "설치 방식", "구성", "제조국", "관리 방법"],
    headlines: [
      "물때 끼는 자리부터 없앴습니다",
      "타일에 구멍 안 뚫어도 됩니다",
      "말리는 시간이 반으로",
    ],
  },
  {
    key: "furniture",
    label: "가구 · 대형 리빙",
    match: /가구|의자|책상|소파|침대|매트리스|테이블|선반장|수납장|화장대/i,
    sections: ["hero", "usp", "problem", "solution", "feature", "featureDetail", "detail", "lifestyle", "howToUse", "comparison", "productInfo", "review", "cta"],
    sellingPoints: [
      "치수 (내 공간에 들어가는지)",
      "하중 · 안정성",
      "조립 난이도 · 시간",
      "소재 · 마감 (스크래치, 냄새)",
      "착석감/사용감",
      "배송·설치 방식",
    ],
    anxieties: ["우리 집에 들어갈까", "혼자 조립할 수 있을까", "흔들리지 않을까", "새 가구 냄새가 나지 않을까"],
    comparison: ["하중", "조립 시간", "마감 소재", "흔들림", "A/S"],
    imageCuts: [
      { role: "heroMain", label: "공간 연출 히어로", why: "놓였을 때 그림" },
      { role: "sizeReference", label: "정확한 치수 도면", why: "가구는 치수가 전부" },
      { role: "structure", label: "조립 구조·부속", why: "조립 난이도" },
      { role: "detailCloseup", label: "마감·엣지 확대", why: "품질 신뢰" },
      { role: "lifestyle", label: "실제 사용 공간", why: "소유 상상" },
    ],
    infoRows: ["제품명", "소재", "가로×세로×높이", "허용 하중", "구성품", "조립 방식", "배송 방법", "제조국"],
    headlines: [
      "들어갈지부터 확인하세요 (치수 먼저)",
      "혼자서 30분이면 조립됩니다",
      "흔들리지 않는 게 기본입니다",
    ],
  },
  {
    key: "sports",
    label: "스포츠 · 헬스",
    match: /스포츠|운동|헬스|요가|피트니스|덤벨|매트|폼롤러|러닝|홈트|짐/i,
    sections: ["hero", "usp", "problem", "solution", "feature", "featureDetail", "detail", "lifestyle", "howToUse", "comparison", "productInfo", "review", "cta"],
    sellingPoints: [
      "그립 · 미끄럼 방지",
      "쿠션 · 충격 흡수 (두께)",
      "냄새 (신소재 특유의)",
      "내구성 (반복 사용)",
      "보관·휴대",
      "층간소음",
    ],
    anxieties: ["미끄럽지 않을까", "냄새가 심하지 않을까", "아랫집에 소리가 갈까", "금방 눌리지 않을까"],
    comparison: ["두께·쿠션", "미끄럼 방지", "소음 저감", "냄새", "복원력"],
    imageCuts: [
      { role: "heroMain", label: "운동 장면 히어로", why: "쓰는 상황이 곧 후킹" },
      { role: "featureExplainer", label: "충격 흡수 시각화", why: "안 보이는 기능" },
      { role: "detailCloseup", label: "표면 그립 매크로", why: "미끄럼 걱정 해소" },
      { role: "sizeReference", label: "두께·크기", why: "선택 기준" },
      { role: "usageScene", label: "보관·수납", why: "생활 편의" },
    ],
    infoRows: ["제품명", "소재", "두께", "크기", "무게", "구성", "제조국"],
    headlines: [
      "손 짚었을 때 밀리지 않아야 합니다",
      "아랫집 눈치 안 보고 뛰려면",
      "두께 1cm 차이가 만드는 것",
    ],
  },
];

/** 범용 폴백 — 어떤 카테고리에도 안 걸릴 때 */
export const GENERIC_PRESET: CategoryPreset = {
  key: "generic",
  label: "일반 상품",
  match: /.^/,
  sections: ["hero", "usp", "problem", "solution", "feature", "featureDetail", "lifestyle", "comparison", "detail", "howToUse", "productInfo", "review", "cta"],
  sellingPoints: [
    "가장 자주 쓰는 상황에서의 편의",
    "소재 · 마감 품질",
    "크기 · 용량 (실물 감)",
    "관리 · 세척 편의",
    "내구성 · 교체 주기",
    "구성품 · 가격 대비 가치",
  ],
  anxieties: ["사진과 다르지 않을까", "생각보다 작지 않을까", "금방 망가지지 않을까", "쓰기 번거롭지 않을까"],
  comparison: ["소재·마감", "사용 편의", "내구성", "구성", "가격 대비"],
  imageCuts: [
    { role: "heroMain", label: "메인 히어로", why: "첫인상" },
    { role: "detailCloseup", label: "디테일 확대", why: "마감 품질" },
    { role: "usageScene", label: "사용 장면", why: "쓰는 상황" },
    { role: "sizeReference", label: "크기 비교", why: "실물 감" },
    { role: "productCutout", label: "구성품 컷", why: "무엇을 받는지" },
  ],
  infoRows: COMMON_INFO,
  headlines: ["매일 쓰는 물건일수록 기본이 중요합니다", "한 번 써보면 왜 이렇게 만들었는지 느껴집니다"],
};

/** 상품명·카테고리 텍스트로 프리셋 자동 감지 */
export function detectPreset(input: { name?: string; category?: string; description?: string }): CategoryPreset {
  const hay = `${input.category ?? ""} ${input.name ?? ""} ${(input.description ?? "").slice(0, 200)}`;
  return CATEGORY_PRESETS.find((p) => p.match.test(hay)) ?? GENERIC_PRESET;
}

export function presetByKey(key: string): CategoryPreset | undefined {
  return key === "generic" ? GENERIC_PRESET : CATEGORY_PRESETS.find((p) => p.key === key);
}

/** 모든 프리셋 (선택 UI 용) */
export const ALL_PRESETS: CategoryPreset[] = [...CATEGORY_PRESETS, GENERIC_PRESET];
