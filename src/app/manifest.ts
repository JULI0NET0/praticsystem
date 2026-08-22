import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agência Prátic - Sistema de Gestão',
    short_name: 'Prátic',
    description: 'Plataforma completa de gestão para a Agência Prátic',
    start_url: '/admin/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF9F5',
    theme_color: '#FAF9F5',
    icons: [
      // Símbolo preto: o branco ficaria invisível sobre o splash
      // pergaminho agora que o fundo não é mais #0A0A0A.
      {
        src: '/SIMBOLO-PRETO.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/SIMBOLO-PRETO.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
