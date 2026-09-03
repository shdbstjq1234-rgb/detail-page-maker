/**
 * 상세페이지 카피 말투 엔진.
 *
 * "설명문"이 아니라 "구매를 고민하는 사람에게 직접 말 거는 문장"으로 만든다.
 * AI 번역투 / 광고 상투어를 실제 한국 쇼핑몰 운영자가 쓸 법한 말로 바꾼다.
 *
 *  - deRobot(text)   : 문장 하나를 사람 말투로 후처리
 *  - humanizeCopy(c) : SectionCopy 전체(헤드라인/본문/불릿/스텝…)에 적용
 *  - voiceIssues(t)  : QA 용 — 아직 남아있는 기계어 표현 목록
 */
import type { SectionCopy } from "@/types/detail-page";

/** 마지막 글자에 받침이 있는지 (한글만 판정, 숫자·영문은 통상 발음 기준) */
export function hasFinalConsonant(word: string): boolean {
  const w = (word || "").trim().replace(/[)\]}"'’」』]+$/, "");
  const ch = w[w.length - 1];
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  // 숫자: 0,1,3,6,7,8 은 받침 있음(영,일,삼,육,칠,팔)
  if (/[0-9]/.test(ch)) return "013678".includes(ch);
  // 영문: l, m, n, ng 등은 받침 취급
  if (/[a-zA-Z]/.test(ch)) return "lmnrLMNR".includes(ch);
  return false;
}

/** 받침에 맞는 조사를 붙인다. josa("양말","은는") → "양말은" */
export function josa(word: string, pair: "은는" | "이가" | "을를" | "와과" | "으로로" | "이라라"): string {
  const has = hasFinalConsonant(word);
  const table: Record<string, [string, string]> = {
    은는: ["은", "는"],
    이가: ["이", "가"],
    을를: ["을", "를"],
    와과: ["과", "와"],
    으로로: ["으로", "로"],
    이라라: ["이라", "라"],
  };
  const [withC, withoutC] = table[pair];
  return `${word}${has ? withC : withoutC}`;
}

/** 반드시 피하는 표현 (QA 가 이 목록으로 검사) */
export const BANNED_PATTERNS: RegExp[] = [
  /제공합니다|제공하여|제공하는|선사합니다|선사하는/,
  /경험하세요|특별한 경험|프리미엄 경험|최고의 경험/,
  /다양(하게|한 상황에서)?\s*활용(이)?\s*(가능합니다|할 수 있습니다)/,
  /지금 바로 (구매|선택|만나)/,
  /합리적인 선택(이 될 것입니다|입니다)/,
  /고객(님)?의?\s*만족(도)?(를| 을)?\s*(높여드립니다|실현합니다)|고객 만족/,
  /압도적(인|이며)|혁신적(인|이며)|차원이 다른|놀라운 (퍼포먼스|경험)/,
  /최상의|최고의(?!\s*선택은)|완벽한 (솔루션|제품)/,
  /라이프스타일/,
  /편리하게 사용 (가능합니다|할 수 있습니다)|효율적인 사용이 가능합니다/,
  /보관이 용이합니다|휴대가 용이합니다|사용이 용이합니다/,
  /뛰어난 (성능|품질|내구성)(을 자랑합니다| 제품입니다)?/,
  /인체공학적 설계/,
];

