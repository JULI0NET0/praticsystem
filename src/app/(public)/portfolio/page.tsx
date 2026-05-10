"use client";

import { portfolioCases } from "@/mocks/db";

export default function PortfolioPage() {
  return (
    <div style={{ backgroundColor: '#F1EFED', minHeight: '100vh', padding: '80px 0' }}>
      <div className="container animate-fade-in-up">
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '16px' }}>Nosso Portfólio</h1>
          <p style={{ color: '#4A4A4A', fontSize: '1.25rem' }}>Projetos que entregam resultados reais.</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '48px' }}>
          {['Todos', 'Marketing', 'Design', 'Desenvolvimento'].map((filter, i) => (
            <button 
              key={filter}
              className="btn" 
              style={{ 
                backgroundColor: i === 0 ? '#0A0A0A' : 'transparent',
                color: i === 0 ? '#FFFFFF' : '#0A0A0A',
                border: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.1)',
                borderRadius: '100px'
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '32px' }}>
          {portfolioCases.map((item) => (
            <div key={item.id} style={{ 
              backgroundColor: '#FFFFFF', 
              borderRadius: '24px', 
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              transition: 'transform 0.3s',
              cursor: 'pointer'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-8px)'} 
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ height: '240px', backgroundColor: '#E5E5E5', position: 'relative' }}>
                {/* Mock Image Placeholder */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8A8A8', fontSize: '2rem', fontWeight: 700 }}>
                  {item.title.substring(0,2).toUpperCase()}
                </div>
              </div>
              <div style={{ padding: '32px' }}>
                <span style={{ 
                  display: 'inline-block', 
                  padding: '4px 12px', 
                  backgroundColor: 'rgba(217, 72, 15, 0.1)', 
                  color: 'var(--accent)', 
                  borderRadius: '100px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginBottom: '16px'
                }}>
                  {item.category}
                </span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '12px' }}>{item.title}</h3>
                <p style={{ color: '#4A4A4A', marginBottom: '24px' }}>{item.description}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {item.results.map(res => (
                    <span key={res} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1C1C1C', backgroundColor: '#F1EFED', padding: '4px 12px', borderRadius: '4px' }}>
                      {res}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
