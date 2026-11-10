# Streak

App fechado para um grupo de amigos manter a constância em desenvolvimento pessoal.

## Ideia

- **Navegação**: Início (stories, seu dia, ranking e feed), câmera no meio e Perfil (perfil, leitura, evolução e insígnias).
- **Prova do dia**: pelo botão da câmera no meio da barra, a pessoa tira a foto e escolhe se é exercício ou leitura. Na leitura dá pra informar a página em que parou.
- **Stories de 24h**: as fotos ficam visíveis para o grupo por 24 horas e depois somem.
- **Sequência**: contador de dias seguidos sem faltar, por atividade.
- **Ranking**: pontos e vencedor da semana e do mês.
- **Grupo fechado**: entrada só com código de convite.

## Stack (custo zero)

- **Frontend**: React + TypeScript + Vite, como PWA (instala na tela do celular, sem App Store).
- **Backend**: [Supabase](https://supabase.com) plano gratuito (login, banco Postgres, armazenamento de fotos, tempo real).
- **Hospedagem**: Vercel (gratuito), com publicação automática a cada mudança na `main`.

## Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (região **South America (São Paulo)**).
2. O esquema do banco (tabelas, regras de acesso e funções) não fica neste repositório: ele é aplicado direto no **SQL Editor** do projeto.
3. Em **Authentication → URL Configuration**, coloque o endereço do app em **Site URL** e em **Redirect URLs** (é o que faz o "Esqueci minha senha" funcionar).
4. Em **Project Settings → API**, copie a **Project URL** e a chave pública para o arquivo `.env`.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com as chaves do passo 4
npm run dev
```

## Regras

- **Pode postar várias fotos por dia**, mas cada atividade conta ponto uma vez por dia. O dia é sempre o de São Paulo e vem do servidor, então não dá para postar com data atrasada.
- **Sequência** conta dias seguidos. Se você ainda não postou hoje, ela continua valendo até meia-noite. Sábado e domingo são livres: postar soma, faltar não quebra.
- **Pontos**: 10 por atividade feita no dia, +5 no dia em que faz exercício e leitura, bônus de sequência, e +30 ao terminar um livro com resumo (140+ letras) ou PDF de anotações. A semana começa na segunda.
- **Stories** juntam exercício e leitura das últimas 24 horas numa barra só. Foto escolhida da galeria, em vez de tirada na hora, aparece com o selo "Galeria".
- **Cutucar**: no ranking, de segunda a sexta, dá pra cutucar quem ainda não postou tudo no dia. A pessoa recebe um aviso; vale uma cutucada por pessoa por dia.
- **Perfil**: foto, plano de fundo, descrição, livro que está lendo e exercícios que faz. Em Editar perfil a pessoa escolhe quais números (até 4) e cartões aparecem. Toque no nome de alguém para ver o perfil.
- **Biblioteca** (Perfil → Leitura): lendo agora, lista "Quero ler" e concluídos, com contadores no topo. A capa vem automática da Open Library. Só entram livros começados no app; a data de conclusão é marcada sozinha ao terminar, com nota de 1 a 10 (com decimal) e comentário opcional. Ao terminar, ou depois pela estante, o livro pode ganhar um PDF de anotações (até 5 MB e 30 páginas), visível pro grupo ou só pra pessoa. Na lista de um amigo dá pra marcar "Quero ler também".
- **Aviso automático no feed**: ao terminar um livro, o Streak publica um post que o grupo pode curtir e comentar. As curtidas ficam contadas na estante, mesmo depois que o post some.
- **Insígnias**: vitórias, sequências, leitura e treino viram medalhas de bronze, prata, ouro e diamante. Cada pessoa escolhe até 3 pra mostrar em destaque, ao lado do nome.
- **Evolução**: números da semana e do mês comparados com a média do grupo, e retrospectiva em telas no fim de cada semana e mês.
- **Feed**: posts de até 280 caracteres com uma foto opcional e comentários (também com uma foto opcional). Sem curtidas, exceto no aviso automático de livro terminado. Tudo some em 24 horas. Feed não vale ponto.
- **Comentários nas provas**: dentro de cada story dá pra comentar a prova do amigo; todo mundo vê e comenta, e os comentários somem junto com o story, em 24h.
