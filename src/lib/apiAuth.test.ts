import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUser = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock('@/lib/hermesAuth', () => ({
  getSupabaseAdmin: () => ({ auth: { getUser }, from }),
}));

import { requireStaffUser } from '@/lib/apiAuth';

function req(authorization?: string) {
  return new Request('http://localhost/api/clients', {
    headers: authorization ? { authorization } : {},
  });
}

describe('requireStaffUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responde 401 sem token', async () => {
    const result = await requireStaffUser(req());
    expect(result.error?.status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('responde 401 com token inválido', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid JWT') });
    const result = await requireStaffUser(req('Bearer token-ruim'));
    expect(getUser).toHaveBeenCalledWith('token-ruim');
    expect(result.error?.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('responde 403 para usuário fora de public.users (cliente do portal)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'cliente-1' } }, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await requireStaffUser(req('Bearer token-cliente'));
    expect(from).toHaveBeenCalledWith('users');
    expect(eq).toHaveBeenCalledWith('id', 'cliente-1');
    expect(result.error?.status).toBe(403);
  });

  it('libera usuário da equipe', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'equipe-1' } }, error: null });
    maybeSingle.mockResolvedValue({ data: { id: 'equipe-1' }, error: null });
    const result = await requireStaffUser(req('Bearer token-equipe'));
    expect(result.error).toBeUndefined();
    expect(result.user?.id).toBe('equipe-1');
  });
});
