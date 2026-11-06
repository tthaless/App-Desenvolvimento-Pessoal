-- Confere se o banco está igual ao schema.sql + 03-feed.sql.
-- Rode no SQL Editor: todas as linhas devem mostrar "ok".
with checks(item, ok) as (
  select 'colunas de app_config',
    (select string_agg(column_name, ',' order by ordinal_position)
       from information_schema.columns where table_schema = 'public' and table_name = 'app_config')
    = 'key,value'
  union all select 'colunas de profiles',
    (select string_agg(column_name, ',' order by ordinal_position)
       from information_schema.columns where table_schema = 'public' and table_name = 'profiles')
    = 'id,username,created_at,avatar_path,bio,current_book,exercises'
  union all select 'colunas de posts',
    (select string_agg(column_name, ',' order by ordinal_position)
       from information_schema.columns where table_schema = 'public' and table_name = 'posts')
    = 'id,user_id,activity,photo_path,caption,day,created_at'
  union all select 'nenhuma tabela a mais ou a menos',
    (select count(*) from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE') = 7
  union all select 'proteção por linha (RLS) ligada',
    (select bool_and(relrowsecurity) from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r')
  union all select 'regras de acesso das tabelas',
    (select count(*) from pg_policies where schemaname = 'public') = 17
  union all select 'regras de acesso das fotos',
    (select count(*) from pg_policies
       where schemaname = 'storage' and tablename = 'objects'
         and policyname in ('membros veem fotos', 'cada um envia na sua pasta', 'cada um apaga da sua pasta')) = 3
  union all select 'funções (streaks, ranking, cadastro, data)',
    (select count(*) from pg_proc
       where pronamespace = 'public'::regnamespace
         and proname in ('streaks', 'ranking', 'handle_new_user', 'posts_set_server_fields')) = 4
  union all select 'cadastro exige código de convite',
    exists (select 1 from pg_trigger where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass)
  union all select 'data da prova vem do servidor',
    exists (select 1 from pg_trigger where tgname = 'posts_set_server_fields' and tgrelid = 'public.posts'::regclass)
  union all select 'pontos contam uma vez por atividade por dia',
    pg_get_functiondef('public.ranking(text)'::regprocedure) like '%count(distinct p.activity)%'
  union all select 'pasta de fotos (bucket provas)',
    exists (select 1 from storage.buckets where id = 'provas')
  union all select 'código de convite definido',
    exists (select 1 from public.app_config where key = 'invite_code')
  union all select 'stories e feed em tempo real',
    (select count(*) from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public'
         and tablename in ('posts', 'feed_posts', 'feed_comments', 'feed_post_likes', 'feed_comment_likes')) = 5
  union all select 'feed some depois de 24h',
    exists (select 1 from pg_policies
       where tablename = 'feed_posts' and cmd = 'SELECT' and qual like '%24:00:00%')
  union all select 'limpeza automática do feed agendada',
    exists (select 1 from cron.job where jobname = 'limpar-feed')
)
select item, case when ok then 'ok' else 'DIFERENTE' end as status
from checks;
