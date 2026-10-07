-- Ferramenta de QR Code dinâmico (projeto do aluno).
-- A imagem do QR guarda /q/{slug}. O destination_url pode mudar depois.
-- Seguro rodar mais de uma vez num banco vazio ou já migrado.

create table if not exists public.qr_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique,
  title text not null,
  destination_url text not null,
  is_active boolean not null default true,
  click_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint qr_links_destination_http check (destination_url ~* '^https?://')
);

create unique index if not exists qr_links_slug_idx on public.qr_links (slug);
create index if not exists qr_links_user_idx on public.qr_links (user_id, created_at desc);

alter table public.qr_links enable row level security;

drop policy if exists "cada pessoa vê os próprios qr" on public.qr_links;
drop policy if exists "cada pessoa cria os próprios qr" on public.qr_links;
drop policy if exists "cada pessoa edita os próprios qr" on public.qr_links;
drop policy if exists "cada pessoa exclui os próprios qr" on public.qr_links;

-- Sem estas policies, a chave anônima não lê nem grava nada:
-- RLS ligado e zero policies bloqueia todo mundo, menos a service role.
create policy "cada pessoa vê os próprios qr"
  on public.qr_links for select to authenticated
  using (auth.uid() = user_id);

create policy "cada pessoa cria os próprios qr"
  on public.qr_links for insert to authenticated
  with check (auth.uid() = user_id);

create policy "cada pessoa edita os próprios qr"
  on public.qr_links for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cada pessoa exclui os próprios qr"
  on public.qr_links for delete to authenticated
  using (auth.uid() = user_id);

-- Um único update no banco. Dois scans ao mesmo tempo não se apagam.
create or replace function public.increment_qr_click(link_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.qr_links
  set click_count = click_count + 1
  where id = link_id
    and is_active = true;
$$;

revoke all on function public.increment_qr_click(uuid) from public;
revoke all on function public.increment_qr_click(uuid) from anon;
revoke all on function public.increment_qr_click(uuid) from authenticated;
grant execute on function public.increment_qr_click(uuid) to service_role;

notify pgrst, 'reload schema';
