/**
 * 출력 전 자동 검수 (QA).
 *
 * 상세페이지가 "싸 보이거나 / 틀리거나 / 근거 없는" 상태로 나가지 않도록
 * 다운로드 직전에 확인할 항목을 모은다. 순수 함수 — doc 만 보고 판단한다.
 *
 * 특히:
 *  - 다른 상품명·카테고리 단어가 섞여 들어간 경우 (레퍼런스 복붙 사고)
 *  - 사용자 근거(스펙/설명) 없는 수치·인증·효능 표현
 *  - AI가 만든 예시 리뷰가 실제 후기처럼 남아있는 경우
 */
import type { EditorDoc } from "./editor-doc";
import { SECTION_LABEL } from "./editor-doc";
import { voiceIssues } from "./copy-voice";
import { auditPalette, contrastRatio } from "./color-direction";
import type { SectionType } from "@/types/detail-page";

export type QaLevel = "error" | "warn" | "info";

export interface QaFinding {
  id: string;
  level: QaLevel;
  sectionId?: string;
  sectionLabel?: string;
  title: string;
  detail: string;
}

/** 온라인 쇼핑몰에서 흔한 "상품 종류" 명사 — 다른 상품 단어 혼입 탐지용 */
const PRODUCT_NOUNS = [
  "양말","스타킹","레깅스","티셔츠","셔츠","니트","자켓","코트","패딩","원피스","바지","청바지","반바지","속옷","브라",
  "물병","텀블러","보온병","컵","머그","그릇","도마","프라이팬","냄비","수저","젓가락","칼","주걱",
  "가방","백팩","크로스백","토트백","파우치","지갑","카드지갑","벨트","모자","캡","비니","장갑","목도리","스카프",
  "마스크","안경","선글라스","렌즈","이어폰","헤드폰","케이스","거치대","보조배터리","충전기","케이블",
  "의자","책상","선반","수납장","서랍","행거","옷걸이","매트","방석","쿠션","이불","베개","담요","커튼","러그",
  "수건","타월","칫솔","치약","비누","샴푸","클렌저","크림","세럼","토너","마스크팩","선크림","립밤",
  "우산","텐트","침낭","랜턴","코펠","버너","의자","아이스박스",
  "신발","운동화","슬리퍼","샌들","구두","부츠","깔창",
  "화분","조명","스탠드","선풍기","가습기","제습기","청소기","공기청정기","전기포트","믹서기","드라이기","고데기",
  "장난감","블록","인형","퍼즐","슬라임","보드게임","색연필","연필","펜","노트","다이어리","스티커",
  "칫솔살균기","반려동물","강아지","고양이","사료","급식기","방석","하네스","리드줄","스크래처",
];

/** 근거가 필요한 수치·인증·효능 패턴 */
const CLAIM_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\d{1,3}\s?%/g, label: "퍼센트 수치" },
  { re: /\d+\s?배/g, label: "N배 표현" },
  { re: /\d+\s?시간|\d+\s?일\s?지속/g, label: "지속시간" },
  { re: /항균|살균|멸균|抗菌/g, label: "항균/살균" },
  { re: /방수|생활방수|완전방수|IPX?\d/g, label: "방수" },
  { re: /의료용|메디컬|병원에서/g, label: "의료용" },
  { re: /무독성|무해|인체무해|저자극|무자극/g, label: "무독성/저자극" },
  { re: /친환경|생분해|자연분해|eco\s?friendly/gi, label: "친환경" },
  { re: /FDA|KC\s?인증|KC마크|특허|디자인등록|시험성적서/g, label: "인증/특허" },
  { re: /UV\s?차단|자외선\s?차단|UPF\s?\d+|SPF\s?\d+/g, label: "자외선 차단" },
];

const NEEDS_IMAGE: SectionType[] = ["hero", "lifestyle", "detail", "featureDetail", "solution", "problem"];

const PLACEHOLDER_RE = /^(.*\s)?(제목|제목을 입력하세요|섹션 제목|내용을 입력하세요|항목 \d+)$/;

function textOf(copy: EditorDoc["sections"][number]["copy"]): string {
  return [
    copy.headline,
    copy.subheadline,
    copy.body,
    ...(copy.bullets ?? []),
    ...(copy.stats ?? []).flatMap((s) => [s.value, s.label]),
    ...(copy.steps ?? []).flatMap((s) => [s.title, s.description]),
    ...(copy.infoRows ?? []).flatMap((r) => [r.label, r.value]),
    copy.cta,
  ]
    .filter(Boolean)
    .join(" ");
}

