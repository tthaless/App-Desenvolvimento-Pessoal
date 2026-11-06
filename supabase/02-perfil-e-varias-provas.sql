-- =============================================================
-- 02 — Perfil completo e várias provas por dia
-- Rode uma vez no SQL Editor, em bancos criados com o schema antigo.
-- (Quem for criar o banco do zero só precisa do schema.sql.)
-- =============================================================

-- Pode postar quantas fotos quiser por dia.
alter table public.posts drop constraint if exists posts_user_id_activity_day_key;
create index if not exists posts_user_activity_day on public.posts (user_id, activity, day);

-- Perfil: foto, descrição, livro atual e exercícios.
alter table public.profiles
  add column if not exists avatar_path  text,
  add column if not exists bio          text check (char_length(bio) <= 160),
  add column if not exists current_book text check (char_length(current_book) <= 120),
  add column if not exists exercises    text check (char_length(exercises) <= 200);

-- Pontos contam uma vez por atividade por dia, mesmo com várias fotos.
create or replace function public.ranking(periodo text)
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
    select p.user_id, p.day, count(distinct p.activity)::int as n
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
