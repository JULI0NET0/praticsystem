export const metadata = {
  title: "Política de Privacidade — PraticSystem",
};

export default function PrivacidadePage() {
  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '0 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1b1c1a', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Política de Privacidade</h1>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>PraticSystem — Agência Prátic</p>

      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600 }}>1. Uso dos Dados e Integração com Google Agenda</h2>
        <p style={{ fontSize: '14px' }}>
          O PraticSystem utiliza a integração com o Google Calendar exclusivamente para sincronizar compromissos, reuniões e eventos internos agendados pela equipe da Agência Prátic. Nossos servidores acessam apenas os eventos de calendário autorizados pelo próprio usuário para criação, atualização e leitura da agenda corporativa.
        </p>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600 }}>2. Compartilhamento e Armazenamento</h2>
        <p style={{ fontSize: '14px' }}>
          Nenhum dado pessoal, agenda ou informação corporativa é compartilhado, comercializado ou transferido para terceiros. Todas as informações trafegam via conexões criptografadas (HTTPS) e são armazenadas em infraestrutura segura.
        </p>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600 }}>3. Contato</h2>
        <p style={{ fontSize: '14px' }}>
          Para dúvidas sobre o tratamento de dados, entre em contato através do e-mail: contato@agenciapratic.com.
        </p>
      </section>
    </div>
  );
}