export function runQa(doc: EditorDoc): QaFinding[] {
  const out: QaFinding[] = [];
  let n = 0;
  const add = (f: Omit<QaFinding, "id">) => out.push({ id: `qa_${n++}`, ...f });

  const p = doc.product;
  const productHay = `${p.name ?? ""} ${p.category ?? ""} ${p.description ?? ""} ${(p.features ?? []).join(" ")} ${(
    p.specs ?? []
  ).join(" ")}`.toLowerCase();
  const evidenceHay = `${p.description ?? ""} ${(p.specs ?? []).join(" ")} ${(p.features ?? []).join(" ")} ${(
    p.sellingPoints ?? []
  ).join(" ")} ${p.material ?? ""} ${p.size ?? ""}`.toLowerCase();

  // 상품명에서 뽑은 "우리 상품 종류" 명사 (혼입 탐지 시 예외)
  const ownNouns = new Set(PRODUCT_NOUNS.filter((w) => productHay.includes(w)));

  const seenHeadlines = new Map<string, string>();

  if (!p.name?.trim()) {
    add({ level: "error", title: "상품명이 비어 있어요", detail: "왼쪽 패널에서 상품명을 입력해 주세요. 카피·이미지 프롬프트의 기준이 됩니다." });
  }
  if (!(p.images ?? []).length) {
    add({ level: "warn", title: "상품 사진이 없어요", detail: "누끼컷을 1장 이상 올리면 이미지가 제품 원형을 유지한 채로 생성됩니다." });
  }

  for (const sec of doc.sections) {
    const label = SECTION_LABEL[sec.type];
    const hay = textOf(sec.copy);
    const hayLower = hay.toLowerCase();

    // 1) 플레이스홀더 / 빈 섹션
    const hl = (sec.copy.headline ?? "").trim();
    if (!hl || PLACEHOLDER_RE.test(hl)) {
      add({ level: "error", sectionId: sec.id, sectionLabel: label, title: "헤드라인이 비어 있거나 기본값이에요", detail: `‘${label}’ 섹션의 헤드라인을 실제 문구로 바꿔주세요.` });
    }
    const hasAnything = hl || sec.copy.body || (sec.copy.bullets?.length ?? 0) > 0 || sec.images.length > 0 || (sec.copy.stats?.length ?? 0) > 0;
    if (!hasAnything) {
      add({ level: "warn", sectionId: sec.id, sectionLabel: label, title: "비어 있는 섹션", detail: `‘${label}’ 섹션에 내용이 없습니다. 채우거나 삭제하세요.` });
    }

    // 2) 다른 상품명/종류 단어 혼입
    for (const noun of PRODUCT_NOUNS) {
      if (ownNouns.has(noun)) continue;
      if (hay.includes(noun)) {
        add({
          level: "warn",
          sectionId: sec.id,
          sectionLabel: label,
          title: `다른 상품 표현이 섞여 있어요 — “${noun}”`,
          detail: `‘${label}’ 섹션 문구에 현재 상품과 무관해 보이는 “${noun}” 이(가) 있습니다. 레퍼런스 문구가 남았는지 확인하세요.`,
        });
        break;
      }
    }

    // 2.5) 기계어 / 광고 상투어
    const robot = voiceIssues(hay);
    if (robot.length) {
      add({
        level: "warn",
        sectionId: sec.id,
        sectionLabel: label,
        title: `기계어 같은 표현 — “${robot[0]}”`,
        detail:
          `‘${label}’ 섹션에 실제 판매자가 잘 안 쓰는 표현이 있어요` +
          (robot.length > 1 ? ` (외 ${robot.length - 1}건)` : "") +
          `. 오른쪽 패널 ‘사람 말투로 다듬기’로 고칠 수 있어요.`,
      });
    }

    // 3) 영어 마케팅 문구 덩어리 (복붙 잔재)
    const engRun = hay.match(/[A-Za-z][A-Za-z'’]*(?:\s+[A-Za-z][A-Za-z'’]*){3,}/);
    if (engRun && !/^https?:/i.test(engRun[0])) {
      add({
        level: "info",
        sectionId: sec.id,
        sectionLabel: label,
        title: "영문 문장이 그대로 들어가 있어요",
        detail: `“${engRun[0].slice(0, 48)}…” — 한국어 카피로 바꾸거나 라벨 정도로 짧게 쓰세요.`,
      });
    }

    // 4) 근거 없는 수치·인증
    for (const { re, label: claimLabel } of CLAIM_PATTERNS) {
      const m = hayLower.match(re);
      if (!m) continue;
      const token = m[0].trim();
      if (evidenceHay.includes(token) || evidenceHay.includes(claimLabel)) continue;
      // 리뷰·비교표의 일반 수치는 관대하게 — 헤드라인/서브/본문에서만 강하게 본다
      const inStrong = [sec.copy.headline, sec.copy.subheadline, sec.copy.body].filter(Boolean).join(" ").toLowerCase();
      if (!re.test(inStrong)) continue;
      add({
        level: "warn",
        sectionId: sec.id,
        sectionLabel: label,
        title: `근거가 없는 ${claimLabel} — “${token}”`,
        detail: "사용자가 입력한 스펙·시험자료에 없는 수치/인증/효능입니다. 실제 근거를 넣거나 표현을 빼주세요.",
      });
      break;
    }

    // 5) 이미지 필요 섹션인데 비어 있음
    if (NEEDS_IMAGE.includes(sec.type) && sec.images.length === 0) {
      add({ level: "warn", sectionId: sec.id, sectionLabel: label, title: "이미지가 필요한 섹션이 비어 있어요", detail: `‘${label}’ 섹션에 이미지가 없습니다. ‘누끼컷으로 전체 이미지 제작’으로 채울 수 있어요.` });
    }

    // 6) 헤드라인 길이
    if (hl.length > 28) {
      add({ level: "info", sectionId: sec.id, sectionLabel: label, title: "헤드라인이 길어요", detail: `${hl.length}자 — 15~28자로 줄이면 훑어읽기 좋습니다.` });
    }

    // 7) 중복 헤드라인
    if (hl) {
      const prev = seenHeadlines.get(hl);
      if (prev) add({ level: "info", sectionId: sec.id, sectionLabel: label, title: "헤드라인이 다른 섹션과 똑같아요", detail: `“${hl}” — ‘${prev}’ 섹션과 겹칩니다.` });
      else seenHeadlines.set(hl, label);
    }

    // 8) 긴 문단
    const body = (sec.copy.body ?? "").trim();
    if (body.length > 160 && !/[.。!?\n]/.test(body.slice(20, body.length - 5))) {
      add({ level: "info", sectionId: sec.id, sectionLabel: label, title: "문단이 길어요", detail: "2~3개의 짧은 문장으로 나누면 모바일에서 읽기 쉬워집니다." });
    }
  }

  // 8.5) 컬러 시스템 검수
  const dir = doc.designDirection;
  if (!dir) {
    add({ level: "info", title: "컬러 디렉팅이 아직 없어요", detail: "왼쪽 ‘컬러 디렉팅’에서 상품 사진으로 색을 분석하면 섹션 배경·버튼 색이 자동으로 잡힙니다." });
  } else {
    for (const i of auditPalette(dir.palette)) {
      add({ level: "warn", title: "컬러 시스템 점검", detail: i });
    }
    // 어두운 섹션이 과하면 페이지가 무거워진다
    const styles = Object.values(dir.sectionStyles);
    const darkN = styles.filter((s) => s.visualIntensity >= 85).length;
    if (styles.length >= 6 && darkN > Math.ceil(styles.length / 3)) {
      add({ level: "info", title: "어두운 섹션이 많아요", detail: `${darkN}개 섹션이 어두운 배경입니다. 강약이 사라져 답답해 보일 수 있어요.` });
    }
    // 강조 섹션만 이어지면 리듬이 없다
    const loud = styles.filter((s) => s.visualIntensity >= 60).length;
    if (styles.length >= 6 && loud > styles.length * 0.7) {
      add({ level: "info", title: "강조 섹션 비중이 높아요", detail: "조용한 섹션을 섞어야 강조가 살아납니다." });
    }
    // 이미지 위 텍스트 대비
    if (contrastRatio(dir.palette.textPrimary, dir.palette.background) < 7) {
      add({ level: "warn", title: "본문 가독성이 약합니다", detail: "본문 글자와 배경 대비가 7:1 미만입니다." });
    }
  }

  // 9) 예시(DEMO) 리뷰
  const demo = (doc.reviews ?? []).filter((r) => r.source === "demo").length;
  if (demo > 0 && doc.sections.some((s) => s.type === "review")) {
    add({ level: "warn", title: `AI 예시 리뷰 ${demo}개 포함`, detail: "실제 판매용이라면 실제 구매 후기로 교체하세요. 예시 리뷰를 실제 후기처럼 노출하면 안 됩니다." });
  }

  // 10) 섹션 수 / 구성
  if (doc.sections.length < 4) {
    add({ level: "info", title: "섹션이 적어요", detail: "보통 8~16개 섹션이면 구매 결정에 필요한 정보를 담을 수 있습니다." });
  }
  if (!doc.sections.some((s) => s.type === "cta")) {
    add({ level: "info", title: "구매 유도(CTA) 섹션이 없어요", detail: "마지막에 구매를 확신시키는 섹션을 두는 걸 권장합니다." });
  }

  const order: Record<QaLevel, number> = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

export function qaSummary(findings: QaFinding[]) {
  return {
    error: findings.filter((f) => f.level === "error").length,
    warn: findings.filter((f) => f.level === "warn").length,
    info: findings.filter((f) => f.level === "info").length,
  };
}
