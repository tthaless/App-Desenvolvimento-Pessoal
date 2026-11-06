-- =============================================================
-- 03 — Feed: posts, comentários e curtidas que somem em 24h
-- Rode uma vez no SQL Editor (pode rodar de novo sem problema).
-- =============================================================

-- ---------- Tabelas ----------
create table if not exists public.feed_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text check (char_length(body) between 1 and 280),
  photo_path text,
  created_at timestamptz not null default now(),
  check (body is not null or photo_path is not null)
);
create index if not exists feed_posts_created on public.feed_posts (created_at desc);
create index if not exists feed_posts_user on public.feed_posts (user_id, created_at desc);

create table if not exists public.feed_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.feed_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text check (char_length(body) between 1 and 280),
  photo_path text,
  created_at timestamptz not null default now(),
  check (body is not null or photo_path is not null)
);
create index if not exists feed_comments_post on public.feed_comments (post_id, created_at);

create table if not exists public.feed_post_likes (
  post_id    uuid not null references public.feed_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.feed_comment_likes (
  comment_id uuid not null references public.feed_comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ---------- Autor e horário sempre vêm do servidor ----------
create or replace function public.feed_set_server_fields()
returns trigger language plpgsql as $$
begin
  new.user_id    := auth.uid();
  new.created_at := now();
  return new;
end $$;

drop trigger if exists feed_posts_server_fields on public.feed_posts;
create trigger feed_posts_server_fields before insert on public.feed_posts
  for each row execute function public.feed_set_server_fields();
drop trigger if exists feed_comments_server_fields on public.feed_comments;
create trigger feed_comments_server_fields before insert on public.feed_comments
  for each row execute function public.feed_set_server_fields();
drop trigger if exists feed_post_likes_server_fields on public.feed_post_likes;
create trigger feed_post_likes_server_fields before insert on public.feed_post_likes
  for each row execute function public.feed_set_server_fields();
drop trigger if exists feed_comment_likes_server_fields on public.feed_comment_likes;
create trigger feed_comment_likes_server_fields before insert on public.feed_comment_likes
  for each row execute function public.feed_set_server_fields();

-- ---------- Regras de acesso ----------
-- Post com mais de 24h fica invisível na hora, mesmo antes da limpeza apagar.
create or replace function public.feed_post_visible(pid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.feed_posts
    where id = pid and created_at > now() - interval '24 hours'
  );
$$;

alter table public.feed_posts enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_post_likes enable row level security;
alter table public.feed_comment_likes enable row level security;

drop policy if exists "membros veem posts recentes" on public.feed_posts;
create policy "membros veem posts recentes" on public.feed_posts
  for select to authenticated using (created_at > now() - interval '24 hours');
drop policy if exists "cada um publica o seu post" on public.feed_posts;
create policy "cada um publica o seu post" on public.feed_posts
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "cada um apaga o seu post" on public.feed_posts;
create policy "cada um apaga o seu post" on public.feed_posts
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "membros veem comentarios" on public.feed_comments;
create policy "membros veem comentarios" on public.feed_comments
  for select to authenticated using (public.feed_post_visible(post_id));
drop policy if exists "cada um comenta" on public.feed_comments;
create policy "cada um comenta" on public.feed_comments
  for insert to authenticated with check (user_id = auth.uid() and public.feed_post_visible(post_id));
drop policy if exists "cada um apaga o seu comentario" on public.feed_comments;
create policy "cada um apaga o seu comentario" on public.feed_comments
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "membros veem curtidas de posts" on public.feed_post_likes;
create policy "membros veem curtidas de posts" on public.feed_post_likes
  for select to authenticated using (public.feed_post_visible(post_id));
drop policy if exists "cada um curte posts" on public.feed_post_likes;
create policy "cada um curte posts" on public.feed_post_likes
  for insert to authenticated with check (user_id = auth.uid() and public.feed_post_visible(post_id));
drop policy if exists "cada um descurte posts" on public.feed_post_likes;
create policy "cada um descurte posts" on public.feed_post_likes
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "membros veem curtidas de comentarios" on public.feed_comment_likes;
create policy "membros veem curtidas de comentarios" on public.feed_comment_likes
  for select to authenticated
  using (exists (select 1 from public.feed_comments c where c.id = comment_id));
drop policy if exists "cada um curte comentarios" on public.feed_comment_likes;
create policy "cada um curte comentarios" on public.feed_comment_likes
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.feed_comments c where c.id = comment_id));
drop policy if exists "cada um descurte comentarios" on public.feed_comment_likes;
create policy "cada um descurte comentarios" on public.feed_comment_likes
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, delete on public.feed_posts, public.feed_comments,
  public.feed_post_likes, public.feed_comment_likes to authenticated;
grant execute on function public.feed_post_visible(uuid) to authenticated;

-- ---------- Tempo real ----------
do $$
declare t text;
begin
  foreach t in array array['feed_posts', 'feed_comments', 'feed_post_likes', 'feed_comment_likes'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------- Limpeza automática ----------
-- A cada hora apaga posts com mais de 24h (comentários e curtidas vão junto).
-- Os arquivos das fotos são apagados pelo próprio app de cada pessoa.
create extension if not exists pg_cron;
select cron.schedule(
  'limpar-feed',
  '17 * * * *',
  $$delete from public.feed_posts where created_at < now() - interval '24 hours'$$
);
