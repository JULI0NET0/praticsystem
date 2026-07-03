import { Space } from "@/types/operacao";
import { createSpace } from "./seed";

/** Estado inicial do Espaço para o OperacaoProvider (mock em memória). */
export function createInitialState(): Space {
  return createSpace();
}

export * from "./statuses";
export * from "./templates";
export * from "./factory";
export * from "./editorialCalendar";
export { uid } from "./ids";
