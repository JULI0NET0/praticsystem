"use client";

import { ArrowRight, BarChart2, Monitor, PenTool } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section style={{ padding: '120px 0', textAlign: 'center', backgroundColor: '#F1EFED' }}>
        <div className="container animate-fade-in-up">
          <h1 style={{ fontSize: '4rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '24px' }}>
            Elevando o Padrão do<br/>Seu Negócio Digital
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#4A4A4A', maxWidth: '600px', margin: '0 auto 40px' }}>
            A Agência Prátic une design premium, tecnologia moderna e estratégias de alta conversão.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/onboarding" className="btn btn-accent" style={{ fontSize: '1.125rem', padding: '16px 32px' }}>
              Falar com Consultor <ArrowRight size={20} />
            </Link>
            <Link href="/portfolio" className="btn" style={{ border: '2px solid var(--text-dark)', fontSize: '1.125rem', padding: '16px 32px' }}>
              Ver Portfólio
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section style={{ padding: '120px 0', backgroundColor: '#FFFFFF' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700 }}>Nossas Especialidades</h2>
            <p style={{ color: '#4A4A4A', marginTop: '16px' }}>Soluções ponta a ponta para o seu crescimento.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
            <div style={{ padding: '40px', backgroundColor: '#F8F8F8', borderRadius: '24px', transition: 'transform 0.3s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-8px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#1C1C1C', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Monitor color="#FFFFFF" size={32} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '16px' }}>Desenvolvimento Web</h3>
              <p style={{ color: '#4A4A4A' }}>Sites institucionais, landing pages e e-commerces com foco absoluto em performance e experiência do usuário.</p>
            </div>

            <div style={{ padding: '40px', backgroundColor: '#F8F8F8', borderRadius: '24px', transition: 'transform 0.3s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-8px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--accent)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <BarChart2 color="#FFFFFF" size={32} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '16px' }}>Performance & Tráfego</h3>
              <p style={{ color: '#4A4A4A' }}>Gestão de anúncios em Meta Ads e Google Ads com estratégias data-driven para maximizar seu ROAS.</p>
            </div>

            <div style={{ padding: '40px', backgroundColor: '#F8F8F8', borderRadius: '24px', transition: 'transform 0.3s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-8px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#1C1C1C', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <PenTool color="#FFFFFF" size={32} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '16px' }}>Identidade Visual</h3>
              <p style={{ color: '#4A4A4A' }}>Criação de marcas memoráveis, desde o logotipo até o manual completo de aplicação visual.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
