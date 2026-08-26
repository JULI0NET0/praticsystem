import { describe, expect, it } from 'vitest';
import {
  capturesPerPeriod,
  formatMonthRef,
  parseMonthRef,
  selectCaptureDates,
  selectScheduleDates,
  type Weekday,
} from './contentSchedule';

// Setembro/2026: dia 1 é uma terça-feira, mês com 30 dias.
const SEG_QUA_SEX: Weekday[] = [1, 3, 5];

describe('parseMonthRef', () => {
  it('entende os formatos ISO e brasileiro', () => {
    expect(parseMonthRef('2026-09')).toEqual({ year: 2026, month0: 8 });
    expect(parseMonthRef('2026-09-15')).toEqual({ year: 2026, month0: 8 });
    expect(parseMonthRef('Set/2026')).toEqual({ year: 2026, month0: 8 });
    expect(parseMonthRef('setembro/2026')).toEqual({ year: 2026, month0: 8 });
  });

  it('cai no mês de referência quando não entende', () => {
    expect(parseMonthRef('qualquer coisa', new Date(2027, 4, 10))).toEqual({
      year: 2027,
      month0: 4,
    });
  });
});

describe('selectScheduleDates — mês fechado', () => {
  const month = (postsPerWeek: number, weekdays = SEG_QUA_SEX) =>
    selectScheduleDates({
      period: { kind: 'month', monthRef: '2026-09' },
      postsPerWeek,
      weekdays,
    });

  it('cobre o mês inteiro, não só quatro semanas', () => {
    // 30 dias = 5 janelas de 7 dias; o dia 30 não pode ficar de fora
    const dates = month(3);
    expect(dates[0].startsWith('2026-09')).toBe(true);
    expect(dates[dates.length - 1] >= '2026-09-25').toBe(true);
  });

  it('respeita os dias da semana pedidos', () => {
    for (const iso of month(3)) {
      const [y, m, d] = iso.split('-').map(Number);
      expect(SEG_QUA_SEX).toContain(new Date(y, m - 1, d).getDay());
    }
  });

  it('limita a quantidade por janela de sete dias', () => {
    const dates = month(1);
    // 5 janelas, no máximo 1 por janela
    expect(dates.length).toBeLessThanOrEqual(5);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('não transborda para o mês seguinte', () => {
    for (const iso of month(3)) expect(iso.startsWith('2026-09')).toBe(true);
  });

  it('devolve as datas em ordem crescente', () => {
    const dates = month(3);
    expect([...dates].sort()).toEqual(dates);
  });
});

describe('selectScheduleDates — N semanas a partir de uma data', () => {
  const weeks = (n: number, startDate = '2026-09-07') =>
    selectScheduleDates({
      period: { kind: 'weeks', startDate, weeks: n },
      postsPerWeek: 2,
      weekdays: [1, 4], // segunda e quinta
    });

  it('gera duas por semana em quatro semanas', () => {
    expect(weeks(4)).toEqual([
      '2026-09-07', '2026-09-10',
      '2026-09-14', '2026-09-17',
      '2026-09-21', '2026-09-24',
      '2026-09-28', '2026-10-01',
    ]);
  });

  it('seis semanas continuam além da virada de mês', () => {
    const dates = weeks(6);
    expect(dates).toHaveLength(12);
    expect(dates[dates.length - 1]).toBe('2026-10-15');
  });

  it('atravessa a virada de ano sem quebrar', () => {
    const dates = selectScheduleDates({
      period: { kind: 'weeks', startDate: '2026-12-28', weeks: 2 },
      postsPerWeek: 1,
      weekdays: [1],
    });
    expect(dates).toEqual(['2026-12-28', '2027-01-04']);
  });

  it('devolve vazio sem dias marcados ou sem posts', () => {
    expect(
      selectScheduleDates({
        period: { kind: 'weeks', startDate: '2026-09-07', weeks: 4 },
        postsPerWeek: 3,
        weekdays: [],
      }),
    ).toEqual([]);

    expect(
      selectScheduleDates({
        period: { kind: 'weeks', startDate: '2026-09-07', weeks: 4 },
        postsPerWeek: 0,
        weekdays: [1],
      }),
    ).toEqual([]);
  });

  it('devolve vazio quando a data de início é inválida', () => {
    expect(
      selectScheduleDates({
        period: { kind: 'weeks', startDate: 'nao-e-data', weeks: 4 },
        postsPerWeek: 2,
        weekdays: [1],
      }),
    ).toEqual([]);
  });
});

describe('capturesPerPeriod', () => {
  it('extrai o número do texto livre do contrato', () => {
    expect(capturesPerPeriod('1x meia-diária')).toBe(1);
    expect(capturesPerPeriod('1 meia diária')).toBe(1);
    expect(capturesPerPeriod('2 diárias')).toBe(2);
  });

  it('texto sem número preenchido vale uma captação', () => {
    expect(capturesPerPeriod('meia diária')).toBe(1);
  });

  it('vazio não gera captação', () => {
    expect(capturesPerPeriod(null)).toBe(0);
    expect(capturesPerPeriod('')).toBe(0);
  });
});

describe('selectCaptureDates', () => {
  const period = { kind: 'month' as const, monthRef: '2026-09' };

  it('espalha as captações pelo período', () => {
    const one = selectCaptureDates(period, '1x meia-diária');
    const two = selectCaptureDates(period, '2 diárias');
    expect(one).toHaveLength(1);
    expect(two).toHaveLength(2);
    expect(two[0] < two[1]).toBe(true);
  });

  it('cai em dia útil no meio da semana', () => {
    for (const iso of selectCaptureDates(period, '2 diárias')) {
      const [y, m, d] = iso.split('-').map(Number);
      const weekday = new Date(y, m - 1, d).getDay();
      expect(weekday).toBeGreaterThanOrEqual(2);
      expect(weekday).toBeLessThanOrEqual(4);
    }
  });

  it('sem captação no contrato, nenhuma data', () => {
    expect(selectCaptureDates(period, null)).toEqual([]);
  });
});

describe('formatMonthRef', () => {
  it('formata a competência para leitura', () => {
    expect(formatMonthRef('2026-09')).toBe('Setembro/2026');
  });
});
