# 배포 가이드 — 내 웹주소로 접속해서 쓰기

이 앱은 **아무 설정 없이도 바로 실행**됩니다(로컬 모드).
인터넷 어디서든 접속하려면 아래 순서대로 하면 됩니다. (30~40분)

전문 용어는 몰라도 됩니다. 순서대로 클릭만 하세요.

---

## STEP 1 — Supabase 프로젝트 만들기 (로그인 + 저장소)

1. https://supabase.com 접속 → **Start your project** → GitHub 또는 이메일로 가입
2. **New project** 클릭
   - Name: `detail-page-maker` (아무거나)
   - Database Password: 아무 비밀번호 입력 후 **어딘가에 저장** (안 써도 되지만 분실 주의)
   - Region: `Northeast Asia (Seoul)` 선택
   - **Create new project** 클릭 → 1~2분 대기

3. 왼쪽 메뉴 **SQL Editor** → **New query** →
   이 저장소의 `supabase/migrations/0001_init.sql` 파일 내용을 **전체 복사해서 붙여넣기** → **Run**
   (초록색 Success 나오면 성공. 테이블 · 보안 규칙 · 이미지 저장소가 한 번에 만들어집니다.)

4. 왼쪽 메뉴 **Project Settings**(톱니바퀴) → **API** 로 이동. 이 3개를 메모장에 복사:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** 키 (`eyJhbG...` 로 시작하는 긴 문자열)

---

## STEP 2 — Google 로그인 켜기 (이메일 로그인만 쓸 거면 건너뛰기)

1. Supabase 왼쪽 메뉴 **Authentication** → **Sign In / Providers** → **Google** 을 켜기(Enable)
2. 안내에 나오는 대로 Google Cloud 콘솔에서 OAuth 클라이언트를 만들고
   - **Client ID / Client Secret** 을 Supabase Google 설정에 붙여넣기
   - Google 쪽 **승인된 리디렉션 URI** 에 Supabase가 보여주는 주소
     (`https://xxxx.supabase.co/auth/v1/callback`) 를 그대로 추가
3. 저장

> 번거로우면 이 STEP은 건너뛰어도 됩니다. 로그인 화면의 **“이메일로 로그인 링크 받기”** 로 바로 로그인할 수 있습니다.

---

## STEP 3 — GitHub에 코드 올리기

1. https://github.com 에서 **New repository** → 이름 아무거나 → **Private** → Create
2. 이 폴더에서 터미널을 열고 아래를 순서대로 실행 (한 줄씩):

```bash
git init
git add -A
git commit -m "AI Detail Page Maker"
git branch -M main
git remote add origin https://github.com/<내아이디>/<저장소이름>.git
git push -u origin main
```

---

## STEP 4 — Vercel에 배포하기

1. https://vercel.com → **Sign Up** → GitHub로 로그인
2. **Add New… → Project** → 방금 만든 GitHub 저장소 **Import**
3. **Environment Variables** 에 아래를 입력 (Key = Value):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | STEP 1에서 복사한 Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | STEP 1에서 복사한 anon public 키 |
| `ALLOWED_EMAIL` | 내가 로그인할 이메일 주소 (예: `me@gmail.com`) |
| `ANTHROPIC_API_KEY` | (선택) Claude API 키 — 없으면 목업으로 동작 |
| `LLM_MODEL` | (선택) `claude-sonnet-5` |
| `IMAGE_PROVIDER` | (선택) `higgsfield` 로 두면 Higgsfield 사용 |
| `HIGGSFIELD_API_KEY` | (선택) Higgsfield 키 |

4. **Deploy** 클릭 → 2~3분 후 `https://<프로젝트명>.vercel.app` 주소가 나옵니다.

---

## STEP 5 — 로그인 리디렉트 주소 등록

1. Supabase → **Authentication** → **URL Configuration**
   - **Site URL**: `https://<프로젝트명>.vercel.app`
   - **Redirect URLs** 에 추가: `https://<프로젝트명>.vercel.app/auth/callback`
2. 저장

---

## 끝 — 사용하기

1. 휴대폰이든 노트북이든 브라우저에서 `https://<프로젝트명>.vercel.app` 접속
2. `ALLOWED_EMAIL` 에 넣은 이메일로 로그인
3. **새 상세페이지 만들기** → 상품 사진 올리고 정보 입력 → **AI 상세페이지 만들기**
4. 가운데에서 바로 수정 → 오른쪽에서 텍스트 · 이미지 교체 → **다운로드**로 PNG 저장

---

## 개인 도메인 연결 (나중에)

Vercel → 프로젝트 → **Settings → Domains** 에 내 도메인을 입력하고
안내대로 DNS(CNAME) 레코드만 추가하면 됩니다.
그 후 STEP 5의 두 주소도 새 도메인으로 바꿔 주세요.

---

## 자주 묻는 것

- **API 키가 없어도 되나요?** 네. `ANTHROPIC_API_KEY` 와 `HIGGSFIELD_API_KEY` 가 없으면
  자동으로 목업(가짜 데이터 + placeholder 이미지)으로 전체 흐름이 동작합니다.
  실제 카피/이미지를 원하면 키를 채우세요.
- **나만 쓸 수 있나요?** 네. `ALLOWED_EMAIL` 에 있는 이메일만 로그인·접근 가능합니다.
  Supabase RLS로 DB·이미지도 본인 것만 접근됩니다.
- **비용은?** Supabase·Vercel 무료 요금제로 개인 사용은 충분합니다.
  Claude·Higgsfield는 사용량만큼 각 서비스에서 과금됩니다.
