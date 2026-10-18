import Foundation

/// Porte de src/lib/demandSort.ts (compareDemandsInGroup):
///   1. concluídas afundam para o fim;
///   2. depois prioridade (urgente primeiro);
///   3. depois prazo mais próximo (sem prazo vai para o fim).
func demandPrecedes(_ a: Demand, _ b: Demand) -> Bool {
    if a.isDone != b.isDone { return !a.isDone }
    if a.priority.order != b.priority.order { return a.priority.order < b.priority.order }
    return (a.dueDate ?? "9999") < (b.dueDate ?? "9999")
}

/// Porte de deriveStatusFields (src/lib/demandState.ts): o que a trigger
/// `demands_sync_derived` vai calcular, aplicado antes para a interface não
/// ficar meio-atualizada enquanto o servidor responde.
func applyingStatus(_ statusID: String, to demand: Demand, statuses: [DemandStatus], now: Date = .now) -> Demand {
    var updated = demand
    updated.status = statusID
    guard let category = statuses.first(where: { $0.id == statusID })?.category else { return updated }
    updated.statusCategory = category
    updated.completedAt = category == "fechado" ? now.ISO8601Format() : nil
    return updated
}
