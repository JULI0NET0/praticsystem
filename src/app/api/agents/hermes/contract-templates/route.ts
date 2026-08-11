import { NextResponse } from 'next/server';
import { authenticateHermes } from '@/lib/hermesAuth';
import {
  CONTRACT_TEMPLATE,
  CONTRACT_TEMPLATE_DEVELOPMENT,
  CONTRACT_TEMPLATE_IA,
  CONTRACT_TEMPLATE_ARTES,
} from '@/lib/contractTemplate';

// GET /api/agents/hermes/contract-templates — texto bruto dos modelos de contrato,
// para o Hermes decidir qual usar como base e propor cláusulas customizadas.
export async function GET(request: Request) {
  const authError = authenticateHermes(request);
  if (authError) return authError;

  return NextResponse.json({
    social_media: CONTRACT_TEMPLATE,
    development: CONTRACT_TEMPLATE_DEVELOPMENT,
    ia_images: CONTRACT_TEMPLATE_IA,
    artes_avulsas: CONTRACT_TEMPLATE_ARTES,
  });
}
