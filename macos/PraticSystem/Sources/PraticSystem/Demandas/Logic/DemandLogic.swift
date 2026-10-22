import Foundation

// Portes de src/lib/demandFilters.ts, points.ts, demandAgendaSync.ts e dos
// helpers de RescheduleOverdueMenu.tsx / DemandasProvider.tsx.

enum DemandLane: String, CaseIterable, Sendable {
    case geral, conteudo

    var label: String { self == .geral ? "Geral" : "Conteúdo" }
}

struct DemandFilters: Equatable, Sendable {
    var lane: DemandLane = .geral
    var scope: DemandScopeFilter = .all
    var clientID: UUID?
    var assigneeID: UUID?
    var priority: DemandPriority?
    var status: String?
    var contentType: String?
    var search = ""
    var hideCompleted = false
    var todayOnly = false

    var activeCount: Int {
        [clientID != nil, assigneeID != nil, priority != nil, status != nil, contentType != nil, hideCompleted, todayOnly]
            .filter { $0 }.count
    }
}

/// Post de cronograma (captação e roteiro são tarefas de produção).
func isScheduledContent(_ demand: Demand) -> Bool {
    guard demand.planID != nil else { return false }
    return demand.planRole != "captacao" && demand.planRole != "roteiro"
}

struct DemandFilterContext {
    /// Preenchido só com "só hoje" ligado.
    var todayISO: String?
    /// Nome e nome fantasia do cliente, em minúsculas.
    var clientHaystack: String
    /// nil = cronogramas ainda não carregaram.
    var registeredPlanIDs: Set<UUID>?
}

func demandMatchesFilters(_ demand: Demand, _ filters: DemandFilters, _ ctx: DemandFilterContext) -> Bool {
    let scheduled = isScheduledContent(demand)
    if filters.lane == .conteudo {
        guard scheduled, let planID = demand.planID, ctx.registeredPlanIDs?.contains(planID) == true else { return false }
    } else if scheduled {
        return false
    }

    if filters.lane != .conteudo, filters.scope != .all, demand.scope != filters.scope.rawValue { return false }
    if let clientID = filters.clientID, demand.clientID != clientID { return false }
    if let status = filters.status, demand.status != status { return false }
    if let priority = filters.priority, demand.priority != priority { return false }
    if let contentType = filters.contentType, demand.contentType != contentType { return false }
    if filters.hideCompleted, demand.statusCategory == "fechado" { return false }
    if let today = ctx.todayISO, demand.dueDate != today { return false }
    if let assignee = filters.assigneeID, !(demand.assigneeIDs.contains(assignee) || demand.assignAllTeam) { return false }

    let term = filters.search.trimmingCharacters(in: .whitespaces).lowercased()
    if !term.isEmpty, !"\(demand.title) \(ctx.clientHaystack)".lowercased().contains(term) { return false }
    return true
}

/// Mesmo critério do trigger demands_award_points: concluiu até o dia do prazo
/// (no fuso de São Paulo).
func isOnTime(dueDate: String?, completedAt: String?) -> Bool {
    guard let dueDate, let completedAt, let date = DueDate.parseTimestamp(completedAt) else { return false }
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
    let c = calendar.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!) <= dueDate
}

enum Points {
    static let demandCompleted = 10
    static let checklistItemCompleted = 2
    static let onTimeBonus = 5
}

/// Demandas abertas com prazo antes de hoje.
func openOverdueDemands(_ demands: [Demand], now: Date = .now) -> [Demand] {
    let today = DueDate.toISO(now)
    return demands.filter { !$0.isDone && ($0.dueDate.map { $0 < today } ?? false) }
}

/// Próxima segunda-feira; se hoje é segunda, a da semana seguinte.
func nextMondayISO(now: Date = .now) -> String {
    let weekday = DueDate.calendar.component(.weekday, from: now) - 1
    let delta = weekday == 0 ? 1 : 8 - weekday
    return DueDate.toISO(DueDate.addDays(now, delta))
}

enum ReschedulePreset: String, CaseIterable, Sendable {
    case hoje, amanha, proximaSemana = "proxima_semana"

    var label: String {
        switch self {
        case .hoje: "Hoje"
        case .amanha: "Amanhã"
        case .proximaSemana: "Próxima semana"
        }
    }

    func date(now: Date = .now) -> String {
        switch self {
        case .hoje: DueDate.toISO(now)
        case .amanha: DueDate.toISO(DueDate.addDays(now, 1))
        case .proximaSemana: nextMondayISO(now: now)
        }
    }
}

/// Id de status novo a partir do rótulo (slugifyStatus).
func slugifyStatus(_ label: String) -> String {
    let base = DueDate.normalize(label)
        .replacing(/[^a-z0-9]+/, with: "_")
        .replacing(/^_+|_+$/, with: "")
    let slug = String(base.prefix(40))
    return slug.isEmpty ? "status_\(Int(Date.now.timeIntervalSince1970 * 1000))" : slug
}

// MARK: - Espelho na Agenda (demandAgendaSync.ts)

struct AgendaMirrorPayload: Equatable, Sendable {
    let title: String
    let type: AgendaSubject
    /// Instante em ISO (UTC).
    let date: String
    let clientID: UUID?
    let assignedTo: UUID?
    let visibility: String
    let description: String
}

enum AgendaMirrorPlan: Equatable, Sendable {
    case none
    case clear
    case upsert(AgendaMirrorPayload)
}

func computeAgendaMirror(_ demand: Demand) -> AgendaMirrorPlan {
    let hadLink = demand.agendaEvent != nil
    guard let subject = demand.agendaSubject, let due = demand.dueDate,
          let day = DueDate.fromISO(due) else {
        return hadLink ? .clear : .none
    }
    let time = (demand.dueTime?.isEmpty == false ? demand.dueTime! : "12:00:00")
    let parts = time.split(separator: ":").compactMap { Int($0) }
    guard parts.count >= 2,
          let date = DueDate.calendar.date(bySettingHour: parts[0], minute: parts[1], second: parts.count > 2 ? parts[2] : 0, of: day) else {
        return hadLink ? .clear : .none
    }
    let visibility = subject.syncsWithGoogle || demand.assignAllTeam ? "public" : "private"
    return .upsert(AgendaMirrorPayload(
        title: demand.title,
        type: subject,
        date: isoTimestamp(date),
        clientID: demand.clientID,
        assignedTo: demand.assigneeIDs.first,
        visibility: visibility,
        description: "Gerado a partir da demanda: \(demand.title)"
    ))
}

/// Igual ao Date.toISOString() do JS: UTC com milissegundos.
func isoTimestamp(_ date: Date) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.string(from: date)
}
