export const metadata = {
  title: "Exclusão de Dados — Automação Instagram",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-canvas)] text-[var(--color-text-primary)] px-4 py-12 sm:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-[family-name:var(--font-serif)] text-[26px] font-medium text-[var(--color-text-primary)] mb-2">Exclusão de Dados</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-8">Automação de Instagram — @juli0net0</p>

        <div className="space-y-6 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          <p>
            Se você comentou ou enviou mensagem para a conta @juli0net0 e quer que seus dados
            (ID do Instagram, nome de usuário e histórico de mensagens automáticas) sejam
            apagados do nosso banco de dados, siga um dos caminhos abaixo.
          </p>

          <section>
            <h2 className="text-[var(--color-text-primary)] font-semibold mb-2">Como solicitar a exclusão</h2>
            <p>
              Envie uma mensagem para{" "}
              <a href="mailto:juliomneto20@gmail.com" className="text-[var(--color-info-ink)] underline focus-visible:outline-2 focus-visible:outline-[var(--color-info)]">
                juliomneto20@gmail.com
              </a>{" "}
              com o assunto &ldquo;Exclusão de dados Instagram&rdquo; e informe o seu @ do Instagram.
              O pedido será atendido em até 15 dias.
            </p>
          </section>

          <section>
            <h2 className="text-[var(--color-text-primary)] font-semibold mb-2">Outra forma: revogar o acesso pelo Instagram</h2>
            <p>
              Você também pode remover o acesso do aplicativo diretamente pelo Instagram, em
              Configurações → Aplicativos e sites → Ativos, removendo o aplicativo vinculado a
              @juli0net0. Isso interrompe imediatamente qualquer nova coleta de dados.
            </p>
          </section>

          <section>
            <h2 className="text-[var(--color-text-primary)] font-semibold mb-2">Contato</h2>
            <p>
              Dúvidas:{" "}
              <a href="mailto:juliomneto20@gmail.com" className="text-[var(--color-info-ink)] underline focus-visible:outline-2 focus-visible:outline-[var(--color-info)]">
                juliomneto20@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
