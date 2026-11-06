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
2. Abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. (Bancos criados antes da versão com perfis precisam rodar também o [`02-perfil-e-varias-provas.sql`](supabase/02-perfil-e-varias-provas.sql).)
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

- **Pode postar várias fotos por dia**, mas cada atividade conta ponto uma vez por dia. O dia é sempre o de São Paulo e vem do servidor, então não dá para postar com data atrasada.
- **Streak** conta dias seguidos. Se você ainda não postou hoje, ele continua valendo até meia-noite.
- **Pontos**: 10 por atividade feita no dia, +5 no dia em que faz exercício e leitura, +30 por cumprir o desafio da semana em 5 dos 7 dias (+40 com os 7). A semana começa na segunda.
- **Stories** juntam exercício e leitura das últimas 24 horas numa barra só.
- **Perfil**: foto, descrição, livro que está lendo e exercícios que faz. Toque no nome de alguém para ver o perfil.
- **Estante**: só entram livros começados no app. As provas de leitura ficam ligadas ao livro em andamento; ao terminar, a pessoa dá uma nota de 1 a 10 (com decimal) e um comentário opcional, e o livro vai pra estante. Dá pra largar um livro sem que ele vá pra estante.
- **Desafio da semana**: durante a semana, cada um propõe desafios e vota (não vale votar na própria ideia). Na segunda, o mais votado vira o desafio; no empate, ganha quem propôs primeiro. Sem ideias, a semana fica sem desafio. Cumprir o desafio do dia exige foto e aparece nos stories.
- **Comentários nas provas**: dentro de cada story dá pra comentar a prova do amigo; todo mundo vê e comenta, e os comentários somem junto com o story, em 24h.

## Roadmap

1. [x] Repositório e base do projeto
2. [x] Banco de dados (perfis, provas, streaks, ranking, fotos)
3. [x] Login e código de convite
4. [x] Postar foto pela câmera
5. [x] Stories de 24h
6. [x] Streaks e pontos
7. [x] Ranking semanal/mensal
8. [x] Perfis com foto, descrição, livro e exercícios
9. [x] Stories de exercício e leitura juntos
10. [x] Comentários nas provas dos stories
11. [x] Estante de livros com nota e comentário
12. [x] Desafio da semana com votação
13. [ ] Apagar fotos das provas com mais de 24h automaticamente
14. [ ] PWA (instalar na tela do celular) + deploy
15. [ ] Vencedor da semana/mês passados no ranking
16. [ ] Notificações
