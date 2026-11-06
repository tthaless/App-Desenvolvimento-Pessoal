# Streak

App fechado para um grupo de amigos manter a constância em desenvolvimento pessoal.

## Ideia

- **Abas de atividade**: Exercício e Leitura.
- **Prova do dia**: cada pessoa posta uma foto (tirada na hora pela câmera) comprovando a atividade.
- **Stories de 24h**: as fotos ficam visíveis para o grupo por 24 horas e depois somem.
- **Streak**: contador de dias seguidos sem faltar, por atividade.
- **Ranking**: pontos e vencedor da semana e do mês.
- **Grupo fechado**: entrada só com código de convite.

## Stack (custo zero)

- **Frontend**: React + TypeScript + Vite, como PWA (instala na tela do celular, sem App Store).
- **Backend**: [Supabase](https://supabase.com) plano gratuito (login, banco Postgres, armazenamento de fotos, tempo real).
- **Hospedagem**: Vercel, Netlify ou Cloudflare Pages (gratuitos).

## Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (região **South America (São Paulo)**).
2. Abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Troque o código de convite (é ele que você passa para os amigos):
   ```sql
   update app_config set value = 'SEU-CODIGO' where key = 'invite_code';
   ```
4. Opcional: em **Authentication → Sign In / Providers → Email**, desligue **Confirm email** para o cadastro entrar direto, sem precisar clicar no link do email.
5. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** para o arquivo `.env`.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com as chaves do passo 5
npm run dev
```

## Regras

- **Uma prova por atividade por dia.** O dia é sempre o de São Paulo e vem do servidor, então não dá para postar com data atrasada.
- **Streak** conta dias seguidos. Se você ainda não postou hoje, ele continua valendo até meia-noite.
- **Pontos**: 10 por prova, +5 no dia em que faz exercício e leitura. A semana começa na segunda.
- **Stories** mostram as provas das últimas 24 horas.

## Roadmap

1. [x] Repositório e base do projeto
2. [x] Banco de dados (perfis, provas, streaks, ranking, fotos)
3. [x] Login e código de convite
4. [x] Postar foto pela câmera
5. [x] Stories de 24h
6. [x] Streaks e pontos
7. [x] Ranking semanal/mensal
8. [ ] Apagar fotos com mais de 24h automaticamente
9. [ ] PWA (instalar na tela do celular) + deploy
10. [ ] Vencedor da semana/mês passados no ranking
