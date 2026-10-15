import { describe, it, expect } from 'vitest';
import { formatCaptureFolderName, matchClientsToFolders, normalizeName, parseDriveFolderId } from './driveFolders';

describe('parseDriveFolderId', () => {
  it('lê links de pasta com /u/0 e query', () => {
    expect(parseDriveFolderId('https://drive.google.com/drive/u/0/folders/1HA8EzhxcBFdzdVAQmme4IxpPpBkL0wvt?usp=sharing')).toBe('1HA8EzhxcBFdzdVAQmme4IxpPpBkL0wvt');
  });
  it('lê open?id=', () => {
    expect(parseDriveFolderId('https://drive.google.com/open?id=1HA8EzhxcBFdzdVAQmme4IxpPpBkL0wvt')).toBe('1HA8EzhxcBFdzdVAQmme4IxpPpBkL0wvt');
  });
  it('devolve null para vazio ou link sem pasta', () => {
    expect(parseDriveFolderId('')).toBeNull();
    expect(parseDriveFolderId(null)).toBeNull();
    expect(parseDriveFolderId('https://exemplo.com')).toBeNull();
  });
});

describe('formatCaptureFolderName', () => {
  it('monta CAP. DD-MM-AA, sem o nome do cliente', () => {
    expect(formatCaptureFolderName('2026-09-25')).toBe('CAP. 25-09-26');
  });
});

describe('matchClientsToFolders', () => {
  const folders = [
    { id: 'f1', name: 'Kallas' },
    { id: 'f2', name: 'Thamires - Psicóloga' },
    { id: 'f3', name: 'Pratic 🦊' },
  ];

  it('casa por nome exato ignorando acento e caixa', () => {
    const [m] = matchClientsToFolders([{ id: 'c1', name: 'KALLAS' }], folders);
    expect(m).toMatchObject({ folderId: 'f1', confidence: 'exact' });
  });
  it('usa nome_fantasia', () => {
    const [m] = matchClientsToFolders([{ id: 'c1', name: 'Kallas Comércio LTDA', nome_fantasia: 'Kallas' }], folders);
    expect(m).toMatchObject({ folderId: 'f1', confidence: 'exact' });
  });
  it('casa parcialmente quando um nome contém o outro', () => {
    const [m] = matchClientsToFolders([{ id: 'c1', name: 'Thamires' }], folders);
    expect(m).toMatchObject({ folderId: 'f2', confidence: 'partial' });
  });
  it('não casa quando não há pasta', () => {
    const [m] = matchClientsToFolders([{ id: 'c1', name: 'Mobitec' }], folders);
    expect(m).toMatchObject({ folderId: null, confidence: null });
  });
});

describe('normalizeName', () => {
  it('remove acento, emoji e pontuação', () => {
    expect(normalizeName('Pratic 🦊')).toBe('pratic');
    expect(normalizeName('Psicóloga - Thamires')).toBe('psicologa thamires');
  });
});
