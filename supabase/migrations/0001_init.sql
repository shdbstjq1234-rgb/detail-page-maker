-- ============================================================================
-- AI DETAIL PAGE MAKER — 초기 스키마
-- Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 RUN.
-- ============================================================================

-- 1. projects 테이블 --------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null default '제목 없음',
  cover_image text,
  doc         jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_user_updated_idx
  on public.projects (user_id, updated_at desc);

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- 2. RLS: 본인 행만 --------------------------------------------------------
alter table public.projects enable row level security;

drop policy if exists "own rows select" on public.projects;
create policy "own rows select" on public.projects
  for select using (auth.uid() = user_id);

drop policy if exists "own rows insert" on public.projects;
create policy "own rows insert" on public.projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows update" on public.projects;
create policy "own rows update" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows delete" on public.projects;
create policy "own rows delete" on public.projects
  for delete using (auth.uid() = user_id);

-- 3. Storage 버킷 (이미지 원본 + AI 생성) ---------------------------------
insert into storage.buckets (id, name, public)
values ('project-media', 'project-media', true)
on conflict (id) do nothing;

-- 공개 읽기
drop policy if exists "public read project-media" on storage.objects;
create policy "public read project-media" on storage.objects
  for select using (bucket_id = 'project-media');

-- 로그인 사용자는 자기 폴더(projects/<uid>/...)에만 쓰기
drop policy if exists "own folder write project-media" on storage.objects;
create policy "own folder write project-media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = 'projects'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "own folder delete project-media" on storage.objects;
create policy "own folder delete project-media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = 'projects'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
