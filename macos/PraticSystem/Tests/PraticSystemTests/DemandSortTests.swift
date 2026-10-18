import Foundation
import Testing
@testable import PraticSystem

/// Mesmos casos de src/lib/demandSort.test.ts e demandState.test.ts.
struct DemandSortTests {
    let statuses = [
        DemandStatus(id: "pending", label: "A fazer", color: "#8a8a83", category: "nao_iniciado", position: 0),
        DemandStatus(id: "in_production", label: "Em produção", color: "#d97757", category: "ativo", position: 1),
        DemandStatus(id: "completed", label: "Concluído", color: "#6a7f8f", category: "fechado", position: 4),
    ]

    @Test func concluidasVaoParaOFim() {
        let done = Demand(title: "feita", statusCategory: "fechado", priority: .urgent)
        let open = Demand(title: "aberta", priority: .low)
        #expect([done, open].sorted(by: demandPrecedes).map(\.title) == ["aberta", "feita"])
    }

    @Test func prioridadeAntesDoPrazo() {
        let urgent = Demand(title: "urgente", priority: .urgent, dueDate: "2026-12-31")
        let low = Demand(title: "baixa", priority: .low, dueDate: "2026-01-01")
        #expect([low, urgent].sorted(by: demandPrecedes).map(\.title) == ["urgente", "baixa"])
    }

    @Test func prazoMaisProximoPrimeiroESemPrazoPorUltimo() {
        let late = Demand(title: "depois", dueDate: "2026-11-20")
        let soon = Demand(title: "antes", dueDate: "2026-10-20")
        let none = Demand(title: "sem prazo")
        #expect([none, late, soon].sorted(by: demandPrecedes).map(\.title) == ["antes", "depois", "sem prazo"])
    }

    @Test func concluirPreencheCategoriaEDataDeConclusao() {
        let demand = Demand(title: "x")
        let updated = applyingStatus("completed", to: demand, statuses: statuses)
        #expect(updated.statusCategory == "fechado")
        #expect(updated.completedAt != nil)
    }

    @Test func reabrirLimpaDataDeConclusao() {
        var demand = Demand(title: "x", status: "completed", statusCategory: "fechado")
        demand.completedAt = "2026-10-01T10:00:00Z"
        let updated = applyingStatus("in_production", to: demand, statuses: statuses)
        #expect(updated.statusCategory == "ativo")
        #expect(updated.completedAt == nil)
    }

    @Test func statusDesconhecidoSoTrocaOStatus() {
        let demand = Demand(title: "x")
        let updated = applyingStatus("inexistente", to: demand, statuses: statuses)
        #expect(updated.status == "inexistente")
        #expect(updated.statusCategory == "nao_iniciado")
    }
}
