import Foundation
import Testing
@testable import PraticSystem

/// Casos de demandFilters.test.ts, RescheduleOverdueMenu.test.ts,
/// whatsappDemandSummary.test.ts e das regras de agenda e pontos.
struct DemandLogicTests {
    let now = Calendar.current.date(from: DateComponents(year: 2026, month: 8, day: 26, hour: 12))!
    let plan = UUID()
    let u1 = UUID()
    let u2 = UUID()

    func demand(
        title: String = "Fazer arte", scope: String = "client", planRole: String? = nil, plan: UUID? = nil,
        assignees: [UUID]? = nil, allTeam: Bool = false, due: String? = nil, category: String = "nao_iniciado"
    ) -> Demand {
        var d = Demand(title: title, statusCategory: category, dueDate: due)
        d.scope = scope
        d.planID = plan
        d.planRole = planRole
        d.assigneeIDs = assignees ?? [u1]
        d.assignAllTeam = allTeam
        return d
    }

    func match(_ d: Demand, _ f: DemandFilters = DemandFilters(), plans: Set<UUID>?? = .none) -> Bool {
        let registered: Set<UUID>? = plans ?? [plan]
        return demandMatchesFilters(d, f, DemandFilterContext(todayISO: f.todayOnly ? "2026-10-09" : nil, clientHaystack: "acme studio", registeredPlanIDs: registered))
    }

    @Test func conteudoAgendado() {
        #expect(isScheduledContent(demand(planRole: "post", plan: plan)))
        #expect(isScheduledContent(demand(plan: plan)))
        #expect(!isScheduledContent(demand(planRole: "captacao", plan: plan)))
        #expect(!isScheduledContent(demand(planRole: "roteiro", plan: plan)))
        #expect(!isScheduledContent(demand()))
    }

    @Test func geraisEscondemPost() {
        #expect(!match(demand(planRole: "post", plan: plan)))
        #expect(match(demand(planRole: "captacao", plan: plan)))
        #expect(match(demand(planRole: "roteiro", plan: plan)))
        #expect(match(demand()))
    }

    @Test func conteudosMostramPostCadastrado() {
        var f = DemandFilters()
        f.lane = .conteudo
        #expect(match(demand(planRole: "post", plan: plan, assignees: [UUID()]), f))
        #expect(!match(demand(planRole: "captacao", plan: plan), f))
        #expect(!match(demand(), f))
        #expect(!match(demand(planRole: "post", plan: UUID()), f))
        #expect(!match(demand(planRole: "post", plan: plan), f, plans: .some(nil)))
    }

    @Test func responsavelEmConteudos() {
        var f = DemandFilters()
        f.lane = .conteudo
        f.assigneeID = u1
        #expect(!match(demand(planRole: "post", plan: plan, assignees: [u2]), f))
        f.assigneeID = u2
        #expect(match(demand(planRole: "post", plan: plan, assignees: [u2]), f))
        f.assigneeID = u1
        #expect(match(demand(planRole: "post", plan: plan, assignees: [], allTeam: true), f))
    }

    @Test func escopo() {
        var f = DemandFilters()
        f.lane = .conteudo
        f.scope = .internalOnly
        #expect(match(demand(planRole: "post", plan: plan), f))
        f.lane = .geral
        f.scope = .client
        #expect(!match(demand(scope: "internal"), f))
        #expect(match(demand(scope: "client"), f))
    }

    @Test func buscaIncluiCliente() {
        var f = DemandFilters()
        f.search = "ACME"
        #expect(match(demand(), f))
        f.search = "zzz"
        #expect(!match(demand(), f))
    }

    @Test func reagendamento() {
        #expect(ReschedulePreset.hoje.date(now: now) == "2026-08-26")
        #expect(ReschedulePreset.amanha.date(now: now) == "2026-08-27")
        #expect(nextMondayISO(now: now) == "2026-08-31")
        #expect(ReschedulePreset.proximaSemana.date(now: now) == "2026-08-31")
        let monday = Calendar.current.date(from: DateComponents(year: 2026, month: 8, day: 31, hour: 9))!
        let sunday = Calendar.current.date(from: DateComponents(year: 2026, month: 8, day: 30, hour: 9))!
        #expect(nextMondayISO(now: monday) == "2026-09-07")
        #expect(nextMondayISO(now: sunday) == "2026-08-31")
    }

    @Test func atrasadasAbertas() {
        let items = [
            demand(title: "aberta-ontem", due: "2026-08-25"),
            demand(title: "aberta-hoje", due: "2026-08-26"),
            demand(title: "concluida", due: "2026-08-20", category: "fechado"),
            demand(title: "sem-prazo"),
        ]
        #expect(openOverdueDemands(items, now: now).map(\.title) == ["aberta-ontem"])
    }