/** 문장(clause) 단위 치환 — 트리거가 있으면 그 문장 전체를 자연스러운 문장으로 교체 */
const S = "[^.!?\\n]*"; // 문장 안쪽
const CLAUSE_SWAPS: [RegExp, string][] = [
  [new RegExp(`${S}구매를 추천${S}[.!?]?`, "g"), "필요하셨다면 지금 바꿔보셔도 좋습니다."],
  [new RegExp(`${S}지금 바로 (구매|선택|만나|경험)${S}[.!?]?`, "g"), "필요했다면 더 미루지 않아도 됩니다."],
  [new RegExp(`${S}합리적인 선택${S}[.!?]?`, "g"), "쓰다 보면 잘 골랐다는 생각이 듭니다."],
  [new RegExp(`${S}편리하게 사용${S}(가능|할 수 있)${S}[.!?]?`, "g"), "번거로운 과정을 줄였습니다."],
  [new RegExp(`${S}효율적인 사용이 가능${S}[.!?]?`, "g"), "매번 번거롭게 준비할 필요가 없습니다."],
  [new RegExp(`${S}(보관|수납)이 용이${S}[.!?]?`, "g"), "다 쓰고 나면 접어서 한쪽에 넣어두면 됩니다."],
  [new RegExp(`${S}휴대가 용이${S}[.!?]?`, "g"), "가방에 넣고 다니다가 필요할 때 바로 꺼내 쓰면 됩니다."],
  [new RegExp(`${S}사용이 용이${S}[.!?]?`, "g"), "받자마자 어렵지 않게 쓸 수 있습니다."],
  [new RegExp(`${S}다양(하게|한 상황)${S}활용${S}(가능|할 수 있)${S}[.!?]?`, "g"), "이럴 때 특히 유용합니다."],
  [new RegExp(`${S}고객(님)?${S}만족${S}(높여|향상|실현|추구|드립)${S}[.!?]?`, "g"), "쓰는 분이 편하도록 신경 썼습니다."],
  [new RegExp(`${S}인체공학적${S}설계${S}[.!?]?`, "g"), "오래 써도 불편하지 않도록 실제 사용 자세를 기준으로 설계했습니다."],
  [new RegExp(`${S}뛰어난 내구성${S}[.!?]?`, "g"), "몇 번 쓰고 버리는 제품이 되지 않도록 반복 사용을 고려했습니다."],
  [new RegExp(`${S}뛰어난 (성능|품질)${S}[.!?]?`, "g"), "매일 쓰기 좋게 기본기부터 챙겼습니다."],
  [new RegExp(`${S}특별한 경험${S}[.!?]?`, "g"), "한 번 써보면 왜 이렇게 만들었는지 느껴집니다."],
  [new RegExp(`${S}새로운 (경험|차원)${S}[.!?]?`, "g"), "써보면 확실히 다릅니다."],
  [new RegExp(`${S}(놀라운|압도적인|혁신적인)${S}(성능|경험|기술력?)${S}[.!?]?`, "g"), "써보면 확실히 다릅니다."],
  [new RegExp(`${S}경험(해|하)보세요[.!?]?`, "g"), "직접 써보세요."],
];

/** 구절 단위(문장 안 일부) 치환 */
const PHRASE_SWAPS: [RegExp, string][] = [
  [/(을|를)\s*통해\s*/g, "$1 써서 "],
  [/(를|을)\s*제공합니다\.?/g, "$1 담았습니다."],
  [/(을|를)\s*제공하(여|고|며|는)\s*/g, "$1 담아 "],
  [/(을|를)\s*선사합니다\.?/g, "$1 만들어 줍니다."],
  [/(을|를)\s*선사하(여|고|며|는)\s*/g, "$1 만들어 "],
  [/(를|을)\s*자랑합니다\.?/g, "$1 신경 썼습니다."],
];

/** 상투적 최상급 형용사 — 앞에서 떼어낸다 */
const HYPE_WORDS =
  /\s*(압도적(인|으로|이며)?|혁신적(인|으로|이며)?|차원이 다른|놀라운|최상의|프리미엄(한)?|럭셔리(한)?|명품급(의)?|초강력)\s*/g;

/** "~할 수 있습니다" 가 한 덩어리에서 2번 넘게 나오면 일부를 자연스럽게 푼다 */
function deRepeat(text: string): string {
  const marker = /할 수 있습니다/g;
  const hits = text.match(marker);
  if (!hits || hits.length < 2) return text;
  let n = 0;
  return text.replace(marker, (m) => {
    n += 1;
    if (n === 1) return m; // 첫 번째는 유지
    return n % 2 === 0 ? "쓰면 됩니다" : "됩니다";
  });
}

/** 문장 하나를 사람 말투로 후처리 */
export function deRobot(input: string): string {
  if (!input) return input;
  let t = input;
  for (const [re, to] of CLAUSE_SWAPS) t = t.replace(re, (m) => (/^\s*$/.test(m) ? m : " " + to));
  for (const [re, to] of PHRASE_SWAPS) t = t.replace(re, to);
  t = t.replace(HYPE_WORDS, " ");
  t = deRepeat(t);
  // "본 제품은 ~" 같은 잔재 정리
  t = t.replace(/(^|\s)본\s*제품은?\s*/g, "$1");
  t = t.replace(/(^|\s)당사(의)?\s*/g, "$1");
  // 조사 앞 어색한 공백 ("제품 을" → "제품을"). 이/가/은/는 은 관형사와 헷갈려 제외.
  t = t.replace(/([가-힣])\s+(을|를|와|과|도|만|에|에서|으로|로|에게|께|한테|보다|처럼|까지|부터)(\s|$|[,.!?])/g, "$1$2$3");
  // 중복 마침표 / 공백 / 문장부호 앞 공백 정리
  t = t.replace(/\.{2,}/g, ".").replace(/\s{2,}/g, " ").replace(/\s+([,.!?」』】)])/g, "$1").trim();
  // 같은 문장이 두 번 이어붙은 경우 (스왑 부작용) 정리
  t = t.replace(/([^.!?]{6,}[.!?])\s*\1/g, "$1");
  return t;
}

