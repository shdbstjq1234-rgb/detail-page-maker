# AI DETAIL PAGE MAKER

개인용 AI 상세페이지 제작 웹앱. 상품 사진 한 장 + 정보를 넣으면
**상품 분석 → USP → 타깃 → 구성 → 카피 → 이미지 생성 → 자동 배치 → 웹 편집 → PNG 다운로드**
까지 한 화면에서 끝난다.

## 바로 실행 (설정 0)

```bash
npm install
npm run dev        # http://localhost:3000
```

키·계정 없이 **로컬 모드**로 전 기능이 동작한다.
(AI = 목업 카피, 이미지 = placeholder, 저장 = 브라우저 localStorage)

## 실제 배포 (인터넷 어디서든 로그인해서 사용)

`DEPLOY.md` 순서대로. 요약:

1. **Supabase** 프로젝트 생성 → `supabase/migrations/0001_init.sql` 실행
2. **Vercel** 에 GitHub 저장소 연결 + 환경변수 입력
3. `ALLOWED_EMAIL` 에 내 이메일만 등록 → 나만 로그인 가능

## 모드 전환

| 조건 | 모드 | 로그인 | 저장 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` 없음 | 로컬 | 없음 | localStorage |
| `NEXT_PUBLIC_SUPABASE_URL` 있음 | 클라우드 | Supabase Auth (`ALLOWED_EMAIL` 화이트리스트) | Supabase DB + Storage |

## 실제 AI / 이미지 연결

| 목적 | 환경변수 |
|---|---|
| 상품 분석·카피·프롬프트 (Claude) | `ANTHROPIC_API_KEY`, `LLM_MODEL`(기본 `claude-sonnet-5`) |
| 이미지 생성기 | `IMAGE_PROVIDER` = `nanobanana` \| `higgsfield` \| `mock` (비우면 키 있는 것 자동 선택) |
| **Nano Banana (Google Gemini 2.5 Flash Image)** | `NANOBANANA_API_KEY` = Google AI Studio 키, `NANOBANANA_MODEL`(기본 `gemini-2.5-flash-image`) |
| Higgsfield | `HIGGSFIELD_API_KEY`, `HIGGSFIELD_API_URL` |

### Nano Banana 연결 (3단계)

1. https://aistudio.google.com/apikey → **Create API key** → 키 복사
2. 프로젝트 폴더 `.env` 에 붙여넣기:
   ```
   IMAGE_PROVIDER=nanobanana
   NANOBANANA_API_KEY=붙여넣은_키
   ```
3. `npm run dev` 재시작 → 편집기 상단 배지가 **"Nano Banana (Gemini)"** 로 바뀜

- 상품 누끼컷을 레퍼런스로 넣으면 **제품 형태·색·로고를 그대로 유지**한 연출컷을 만든다 (image-to-image).
- 호출당 1장 → 후보 장수만큼 병렬 호출. 결과는 data URL 로 앱에 바로 들어온다.
- 키가 없으면 자동으로 placeholder(mock)로 전체 흐름이 동작한다.

### AI 이미지 스튜디오 / 이미지 채팅

- **전체 이미지 제작** 버튼 → 스튜디오. `프리셋 그리드` 탭에서 필요한 컷만 ON/OFF 후 "한번에 제작".
- `이미지 채팅` 탭 → 필요한 컷을 쉼표로 나눠 입력하면 (예: `손에 든 히어로 컷, 거리 배경 라이프스타일, 각인 디테일 매크로, 비교 컷`) 컷마다 프롬프트를 따로 만들어 병렬 생성 → 결과를 원하는 섹션에 드롭.

## 구조

```
src/
  app/
    page.tsx                  프로젝트 목록 (새로 만들기 / 편집 / 복제 / 삭제)
    editor/[id]/page.tsx      3단 편집기 (TopBar + Left + Canvas + Right)
    login/page.tsx            개인용 로그인 (Google / 매직링크)
    auth/callback|signout     세션 교환 · 로그아웃
    api/
      generate                상품입력 → 상세페이지 (SSE 스트리밍 파이프라인)
      regenerate-image        섹션 이미지 1~N장 재생성 (Higgsfield/mock)
      analyze-reference       레퍼런스 스크린샷 → 섹션 구조 제안 (Claude Vision)
      projects / projects/[id] / .../duplicate   프로젝트 CRUD (Supabase, RLS)
      upload                  이미지 → Supabase Storage (로컬 모드는 dataURL)
  components/
    editor/                   TopBar · LeftPanel · EditorCanvas · RightPanel · ExportDialog · ui
    detail-page/              Hero/USP/.../CTA 섹션 + Renderer
  ai/                         analyze → usp → plan → copy → imagePrompt → imageGen → select → assemble
  image-providers/            mock · higgsfield · nanoBanana
  lib/
    editor-doc.ts             편집 문서(EditorDoc) 타입 + 팩토리
    store.ts                  프로젝트 저장 (로컬/클라우드 자동 분기)
    export-image.ts           DOM → PNG/JPG, 세로 분할, ZIP
    supabase/                 client · server · config(모드 판정 + 화이트리스트)
supabase/migrations/0001_init.sql   테이블 + RLS + Storage 버킷/정책
middleware.ts                클라우드 모드에서 세션 갱신 + 이메일 게이트
```

## 편집기 기능

- **왼쪽**: 상품정보(상품명·카테고리·판매채널·설명·주요특징·재질·크기·구성품·가격·타깃·톤·추가요청),
  상품사진(드래그 업로드·순서변경·대표지정·삭제), 섹션 목록(추가/삭제/순서), 디자인 레퍼런스 분석
- **가운데**: 실제 상세페이지 세로 Canvas. 섹션 hover → 편집 / AI 이미지 / 복제 / 삭제,
  드래그로 순서 변경, 데스크톱·모바일 미리보기
- **오른쪽**: 선택 섹션의 헤드라인·서브·본문·수치·표 데이터 수정,
  이미지 업로드/교체/AI 생성(후보 2~4장 선택·상품사진 참고), 배경 톤·정렬·여백·헤드라인 크기
- **상단**: ← 프로젝트, 제목, 저장 상태, 데스크톱/모바일, Undo/Redo(⌘Z/⌘⇧Z), 미리보기, 다운로드
- **자동 저장** (0.8초 디바운스), **Export**: 긴 PNG / 긴 JPG / 분할 PNG / 분할+ZIP
