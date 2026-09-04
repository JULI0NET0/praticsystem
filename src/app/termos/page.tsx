export const metadata = {
  title: "Termos de Serviço — PraticSystem",
};

export default function TermosPage() {
  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '0 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1b1c1a', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Termos de Serviço</h1>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>PraticSystem — Agência Prátic</p>

      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600 }}>1. Finalidade do Aplicativo</h2>
        <p style={{ fontSize: '14px' }}>
          O PraticSystem é uma plataforma interna de gestão de demandas, clientes e agendamentos desenvolvida para uso pela equipe da Agência Prátic e seus clientes autorizados.
        </p>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600 }}>2. Responsabilidade e Acesso</h2>
        <p style={{ fontSize: '14px' }}>
          O acesso é restrito aos membros credenciados. As integrações com serviços de terceiros (como Google Agenda) são autorizadas pelo próprio usuário através de protocolos OAuth 2.0 padrão.
        </p>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600 }}>3. Contato</h2>
        <p style={{ fontSize: '14px' }}>
          Em caso de dúvidas sobre estes termos: contato@agenciapratic.com.
        </p>
      </section>
    </div>
  );
}