/** SectionCopy 전체에 말투 후처리 */
export function humanizeCopy(c: SectionCopy): SectionCopy {
  const s = (v?: string) => (v ? deRobot(v) : v);
  return {
    ...c,
    headline: deRobot(c.headline || ""),
    subheadline: s(c.subheadline) || undefined,
    body: s(c.body) || undefined,
    bullets: c.bullets?.map(deRobot).filter(Boolean),
    stats: c.stats?.map((x) => ({ value: x.value, label: deRobot(x.label) })),
    steps: c.steps?.map((x) => ({ ...x, title: deRobot(x.title), description: deRobot(x.description) })),
    infoRows: c.infoRows?.map((x) => ({ label: x.label, value: deRobot(x.value) })),
    cta: c.cta, // CTA 버튼 라벨은 짧게 두고 별도 처리
  };
}

/** QA — 아직 남아있는 기계어/상투어 */
export function voiceIssues(text: string): string[] {
  const out: string[] = [];
  for (const re of BANNED_PATTERNS) {
    const m = text.match(re);
    if (m) out.push(m[0]);
  }
  return [...new Set(out)];
}

/**
 * Claude 카피 생성용 시스템 프롬프트.
 * 파이프라인의 copyGenerator 가 이 문자열을 system 으로 쓴다.
 */
export const COPY_SYSTEM = `너는 광고 문구를 뽑는 AI가 아니라, 대한민국 온라인 쇼핑몰(쿠팡·네이버 스마트스토어)에서
매일 상세페이지를 쓰는 10년차 카피라이터이자 MD다. 실제 판매는 세일즈다.

■ 사고 순서 (항상 이 흐름으로 문장을 만든다)
고객 상황 → 기존 불편 → 제품이 해결하는 방식 → 실제 사용 시 느끼는 변화 → 구매 판단 근거 → 자연스러운 구매 유도

■ 말투
- 설명문이 아니라, 구매를 고민하는 사람에게 직접 말 거는 문장으로 쓴다.
- 제품 자랑보다 고객의 불편에서 시작한다. 기능만 나열하지 말고 "그래서 뭐가 달라지는지"까지 잇는다.
- 실제 쇼핑할 때 쓰는 말. 예: "막상 써보면", "생각보다 차이가 큽니다", "매일 쓰다 보면",
  "이런 부분이 은근히 중요합니다", "괜히 복잡하게 만들지 않았습니다", "자주 쓰는 만큼", "한 번 써보면",
  "이래서 편합니다", "이런 차이가 쌓입니다", "딱 필요한 만큼만".
- 헤드라인은 짧고 강하게(12~24자), 본문은 자연스럽게, 마무리는 부담스럽지 않게.
- 한 문단 = 한 메시지. 문장은 짧게. "고객님" 남발 금지. 소비자를 가르치지 않는다.
- 구매를 강요하지 않고 스스로 필요성을 느끼게 한다. 겁주거나 몰아붙이지 않는다.

■ 절대 쓰지 않는 표현
"제공합니다", "선사합니다", "경험하세요", "혁신적인", "압도적인", "최고의", "최상의",
"프리미엄 경험", "특별한 경험", "다양하게 활용 가능합니다", "고객 만족", "라이프스타일",
"지금 바로 구매하세요", "합리적인 선택이 될 것입니다", "편리하게 사용 가능합니다", "보관이 용이합니다".

■ 구간별 톤
- hero/오프닝: 제품 설명부터 하지 말고 고객이 겪는 상황·고민을 먼저 건드린다.
- problem: 공감시키듯. "쓰다 보면 가장 먼저 불편해지는 부분이 있습니다" 류.
- feature: 기능명만 쓰지 말고 "기능 → 실제 사용 상황 → 고객이 얻는 변화" 순으로.
- comparison: 경쟁 제품을 깎아내리지 말고 "비슷해 보여도 직접 써보면 차이가 납니다" 류.
- 신뢰: 억지 후기 금지. "구매 전 가장 많이 고민하는 부분부터 확인해보세요" 류.
- cta/마무리: "필요했던 제품이라면, 더 미루지 않아도 됩니다" 류. 압박 없이 마지막 한 번만 민다.

■ 출력 전 자가 검수: AI 번역투인가 / 너무 광고 같은가 / 한국 쇼핑몰에서 실제로 볼 법한가 /
읽자마자 의미가 들어오는가 / 제품 자랑만 하는가 / 구매 이유가 만들어지는가. 하나라도 어색하면 다시 쓴다.

JSON 하나만 출력한다.`;
