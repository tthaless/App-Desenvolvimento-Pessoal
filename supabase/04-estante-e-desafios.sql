-- =============================================================
-- 04 — Estante de livros e desafios da semana com votação
-- Rode uma vez no SQL Editor, depois do 03-feed.sql.
-- =============================================================

-- =================== ESTANTE ===================

create table if not exists public.books (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  author       text check (char_length(author) <= 80),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  abandoned_at timestamptz,
  rating       numeric(3,1) check (rating between 1 and 10),
  review       text check (char_length(review) <= 500),
  check (finished_at is null or abandoned_at is null),
  check (finished_at is null or rating is not null)
);
-- Só um livro em andamento por pessoa.
create unique index if not exists books_one_current on public.books (user_id)
  where finished_at is null and abandoned_at is null;
create index if not exists books_user_finished on public.books (user_id, finished_at desc);

-- Livro novo sempre começa agora, em andamento, no nome de quem cadastrou.
create or replace function public.books_set_server_fields()
returns trigger language plpgsql as $$
begin
  new.user_id      := coalesce(auth.uid(), new.user_id);
  new.started_at   := now();
  new.finished_at  := null;
  new.abandoned_at := null;
  new.rating       := null;
  new.review       := null;
  return new;
end $$;

drop trigger if exists books_server_fields on public.books;
create trigger books_server_fields before insert on public.books
  for each row execute function public.books_set_server_fields();

alter table public.books enable row level security;
drop policy if exists "membros veem livros" on public.books;
create policy "membros veem livros" on public.books
  for select to authenticated using (true);
drop policy if exists "cada um começa o seu livro" on public.books;
create policy "cada um começa o seu livro" on public.books
  for insert to authenticated with check (user_id = auth.uid());
grant select, insert on public.books to authenticated;

-- Terminar: vai pra estante com nota e comentário, e vira post no feed.
create or replace function public.finish_book(book uuid, nota numeric, comentario text)
returns void language plpgsql security definer set search_path = public as $$
declare
  titulo text;
  texto  text := nullif(trim(comentario), '');
begin
  update books
     set finished_at = now(), rating = round(nota, 1), review = texto
   where id = book and user_id = auth.uid() and finished_at is null and abandoned_at is null
  returning title into titulo;
  if titulo is null then
    raise exception 'Livro não encontrado ou já encerrado';
  end if;
  insert into feed_posts (body)
  values (left(
    format('📚 Terminei de ler "%s" · nota %s/10', titulo, replace(trim_scale(round(nota, 1))::text, '.', ','))
    || coalesce(E'\n\n' || texto, ''),
    280));
end $$;

create or replace function public.abandon_book(book uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update books set abandoned_at = now()
   where id = book and user_id = auth.uid() and finished_at is null and abandoned_at is null;
  if not found then
    raise exception 'Livro não encontrado ou já encerrado';
  end if;
end $$;

grant execute on function public.finish_book(uuid, numeric, text) to authenticated;
grant execute on function public.abandon_book(uuid) to authenticated;

-- Provas de leitura ficam ligadas ao livro em andamento.
alter table public.posts add column if not exists book_id uuid references public.books(id) on delete set null;

create or replace function public.posts_set_server_fields()
returns trigger language plpgsql as $$
begin
  new.user_id    := auth.uid();
  new.created_at := now();
  new.day        := (now() at time zone 'America/Sao_Paulo')::date;
  new.book_id    := case when new.activity = 'leitura' then (
    select id from public.books
     where user_id = auth.uid() and finished_at is null and abandoned_at is null
  ) end;
  return new;
end $$;

-- O "livro atual" que já estava no perfil vira o primeiro livro em andamento.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'current_book') then
    insert into public.books (user_id, title)
    select p.id, p.current_book from public.profiles p
     where p.current_book is not null
       and not exists (select 1 from public.books b
                        where b.user_id = p.id and b.finished_at is null and b.abandoned_at is null);
    alter table public.profiles drop column current_book;
  end if;
end $$;

-- =================== DESAFIOS ===================
-- Semana = segunda a domingo, no fuso de São Paulo.
-- Durante a semana, propõe-se e vota-se em ideias para a semana seguinte.
-- Na segunda, a ideia mais votada (empate: quem propôs primeiro) vira o desafio.

create or replace function public.week_start(d date)
returns date language sql immutable as $$
  select (d - (extract(isodow from d)::int - 1))
$$;

create or replace function public.sp_today()
returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

create table if not exists public.challenge_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  week        date not null,
  title       text not null check (char_length(title) between 3 and 80),
  description text check (char_length(description) <= 280),
  created_at  timestamptz not null default now()
);
create index if not exists challenge_ideas_week on public.challenge_ideas (week, created_at);

create table if not exists public.challenge_votes (
  week       date not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  idea_id    uuid not null references public.challenge_ideas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (week, user_id)
);

create table if not exists public.challenge_checkins (
  idea_id    uuid not null references public.challenge_ideas(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        date not null,
  photo_path text not null,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id, day)
);
create index if not exists challenge_checkins_created on public.challenge_checkins (created_at desc);

-- Ideia nova é sempre para a próxima semana.
create or replace function public.challenge_ideas_server_fields()
returns trigger language plpgsql as $$
begin
  new.user_id    := coalesce(auth.uid(), new.user_id);
  new.created_at := now();
  new.week       := public.week_start(public.sp_today()) + 7;
  return new;
end $$;
drop trigger if exists challenge_ideas_server_fields on public.challenge_ideas;
create trigger challenge_ideas_server_fields before insert on public.challenge_ideas
  for each row execute function public.challenge_ideas_server_fields();

