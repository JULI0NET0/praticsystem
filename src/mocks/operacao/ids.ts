let counter = 0;

/** Gera um id único e estável dentro da sessão (mock). */
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}
