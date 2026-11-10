import Sheet from './Sheet'

export type LegalDoc = 'termos' | 'privacidade'

const UPDATED = '9 de novembro de 2026'

/** Termos de uso e Política de privacidade, em linguagem simples. */
export default function LegalSheet({ doc, onClose }: { doc: LegalDoc; onClose: () => void }) {
  return (
    <Sheet title={doc === 'termos' ? 'Termos de uso' : 'Política de privacidade'} onClose={onClose} className="legal">
      <p className="legal-updated">Atualizado em {UPDATED}</p>
      {doc === 'termos' ? <Terms /> : <Privacy />}
    </Sheet>
  )
}

function Terms() {
  return (
    <>
      <h3>O que é o Streak</h3>
      <p>
        O Streak é um app fechado, só para convidados, em que um grupo de amigos registra treinos e leituras com fotos, acompanha a
        sequência de dias e disputa um ranking. É gratuito e não tem fins comerciais.
      </p>

      <h3>Sua conta</h3>
      <ul>
        <li>Para entrar é preciso um código de convite de alguém do grupo.</li>
        <li>Você é responsável por manter sua senha em segredo. A conta é pessoal.</li>
        <li>Você pode excluir sua conta quando quiser, em Perfil → Ajustes.</li>
      </ul>

      <h3>O que você posta</h3>
      <ul>
        <li>O que você publica (fotos, textos, livros, comentários) continua sendo seu. Você só permite que o grupo veja dentro do app.</li>
        <li>Poste só fotos suas ou que você tem permissão de usar. Nada de nudez, violência, ofensas ou conteúdo ilegal.</li>
        <li>Anexe PDFs de livros só se você tiver o direito de compartilhá-los.</li>
        <li>Respeite o grupo. Quem administra o app pode remover conteúdo ou contas que quebrem estas regras.</li>
      </ul>

      <h3>O serviço</h3>
      <ul>
        <li>O app é mantido por pessoas do grupo, sem garantia de funcionamento contínuo. Pode ficar fora do ar ou mudar.</li>
        <li>Fotos de prova e do feed somem depois de cerca de 24 horas. Não use o app como backup das suas fotos.</li>
        <li>Pontos, sequências e ranking são uma brincadeira entre amigos e não valem prêmio nenhum.</li>
      </ul>

      <h3>Mudanças</h3>
      <p>Se estes termos mudarem, a data no topo é atualizada. Continuar usando o app depois disso significa que você concorda.</p>
    </>
  )
}

function Privacy() {
  return (
    <>
      <h3>Resumo</h3>
      <p>
        Guardamos só o necessário para o app funcionar. Seus dados ficam visíveis apenas para o grupo, não são vendidos e não são usados
        para anúncios. O app não usa ferramentas de rastreamento ou estatísticas.
      </p>

      <h3>O que guardamos</h3>
      <ul>
        <li>
          <strong>Conta:</strong> e-mail e senha. A senha é guardada cifrada, e nem quem administra o app consegue vê-la.
        </li>
        <li>
          <strong>Perfil:</strong> nome no grupo, foto, plano de fundo, descrição e exercícios que você faz.
        </li>
        <li>
          <strong>Atividade:</strong> provas (foto, legenda, página do livro, data), posts, comentários e curtidas.
        </li>
        <li>
          <strong>Leitura:</strong> livros que você lê, terminou ou quer ler, notas, resenhas, capas e PDFs que você anexar.
        </li>
        <li>
          <strong>Notificações:</strong> os avisos do app e, se você ativar, o endereço de notificação do seu aparelho.
        </li>
      </ul>

      <h3>Por quanto tempo</h3>
      <ul>
        <li>Fotos de prova e do feed: apagadas depois de cerca de 24 horas. Fica só o registro de que você postou.</li>
        <li>Avisos dentro do app: apagados depois de 14 dias.</li>
        <li>O resto: enquanto sua conta existir. Ao excluir a conta, tudo isso é apagado.</li>
      </ul>

      <h3>Quem vê</h3>
      <p>
        Só quem está no grupo e entrou com uma conta. PDFs marcados como “só eu” ficam visíveis apenas para você. Ninguém de fora tem
        acesso.
      </p>

      <h3>Serviços usados</h3>
      <ul>
        <li>
          <strong>Supabase:</strong> banco de dados, login e arquivos.
        </li>
        <li>
          <strong>Vercel:</strong> hospedagem do app e envio das notificações.
        </li>
        <li>
          <strong>Google Books e Open Library:</strong> recebem só o texto que você digita ao buscar um livro.
        </li>
      </ul>

      <h3>No seu aparelho</h3>
      <p>
        O app guarda no navegador o seu login, algumas preferências, cópias temporárias de imagens e os arquivos do próprio app, para abrir mais rápido. Sair da conta
        encerra o login neste aparelho.
      </p>

      <h3>Seus direitos (LGPD)</h3>
      <p>
        Você pode ver e corrigir seus dados no próprio app (Editar perfil) e excluir sua conta e tudo o que ela tem em Perfil → Ajustes →
        Excluir conta. Para qualquer outro pedido sobre seus dados, fale com quem administra o grupo.
      </p>
    </>
  )
}
