export const metadata = {
  title: "Política de Privacidade — Automação Instagram",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-canvas)] text-[var(--color-text-primary)] px-4 py-12 sm:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-[family-name:var(--font-serif)] text-[26px] font-medium text-[var(--color-text-primary)] mb-2">Política de Privacidade</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-8">Automação de Instagram — @juli0net0</p>

        <div className="space-y-6 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          <p>
            Esta página descreve como o aplicativo de automação da conta de Instagram
            @juli0net0 (&ldquo;o aplicativo&rdquo;) trata os dados de quem interage com seus posts,
            reels e mensagens diretas.
          </p>

          <section>
            <h2 className="text-[var(--color-text-primary)] font-semibold mb-2">O que o aplicativo faz</h2>
            <p>
              Quando alguém comenta uma palavra-chave específica em um post ou reels da conta
              @juli0net0, o aplicativo envia automaticamente uma mensagem direta (DM) de resposta,
              de forma parecida com uma resposta manual do próprio perfil.
            </p>
          </section>

          <section>
            <h2 className="text-[var(--color-text-primary)] font-semibold mb-2">Quais dados são coletados</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>ID e nome de usuário do Instagram de quem comenta ou envia mensagem;</li>
              <li>o texto do comentário que ativou a automação;</li>
              <li>o histórico de mensagens automáticas enviadas pelo aplicativo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[var(--color-text-primary)] font-semibold mb-2">Como os dados são usados</h2>
            <p>
              Os dados são usados exclusivamente para identificar qual mensagem automática enviar
              e para evitar o envio duplicado da mesma resposta. Não são usados para anúncios, não
              são vendidos e não são compartilhados com terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-[var(--color-text-primary)] font-semibold mb-2">Onde os dados ficam armazenados</h2>
            <p>
              Os dados ficam em um banco de dados privado (Supabase), acessível apenas pelo
              responsável pela conta @juli0net0. Nenhuma outra pessoa ou empresa tem acesso.
            </p>
          </section>

          <section>
            <h2 className="text-[var(--color-text-primary)] font-semibold mb-2">Como pedir a exclusão dos seus dados</h2>
            <p>
              Veja as instruções na página de{" "}
              <a href="/instagram-exclusao-dados" className="text-[var(--color-info-ink)] underline focus-visible:outline-2 focus-visible:outline-[var(--color-info)]">
                Exclusão de Dados
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-[var(--color-text-primary)] font-semibold mb-2">Contato</h2>
            <p>
              Dúvidas sobre esta política podem ser enviadas para{" "}
              <a href="mailto:juliomneto20@gmail.com" className="text-[var(--color-info-ink)] underline focus-visible:outline-2 focus-visible:outline-[var(--color-info)]">
                juliomneto20@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
