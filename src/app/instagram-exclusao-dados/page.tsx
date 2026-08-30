export const metadata = {
  title: "Exclusão de Dados — Automação Instagram",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 px-4 py-12 sm:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-white mb-2">Exclusão de Dados</h1>
        <p className="text-sm text-neutral-500 mb-8">Automação de Instagram — @juli0net0</p>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-300">
          <p>
            Se você comentou ou enviou mensagem para a conta @juli0net0 e quer que seus dados
            (ID do Instagram, nome de usuário e histórico de mensagens automáticas) sejam
            apagados do nosso banco de dados, siga um dos caminhos abaixo.
          </p>

          <section>
            <h2 className="text-white font-medium mb-2">Como solicitar a exclusão</h2>
            <p>
              Envie uma mensagem para{" "}
              <a href="mailto:juliomneto20@gmail.com" className="text-blue-400 underline">
                juliomneto20@gmail.com
              </a>{" "}
              com o assunto &ldquo;Exclusão de dados Instagram&rdquo; e informe o seu @ do Instagram.
              O pedido será atendido em até 15 dias.
            </p>
          </section>

          <section>
            <h2 className="text-white font-medium mb-2">Outra forma: revogar o acesso pelo Instagram</h2>
            <p>
              Você também pode remover o acesso do aplicativo diretamente pelo Instagram, em
              Configurações → Aplicativos e sites → Ativos, removendo o aplicativo vinculado a
              @juli0net0. Isso interrompe imediatamente qualquer nova coleta de dados.
            </p>
          </section>

          <section>
            <h2 className="text-white font-medium mb-2">Contato</h2>
            <p>
              Dúvidas:{" "}
              <a href="mailto:juliomneto20@gmail.com" className="text-blue-400 underline">
                juliomneto20@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
