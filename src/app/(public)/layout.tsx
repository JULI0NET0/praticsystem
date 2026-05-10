import Link from "next/link";
import ThemeLogo from "@/components/ThemeLogo";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-light)', color: 'var(--text-dark)' }}>
      <header style={{ 
        padding: '24px 0', 
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(241, 239, 237, 0.8)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/home">
            <ThemeLogo width={180} height={45} align="left" />
          </Link>
          <nav>
            <ul style={{ display: 'flex', gap: '32px', listStyle: 'none', fontWeight: 500 }}>
              <li><Link href="/home">Início</Link></li>
              <li><Link href="/portfolio">Portfólio</Link></li>
              <li><Link href="/onboarding">Seja Cliente</Link></li>
            </ul>
          </nav>
          <Link href="/" className="btn" style={{ border: '2px solid var(--text-dark)' }}>
            Área do Cliente
          </Link>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {children}
      </main>

      <footer style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '64px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <ThemeLogo width={160} height={40} align="left" />
            <p style={{ color: 'var(--text-secondary)', marginTop: '16px', maxWidth: '300px' }}>
              Transformando negócios através do design e tecnologia.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '16px' }}>Contato</h4>
            <p style={{ color: 'var(--text-secondary)' }}>contato@agenciapratic.com</p>
            <p style={{ color: 'var(--text-secondary)' }}>(11) 99999-9999</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
