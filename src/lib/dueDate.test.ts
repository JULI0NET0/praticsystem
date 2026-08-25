import { describe, expect, it } from 'vitest';
import {
  dueDateBucket,
  formatDueDateLabel,
  fromISODate,
  parseDueDateInput,
  toISODate,
} from './dueDate';

// Quarta-feira, 26 de agosto de 2026 (meio-dia local, para não flutuar com o fuso)
const NOW = new Date(2026, 7, 26, 12, 0, 0);

describe('parseDueDateInput', () => {
  it('entende os atalhos relativos', () => {
    expect(parseDueDateInput('hoje', NOW)).toBe('2026-08-26');
    expect(parseDueDateInput('Hoje', NOW)).toBe('2026-08-26');
    expect(parseDueDateInput('amanhã', NOW)).toBe('2026-08-27');
    expect(parseDueDateInput('amanha', NOW)).toBe('2026-08-27');
    expect(parseDueDateInput('depois de amanhã', NOW)).toBe('2026-08-28');
    expect(parseDueDateInput('ontem', NOW)).toBe('2026-08-25');
    expect(parseDueDateInput('próxima semana', NOW)).toBe('2026-09-02');
  });

  it('entende dias da semana e sempre aponta para a próxima ocorrência', () => {
    // NOW é quarta-feira
    expect(parseDueDateInput('sexta', NOW)).toBe('2026-08-28');
    expect(parseDueDateInput('sexta-feira', NOW)).toBe('2026-08-28');
    expect(parseDueDateInput('segunda', NOW)).toBe('2026-08-31');
    expect(parseDueDateInput('próxima segunda', NOW)).toBe('2026-08-31');
    expect(parseDueDateInput('terça que vem', NOW)).toBe('2026-09-01');
    expect(parseDueDateInput('domingo', NOW)).toBe('2026-08-30');
    // O próprio dia da semana pula para a semana seguinte
    expect(parseDueDateInput('quarta', NOW)).toBe('2026-09-02');
  });

  it('entende prazos em dias', () => {
    expect(parseDueDateInput('em 3 dias', NOW)).toBe('2026-08-29');
    expect(parseDueDateInput('+10', NOW)).toBe('2026-09-05');
    expect(parseDueDateInput('5 dias', NOW)).toBe('2026-08-31');
  });

  it('entende datas numéricas', () => {
    expect(parseDueDateInput('03/09', NOW)).toBe('2026-09-03');
    expect(parseDueDateInput('3/9', NOW)).toBe('2026-09-03');
    expect(parseDueDateInput('03/09/2027', NOW)).toBe('2027-09-03');
    expect(parseDueDateInput('03/09/27', NOW)).toBe('2027-09-03');
    expect(parseDueDateInput('2026-12-31', NOW)).toBe('2026-12-31');
  });

  it('devolve null para entrada vazia ou que não entende', () => {
    expect(parseDueDateInput('', NOW)).toBeNull();
    expect(parseDueDateInput('   ', NOW)).toBeNull();
    expect(parseDueDateInput('sem data', NOW)).toBeNull();
    expect(parseDueDateInput('qualquer coisa', NOW)).toBeNull();
    // 31 de fevereiro não existe — não pode virar 3 de março
    expect(parseDueDateInput('31/02', NOW)).toBeNull();
    expect(parseDueDateInput('40/13', NOW)).toBeNull();
  });
});

describe('toISODate / fromISODate', () => {
  it('faz a ida e volta no fuso local', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toISODate(fromISODate('2026-01-05')!)).toBe('2026-01-05');
  });

  it('aceita timestamp completo e devolve o dia local', () => {
    expect(toISODate(fromISODate('2026-03-10T23:30:00Z')!)).toBe('2026-03-10');
  });
});

describe('formatDueDateLabel', () => {
  it('rotula os dias próximos por nome', () => {
    expect(formatDueDateLabel('2026-08-26', NOW)).toEqual({ label: 'Hoje', tone: 'today' });
    expect(formatDueDateLabel('2026-08-27', NOW)).toEqual({ label: 'Amanhã', tone: 'soon' });
    expect(formatDueDateLabel('2026-08-25', NOW)).toEqual({ label: 'Ontem', tone: 'overdue' });
    expect(formatDueDateLabel('2026-08-28', NOW)).toEqual({ label: 'Sexta-feira', tone: 'soon' });
  });

  it('usa data curta para prazos distantes', () => {
    expect(formatDueDateLabel('2026-09-15', NOW)).toEqual({ label: '15 de set', tone: 'normal' });
    expect(formatDueDateLabel('2027-01-08', NOW)).toEqual({
      label: '8 de jan de 2027',
      tone: 'normal',
    });
  });

  it('marca atraso e ausência de prazo', () => {
    expect(formatDueDateLabel('2026-08-01', NOW).tone).toBe('overdue');
    expect(formatDueDateLabel(null, NOW)).toEqual({ label: 'Sem prazo', tone: 'muted' });
  });
});

describe('dueDateBucket', () => {
  it('agrupa por proximidade do prazo', () => {
    expect(dueDateBucket(null, NOW)).toBe('sem_data');
    expect(dueDateBucket('2026-08-01', NOW)).toBe('atrasada');
    expect(dueDateBucket('2026-08-26', NOW)).toBe('hoje');
    expect(dueDateBucket('2026-08-27', NOW)).toBe('amanha');
    expect(dueDateBucket('2026-09-02', NOW)).toBe('semana');
    expect(dueDateBucket('2026-09-30', NOW)).toBe('depois');
  });
});