-- Voto: só em ideia da votação aberta, e não na própria.
create or replace function public.challenge_votes_server_fields()
returns trigger language plpgsql as $$
declare idea public.challenge_ideas;
begin
  select * into idea from public.challenge_ideas where id = new.idea_id;
  if idea.id is null or idea.week <> public.week_start(public.sp_today()) + 7 then
    raise exception 'A votação dessa ideia não está aberta';
  end if;
  if idea.user_id = auth.uid() then
    raise exception 'Não dá pra votar na própria ideia';
  end if;
  new.user_id    := auth.uid();
  new.week       := idea.week;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists challenge_votes_server_fields on public.challenge_votes;
create trigger challenge_votes_server_fields before insert on public.challenge_votes
  for each row execute function public.challenge_votes_server_fields();

-- Desafio da semana atual (zero ou uma linha).
create or replace function public.active_challenge()
returns table (id uuid, user_id uuid, title text, description text, week date, votes int)
language sql stable as $$
  select i.id, i.user_id, i.title, i.description, i.week, count(v.user_id)::int
  from public.challenge_ideas i
  left join public.challenge_votes v on v.idea_id = i.id
  where i.week = public.week_start(public.sp_today())
  group by i.id
  order by count(v.user_id) desc, i.created_at asc
  limit 1;
$$;

-- Cumprir o desafio: só o desafio vigente, só no dia de hoje.
create or replace function public.challenge_checkins_server_fields()
returns trigger language plpgsql as $$
begin
  if new.idea_id is distinct from (select id from public.active_challenge()) then
    raise exception 'Esse não é o desafio desta semana';
  end if;
  new.user_id    := auth.uid();
  new.day        := public.sp_today();
  new.created_at := now();
  return new;
end $$;
drop trigger if exists challenge_checkins_server_fields on public.challenge_checkins;
create trigger challenge_checkins_server_fields before insert on public.challenge_checkins
  for each row execute function public.challenge_checkins_server_fields();

-- Trocar o voto de uma vez só.
create or replace function public.vote_challenge(idea uuid)
returns void language plpgsql as $$
begin
  delete from public.challenge_votes
   where user_id = auth.uid() and week = public.week_start(public.sp_today()) + 7;
  insert into public.challenge_votes (idea_id) values (idea);
end $$;

alter table public.challenge_ideas enable row level security;
alter table public.challenge_votes enable row level security;
alter table public.challenge_checkins enable row level security;

drop policy if exists "membros veem ideias" on public.challenge_ideas;
create policy "membros veem ideias" on public.challenge_ideas
  for select to authenticated using (true);
drop policy if exists "cada um propõe" on public.challenge_ideas;
create policy "cada um propõe" on public.challenge_ideas
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "cada um apaga a sua ideia em votação" on public.challenge_ideas;
create policy "cada um apaga a sua ideia em votação" on public.challenge_ideas
  for delete to authenticated
  using (user_id = auth.uid() and week > public.week_start(public.sp_today()));

drop policy if exists "membros veem votos" on public.challenge_votes;
create policy "membros veem votos" on public.challenge_votes
  for select to authenticated using (true);
drop policy if exists "cada um vota" on public.challenge_votes;
create policy "cada um vota" on public.challenge_votes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "cada um tira o seu voto" on public.challenge_votes;
create policy "cada um tira o seu voto" on public.challenge_votes
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "membros veem check-ins" on public.challenge_checkins;
create policy "membros veem check-ins" on public.challenge_checkins
  for select to authenticated using (true);
drop policy if exists "cada um cumpre o desafio" on public.challenge_checkins;
create policy "cada um cumpre o desafio" on public.challenge_checkins
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "cada um apaga o seu check-in" on public.challenge_checkins;
create policy "cada um apaga o seu check-in" on public.challenge_checkins
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, delete on public.challenge_ideas, public.challenge_votes,
  public.challenge_checkins to authenticated;
grant execute on function public.active_challenge(), public.vote_challenge(uuid),
  public.week_start(date), public.sp_today() to authenticated;

-- Tempo real
do $$
declare t text;
begin
  foreach t in array array['books', 'challenge_ideas', 'challenge_votes', 'challenge_checkins'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- =================== RANKING ===================
-- Provas: 10 por atividade no dia, +5 se fez as duas.
-- Desafio: +30 por cumprir 5 dos 7 dias, +40 por cumprir os 7.
create or replace function public.ranking(periodo text)
returns table (user_id uuid, username text, pontos int, dias int)
language sql stable as $$
  with inicio as (
    select case when periodo = 'mes'
                then date_trunc('month', public.sp_today())::date
                else public.week_start(public.sp_today()) end as d
  ), por_dia as (
    select p.user_id, p.day, count(distinct p.activity)::int as n
    from public.posts p, inicio i
    where p.day >= i.d
    group by p.user_id, p.day
  ), provas as (
    select user_id, sum(n * 10 + case when n = 2 then 5 else 0 end)::int as pts, count(*)::int as dias
    from por_dia group by user_id
  ), semanas as (
    select c.user_id, c.idea_id, count(*)::int as n
    from public.challenge_checkins c
    join public.challenge_ideas ci on ci.id = c.idea_id, inicio i
    where ci.week >= i.d
    group by c.user_id, c.idea_id
  ), bonus as (
    select user_id, sum(case when n >= 7 then 40 when n >= 5 then 30 else 0 end)::int as pts
    from semanas group by user_id
  )
  select pr.id, pr.username,
         (coalesce(pv.pts, 0) + coalesce(b.pts, 0))::int as pontos,
         coalesce(pv.dias, 0)::int as dias
  from public.profiles pr
  left join provas pv on pv.user_id = pr.id
  left join bonus b on b.user_id = pr.id
  order by pontos desc, dias desc, pr.username;
$$;