    @Test func slugDeStatus() {
        #expect(slugifyStatus("Em Revisão do Cliente") == "em_revisao_do_cliente")
        #expect(slugifyStatus("  --Aprovado!! ") == "aprovado")
        #expect(slugifyStatus("???").hasPrefix("status_"))
    }

    @Test func noPrazoNoFusoDeSaoPaulo() {
        #expect(isOnTime(dueDate: "2026-08-25", completedAt: "2026-08-26T02:00:00Z")) // 23h em SP
        #expect(!isOnTime(dueDate: "2026-08-25", completedAt: "2026-08-26T04:00:00Z"))
        #expect(!isOnTime(dueDate: nil, completedAt: "2026-08-26T02:00:00Z"))
    }

    @Test func espelhoNaAgenda() {
        var d = demand(due: "2026-08-26")
        #expect(computeAgendaMirror(d) == .none)
        d.agendaSubject = .meeting
        guard case .upsert(let payload) = computeAgendaMirror(d) else { Issue.record("esperava upsert"); return }
        #expect(payload.visibility == "public")
        #expect(payload.assignedTo == u1)
        #expect(payload.date.hasSuffix("Z"))
        d.agendaSubject = .task
        guard case .upsert(let privatePayload) = computeAgendaMirror(d) else { Issue.record("esperava upsert"); return }
        #expect(privatePayload.visibility == "private")
        d.agendaSubject = nil
        d.agendaEvent = AgendaMirrorRef(id: UUID())
        #expect(computeAgendaMirror(d) == .clear)
    }

    @Test func resumoWhatsApp() {
        let c1 = DemandClient(id: UUID(), name: "CAVEZZO MOVEIS LTDA", nomeFantasia: "CAVEZZO MOVEIS")
        let c2 = DemandClient(id: UUID(), name: "RECLOSET BAZAR E MODA", nomeFantasia: "RECLOSET BAZAR")
        let julio = TeamMember(id: u1, name: "Julio Neto", email: "", username: "julioneto", avatarURL: nil, phone: "11999998888")
        var d1 = demand(title: "DRIVE IMAGENS COLD", due: "2026-08-27", category: "ativo")
        d1.clientID = c1.id
        d1.priority = .urgent
        var d2 = d1
        d2 = Demand(title: "DRIVE IMAGENS COLD", statusCategory: "ativo", priority: .urgent, dueDate: "2026-08-27")
        d2.scope = "client"
        d2.clientID = c2.id
        d2.assigneeIDs = [u1]
        let reference = Calendar.current.date(from: DateComponents(year: 2026, month: 8, day: 27))!

        var options = WhatsAppSummary.Options(demands: [d1, d2])
        options.clients = [c1, c2]
        options.users = [julio]
        options.target = .member(u1)
        options.referenceDate = reference
        let text = WhatsAppSummary.generate(options)
        #expect(text.contains("Olá *Julio Neto*, segue seu resumo de demandas:"))
        #expect(text.contains("*DEMANDAS DE HOJE* - Quinta-feira, _27/08/2026_"))
        #expect(text.contains("*Total:* 2 demandas (🟥 2)"))
        #expect(text.contains("🟥 *URGENTE*"))
        #expect(text.contains("• *CAVEZZO MOVEIS* | DRIVE IMAGENS COLD"))
        #expect(text.contains("• *RECLOSET BAZAR* | DRIVE IMAGENS COLD"))
        #expect(WhatsAppSummary.shareURL("Olá!", phone: "11999998888").absoluteString == "https://wa.me/5511999998888?text=Ol%C3%A1!")
    }

    @Test func checklistPorEtapa() {
        let demandID = UUID()
        func item(_ group: String, _ label: String, _ position: Double, done: Bool = false) -> DemandChecklistItem {
            DemandChecklistItem(id: UUID(), demandID: demandID, groupName: group, label: label, done: done, position: position)
        }
        let groups = groupChecklist([item("Edição", "b", 3), item("Roteiro", "a", 1, done: true), item("Edição", "a", 2)])
        #expect(groups.map(\.name) == ["Roteiro", "Edição"])
        #expect(groups[1].items.map(\.label) == ["a", "b"])
        #expect(groups[0].done == 1)
    }

    @Test func tokenDePrioridade() {
        #expect(parsePriorityToken("P1") == .urgent)
        #expect(parsePriorityToken("baixa") == .low)
        #expect(parsePriorityToken("p5") == DemandPriority.none)
        #expect(parsePriorityToken("x") == nil)
    }
}
