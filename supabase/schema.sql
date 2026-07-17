-- schema.sql (v3) — skema database portfolio Michael95.
-- Idempoten: aman dijalankan ulang di Supabase Dashboard → SQL Editor → Run,
-- baik instalasi baru maupun upgrade dari v1/v2.
--
-- Model keamanan:
--   * OTENTIKASI: Supabase Auth (email + password, bcrypt di server).
--     Akun apa pun boleh login.
--   * OTORISASI: hak tulis HANYA untuk user yang terdaftar di tabel
--     `public.owners` — dicek fungsi is_owner() di dalam kebijakan RLS.
--     Tidak ada email hardcode; kelola pemilik lewat SQL di bawah.
--   * Tabel `owners` TIDAK bisa diubah lewat API (tidak ada kebijakan
--     insert/update/delete) — hanya lewat SQL Editor/dashboard.
--   * CHECK constraint membatasi ukuran/format data — server menolak
--     payload abnormal meskipun JavaScript klien dimanipulasi.
--
-- ── SETELAH MENJALANKAN FILE INI ──────────────────────────────────
-- Jadikan akunmu pemilik (jalankan SEKALI, ganti emailnya):
--
--   insert into public.owners (user_id, note)
--   select id, 'pemilik situs' from auth.users where email = 'emailmu@contoh.com'
--   on conflict (user_id) do nothing;
--
-- Cek hasil:  select u.email from public.owners o join auth.users u on u.id = o.user_id;
-- Cabut akses: delete from public.owners where user_id =
--   (select id from auth.users where email = 'emailmu@contoh.com');
-- ──────────────────────────────────────────────────────────────────

-- ============ PEMILIK ============
create table if not exists public.owners (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.owners enable row level security;

-- User boleh melihat status pemiliknya sendiri; tidak ada kebijakan
-- tulis sama sekali → daftar pemilik kebal dimodifikasi dari API.
drop policy if exists "read own owner row" on public.owners;
create policy "read own owner row"
  on public.owners for select
  to authenticated
  using (user_id = (select auth.uid()));

-- true bila user sesi ini terdaftar sebagai pemilik.
-- security definer agar bisa membaca owners dari dalam kebijakan RLS
-- tabel lain tanpa kebijakan tambahan.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.owners where user_id = auth.uid())
$$;

revoke execute on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated, anon, service_role;

-- ============ ARTIKEL ============
create table if not exists public.articles (
  id        text primary key,
  title     text not null,
  html      text not null default '',
  cover     text not null default '',
  excerpt   text not null default '',
  created   timestamptz not null default now(),
  updated   timestamptz not null default now(),
  published boolean not null default false
);

-- Batas ukuran/format (anti-abuse; longgar untuk pemakaian normal,
-- termasuk gambar base64 di html/cover).
alter table public.articles drop constraint if exists articles_id_format;
alter table public.articles add constraint articles_id_format
  check (id ~ '^[A-Za-z0-9_-]{1,64}$');
alter table public.articles drop constraint if exists articles_title_len;
alter table public.articles add constraint articles_title_len
  check (char_length(title) between 1 and 300);
alter table public.articles drop constraint if exists articles_html_len;
alter table public.articles add constraint articles_html_len
  check (char_length(html) <= 4000000);
alter table public.articles drop constraint if exists articles_cover_len;
alter table public.articles add constraint articles_cover_len
  check (char_length(cover) <= 2000000);
alter table public.articles drop constraint if exists articles_excerpt_len;
alter table public.articles add constraint articles_excerpt_len
  check (char_length(excerpt) <= 1000);

alter table public.articles enable row level security;

drop policy if exists "public read published articles" on public.articles;
drop policy if exists "owner read all articles" on public.articles;
drop policy if exists "owner insert articles" on public.articles;
drop policy if exists "owner update articles" on public.articles;
drop policy if exists "owner delete articles" on public.articles;

-- Pengunjung anonim: hanya artikel terpublikasi.
create policy "public read published articles"
  on public.articles for select
  to anon
  using (published = true);

-- User login: artikel terpublikasi; pemilik: semua (termasuk draft).
create policy "owner read all articles"
  on public.articles for select
  to authenticated
  using (published = true or (select public.is_owner()));

create policy "owner insert articles"
  on public.articles for insert
  to authenticated
  with check ((select public.is_owner()));

create policy "owner update articles"
  on public.articles for update
  to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

create policy "owner delete articles"
  on public.articles for delete
  to authenticated
  using ((select public.is_owner()));

-- ============ DOKUMEN SITUS (daftar project, dsb.) ============
create table if not exists public.site_documents (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_documents drop constraint if exists site_documents_key_allowlist;
alter table public.site_documents add constraint site_documents_key_allowlist
  check (key in ('projects'));
alter table public.site_documents drop constraint if exists site_documents_value_size;
alter table public.site_documents add constraint site_documents_value_size
  check (octet_length(value::text) <= 262144);

alter table public.site_documents enable row level security;

drop policy if exists "public read site documents" on public.site_documents;
drop policy if exists "owner write site documents" on public.site_documents;
drop policy if exists "owner update site documents" on public.site_documents;
drop policy if exists "owner delete site documents" on public.site_documents;

create policy "public read site documents"
  on public.site_documents for select
  to anon, authenticated
  using (true);

create policy "owner write site documents"
  on public.site_documents for insert
  to authenticated
  with check ((select public.is_owner()));

create policy "owner update site documents"
  on public.site_documents for update
  to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

create policy "owner delete site documents"
  on public.site_documents for delete
  to authenticated
  using ((select public.is_owner()));

-- ============ STORAGE GAMBAR ============
-- Bucket `images`: gambar artikel & cover. Klien sudah mengompres ke WebP
-- sebelum upload; batas server tetap dipasang sebagai penegak akhir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images', 'images', true,
  5242880, -- 5MB per file
  array['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Baca publik; tulis/ubah/hapus hanya pemilik.
drop policy if exists "public read images" on storage.objects;
create policy "public read images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'images');

drop policy if exists "owner upload images" on storage.objects;
create policy "owner upload images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'images' and (select public.is_owner()));

drop policy if exists "owner update images" on storage.objects;
create policy "owner update images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'images' and (select public.is_owner()))
  with check (bucket_id = 'images' and (select public.is_owner()));

drop policy if exists "owner delete images" on storage.objects;
create policy "owner delete images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'images' and (select public.is_owner()));
