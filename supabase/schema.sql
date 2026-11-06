-- =============================================================
-- Streak — banco de dados
-- Cole tudo isto em: Supabase > SQL Editor > New query > Run
-- Depois troque o código de convite no final do arquivo.
-- =============================================================

-- ---------- Configuração privada (código de convite) ----------
create table public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;
-- Sem políticas: ninguém lê esta tabela pelo app, só o próprio banco.

-- ---------- Perfis ----------
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  username   text unique not null check (char_length(username) between 2 and 20),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "membros veem perfis" on public.profiles
  for select to authenticated using (true);
create policy "cada um edita o seu perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Cria o perfil no cadastro e barra quem não tem o código de convite.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data->>'invite_code', '') <>
     (select value from public.app_config where key = 'invite_code') then
    raise exception 'Código de convite inválido';
  end if;
  insert into public.profiles (id, username)
  values (new.id, trim(new.raw_user_meta_data->>'username'));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Provas (posts) ----------
create type public.activity as enum ('exercicio', 'leitura');

create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  activity   public.activity not null,
  photo_path text not null,
  caption    text check (char_length(caption) <= 140),
  day        date not null,
  created_at timestamptz not null default now(),
  unique (user_id, activity, day)   -- uma prova por atividade por dia
);
create index posts_activity_created on public.posts (activity, created_at desc);
alter table public.posts enable row level security;

-- O dia e o horário vêm sempre do servidor (fuso de São Paulo),
-- então ninguém consegue postar "ontem" para salvar o streak.
create function public.posts_set_server_fields()
returns trigger language plpgsql as $$
begin
  new.user_id    := auth.uid();
  new.created_at := now();
  new.day        := (now() at time zone 'America/Sao_Paulo')::date;
  return new;
end $$;

create trigger posts_set_server_fields
  before insert on public.posts
  for each row execute function public.posts_set_server_fields();

create policy "membros veem provas" on public.posts
  for select to authenticated using (true);
create policy "cada um posta a sua prova" on public.posts
  for insert to authenticated with check (user_id = auth.uid());
create policy "cada um apaga a sua prova" on public.posts
  for delete to authenticated using (user_id = auth.uid());

-- Atualização em tempo real dos stories.
alter publication supabase_realtime add table public.posts;

-- ---------- Streaks ----------
-- Streak atual: sequência de dias seguidos que termina hoje ou ontem
-- (se você ainda não postou hoje, o streak continua vivo até meia-noite).
create function public.streaks()
returns table (user_id uuid, activity public.activity, current_streak int, best_streak int)
language sql stable as $$
  with dias as (
    select distinct p.user_id, p.activity, p.day from public.posts p
  ), grupos as (
    select user_id, activity, day,
           day - (row_number() over (partition by user_id, activity order by day))::int as grp
    from dias
  ), sequencias as (
    select user_id, activity, count(*)::int as len, max(day) as ultimo_dia
    from grupos group by user_id, activity, grp
  )
  select s.user_id, s.activity,
         coalesce(max(s.len) filter (
           where s.ultimo_dia >= (now() at time zone 'America/Sao_Paulo')::date - 1
         ), 0)::int as current_streak,
         max(s.len)::int as best_streak
  from sequencias s
  group by s.user_id, s.activity;
$$;

-- ---------- Ranking ----------
-- 10 pontos por prova, +5 de bônus no dia em que faz as duas atividades.
-- periodo: 'semana' (começa na segunda) ou 'mes'.
create function public.ranking(periodo text)
returns table (user_id uuid, username text, pontos int, dias int)
language sql stable as $$
  with hoje as (
    select (now() at time zone 'America/Sao_Paulo')::date as d
  ), inicio as (
    select case when periodo = 'mes'
                then date_trunc('month', d)::date
                else date_trunc('week', d)::date end as d
    from hoje
  ), por_dia as (
    select p.user_id, p.day, count(*)::int as n
    from public.posts p, inicio i
    where p.day >= i.d
    group by p.user_id, p.day
  )
  select pr.id, pr.username,
         coalesce(sum(pd.n * 10 + case when pd.n = 2 then 5 else 0 end), 0)::int as pontos,
         count(pd.day)::int as dias
  from public.profiles pr
  left join por_dia pd on pd.user_id = pr.id
  group by pr.id, pr.username
  order by pontos desc, dias desc, pr.username;
$$;

-- ---------- Fotos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('provas', 'provas', false, 2097152, array['image/jpeg']);

create policy "membros veem fotos" on storage.objects
  for select to authenticated using (bucket_id = 'provas');
create policy "cada um envia na sua pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'provas' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cada um apaga da sua pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'provas' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- TROQUE O CÓDIGO DE CONVITE ----------
insert into public.app_config (key, value) values ('invite_code', 'TROQUE-ESTE-CODIGO');
