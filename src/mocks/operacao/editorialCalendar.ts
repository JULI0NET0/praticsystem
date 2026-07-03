import { EditorialGenerationInput, MediaType, Task, Weekday } from "@/types/operacao";
import { uid } from "./ids";
import { CRIACAO_INITIAL_STATUS_ID } from "./statuses";

// ============================================================================
// Gerador de calendário editorial (função PURA e determinística)
// Ex.: 3 posts/semana × 4 semanas = 12 demandas, datadas nos dias escolhidos.
// ============================================================================

const MONTH_ABBR: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

/** Aceita "Jul/2026", "2026-07" ou "2026-07-01" → { year, month0 } */
export function parseMonthRef(monthRef: string): { year: number; month0: number } {
  const iso = monthRef.match(/^(\d{4})-(\d{2})/);
  if (iso) {
    return { year: Number(iso[1]), month0: Number(iso[2]) - 1 };
  }
  const br = monthRef.match(/^([A-Za-zç]{3})\w*\/?(\d{4})$/);
  if (br) {
    const m = MONTH_ABBR[br[1].toLowerCase().slice(0, 3)];
    if (m !== undefined) return { year: Number(br[2]), month0: m };
  }
  // fallback: mês/ano atuais
  const now = new Date();
  return { year: now.getFullYear(), month0: now.getMonth() };
}

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

function toISODate(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Seleciona as datas de publicação: para cada "semana" (bloco de 7 dias do mês),
 * escolhe até `postsPerWeek` dias que caiam nos `weekdays` definidos.
 * Determinístico — mesma entrada, mesma saída.
 */
export function selectEditorialDates(
  year: number,
  month0: number,
  postsPerWeek: number,
  weeks: number,
  weekdays: Weekday[],
): string[] {
  const totalDays = daysInMonth(year, month0);
  const wanted = new Set(weekdays);
  const dates: string[] = [];

  for (let w = 0; w < weeks; w++) {
    const startDay = w * 7 + 1;
    const endDay = Math.min(startDay + 6, totalDays);
    let picked = 0;
    for (let day = startDay; day <= endDay && picked < postsPerWeek; day++) {
      const weekday = new Date(year, month0, day).getDay() as Weekday;
      if (wanted.has(weekday)) {
        dates.push(toISODate(year, month0, day));
        picked += 1;
      }
    }
  }
  return dates;
}

/**
 * Gera as tarefas de POST do calendário editorial (não persiste — devolve os Tasks).
 * A numeração é sequencial (POST 01..N) e o canal é distribuído round-robin
 * quando há mais de um `channel`.
 */
export function generateEditorialPosts(input: EditorialGenerationInput): Task[] {
  const { year, month0 } = parseMonthRef(input.monthRef);
  const channels: MediaType[] = input.channels.length ? input.channels : ["FEED"];
  const dates = selectEditorialDates(
    year,
    month0,
    input.postsPerWeek,
    input.weeks,
    input.weekdays,
  );

  return dates.map((date, i) => {
    const media = channels[i % channels.length];
    const number = String(i + 1).padStart(2, "0");
    return {
      id: uid("task"),
      listId: input.listId,
      title: `POST ${number}`,
      taskType: "post",
      statusId: CRIACAO_INITIAL_STATUS_ID,
      assigneeIds: [],
      dueDate: date,
      customValues: {
        midia: media,
        mes_referente: input.monthRef,
        data: date,
        funil: input.startFunnel ?? "TOPO",
      },
      subtasks: [],
    } satisfies Task;
  });
}
