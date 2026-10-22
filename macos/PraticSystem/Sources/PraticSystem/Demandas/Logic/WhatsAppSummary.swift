import Foundation

/// Porte de src/lib/whatsappDemandSummary.ts.
enum WhatsAppSummary {
    enum Grouping: String, CaseIterable, Sendable {
        case assignee, priority

        var label: String { self == .assignee ? "Por responsável" : "Por prioridade" }
    }

    enum DateScope: String, CaseIterable, Sendable {
        case today, overdueAndToday = "overdue_and_today", openAll = "open_all", selected

        var label: String {
            switch self {
            case .today: "Hoje"
            case .overdueAndToday: "Hoje e atrasadas"
            case .openAll: "Todas em aberto"
            case .selected: "Selecionadas"
            }
        }
    }

    enum Target: Hashable, Sendable {
        case all, unassigned, member(UUID)
    }

    struct Options {
        var demands: [Demand]
        var clients: [DemandClient] = []
        var users: [TeamMember] = []
        var statuses: [DemandStatus] = []
        var dateScope: DateScope = .today
        var selectedIDs: Set<UUID> = []
        var grouping: Grouping = .assignee
        var target: Target = .all
        var allowedPriorities: Set<DemandPriority> = Set(DemandPriority.allCases)
        var includeTime = true
        var includeClient = true
        var includeStatus = false
        var includeChecklist = true
        var customTitle: String?
        var referenceDate: Date = .now
    }

    private static let config: [DemandPriority: (label: String, emoji: String)] = [
        .urgent: ("URGENTE", "🟥"), .high: ("ALTA", "🟧"), .medium: ("MÉDIO", "🟨"), .low: ("BAIXA", "🟩"), .none: ("OUTRAS", "⬜"),
    ]
    private static let ordered: [DemandPriority] = [.urgent, .high, .medium, .low, .none]
    private static let weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]

    private static func displayDate(_ date: Date) -> String {
        let c = DueDate.calendar.dateComponents([.weekday, .day, .month, .year], from: date)
        return String(format: "%@, _%02d/%02d/%04d_", weekdays[c.weekday! - 1], c.day!, c.month!, c.year!)
    }

    static func filter(_ options: Options) -> [Demand] {
        let today = DueDate.toISO(options.referenceDate)
        return options.demands.filter { d in
            guard options.allowedPriorities.contains(d.priority) else { return false }
            switch options.dateScope {
            case .selected: guard options.selectedIDs.contains(d.id) else { return false }
            case .today: guard !d.isDone, d.dueDate == today else { return false }
            case .overdueAndToday: guard !d.isDone, let due = d.dueDate, due <= today else { return false }
            case .openAll: guard !d.isDone else { return false }
            }
            switch options.target {
            case .all: return true
            case .unassigned: return d.assigneeIDs.isEmpty && !d.assignAllTeam
            case .member(let id): return d.assignAllTeam || d.assigneeIDs.contains(id)
            }
        }
    }

    private static func userName(_ id: UUID, _ users: [UUID: TeamMember]) -> String {
        guard let user = users[id] else { return "Equipe" }
        if !user.name.isEmpty { return user.name }
        if let username = user.username { return "@\(username)" }
        return user.email.isEmpty ? "Equipe" : user.email
    }

    private static func assigneeNames(_ d: Demand, _ users: [UUID: TeamMember]) -> String {
        if d.assignAllTeam { return "Toda a equipe" }
        if d.assigneeIDs.isEmpty { return "Sem responsável" }
        return d.assigneeIDs.map { userName($0, users) }.joined(separator: ", ")
    }

    private static func item(_ d: Demand, _ o: Options, clients: [UUID: DemandClient], statuses: [String: DemandStatus], assignee: String? = nil) -> String {
        var parts = ["•"]
        if let assignee { parts.append("*\(assignee)*:") }
        if o.includeClient {
            let name: String
            if d.scope == "internal" || d.clientID == nil { name = "PRATIC" } else {
                name = d.clientID.flatMap { clients[$0]?.displayName.uppercased() } ?? "PRATIC"
            }
            parts.append("*\(name)* |")
        }
        parts.append(d.title.trimmingCharacters(in: .whitespaces))
        var meta: [String] = []
        if o.includeTime, let time = d.dueTime, !time.isEmpty { meta.append("⏰ \(time)") }
        if o.includeChecklist, d.checklistTotal > 0 { meta.append("☑️ \(d.checklistDone)/\(d.checklistTotal)") }
        if o.includeStatus, let status = statuses[d.status] { meta.append("(\(status.label))") }
        if !meta.isEmpty { parts.append("(\(meta.joined(separator: " · ")))") }
        return parts.joined(separator: " ")
    }

    static func generate(_ o: Options) -> String {
        let clients = Dictionary(o.clients.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let users = Dictionary(o.users.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let statuses = Dictionary(o.statuses.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let filtered = filter(o)
        var lines: [String] = []

        var targetName: String?
        if case .member(let id) = o.target, let user = users[id] {
            targetName = !user.name.isEmpty ? user.name : (user.username.map { "@\($0)" } ?? "Colega")
        }
        let isIndividual: Bool = if case .member = o.target { true } else { false }
        if isIndividual, let targetName {
            lines.append("Olá *\(targetName)*, segue seu resumo de demandas:")
            lines.append("")
        }

        let defaultTitle = switch o.dateScope {
        case .today: "DEMANDAS DE HOJE"
        case .overdueAndToday: "DEMANDAS DE HOJE & ATRASADAS"
        case .selected: "DEMANDAS SELECIONADAS"
        case .openAll: "RESUMO DE DEMANDAS"
        }
        let title = o.customTitle.flatMap { $0.isEmpty ? nil : $0 } ?? defaultTitle
        lines.append("*\(title)* - \(displayDate(o.referenceDate))")

        let counts = Dictionary(grouping: filtered, by: \.priority).mapValues(\.count)
        var stats: [String] = []
        for priority in [DemandPriority.urgent, .high, .medium, .low] where (counts[priority] ?? 0) > 0 {
            stats.append("\(config[priority]!.emoji) \(counts[priority]!)")
        }
        if stats.isEmpty, (counts[.none] ?? 0) > 0 { stats.append("⬜ \(counts[.none]!)") }
        let suffix = stats.isEmpty ? "" : " (\(stats.joined(separator: " · ")))"
        lines.append("*Total:* \(filtered.count) demanda\(filtered.count == 1 ? "" : "s")\(suffix)")
        lines.append("")

        if filtered.isEmpty {
            lines.append("_Nenhuma demanda encontrada para os critérios selecionados._")
            return lines.joined(separator: "\n")
        }

        func appendByPriority(_ demands: [Demand], withAssignee: Bool, blankAfterEach: Bool) {
            for priority in ordered {
                let group = demands.filter { $0.priority == priority }
                guard !group.isEmpty else { continue }
                lines.append("\(config[priority]!.emoji) *\(config[priority]!.label)*")
                for d in group {
                    lines.append(item(d, o, clients: clients, statuses: statuses, assignee: withAssignee ? assigneeNames(d, users) : nil))
                }
                if blankAfterEach { lines.append("") }
            }
        }

        if o.grouping == .priority {
            appendByPriority(filtered, withAssignee: !isIndividual, blankAfterEach: true)
        } else if isIndividual {
            appendByPriority(filtered, withAssignee: false, blankAfterEach: true)
        } else {
            var groups: [(id: String, name: String, demands: [Demand])] = []
            for d in filtered {
                let keys = d.assignAllTeam ? ["all_team"] : (d.assigneeIDs.isEmpty ? ["unassigned"] : d.assigneeIDs.map(\.lower))
                for key in keys {
                    if let index = groups.firstIndex(where: { $0.id == key }) {
                        if !groups[index].demands.contains(where: { $0.id == d.id }) { groups[index].demands.append(d) }
                    } else {
                        let name = key == "all_team" ? "Toda a Equipe" : key == "unassigned" ? "Sem responsável" : userName(UUID(uuidString: key)!, users)
                        groups.append((key, name, [d]))
                    }
                }
            }
            groups.sort { a, b in
                if a.id == "all_team" { return true }
                if b.id == "all_team" { return false }
                if a.id == "unassigned" { return false }
                if b.id == "unassigned" { return true }
                return a.name.compare(b.name, locale: Locale(identifier: "pt_BR")) == .orderedAscending
            }
            for group in groups {
                lines.append("👤 *\(group.name)*")
                appendByPriority(group.demands, withAssignee: false, blankAfterEach: false)
                lines.append("")
            }
        }

        lines.append(isIndividual ? "💪 Bom trabalho!" : "🚀 Vamos pra cima!")
        return lines.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// wa.me/55… quando há telefone; senão api.whatsapp.com/send.
    static func shareURL(_ text: String, phone: String? = nil) -> URL {
        // Mesmo conjunto do encodeURIComponent.
        let allowed = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()")
        let encoded = text.addingPercentEncoding(withAllowedCharacters: allowed) ?? ""
        if let phone {
            let digits = phone.filter(\.isNumber)
            if digits.count >= 10 {
                let full = digits.count == 10 || digits.count == 11 ? "55\(digits)" : digits
                return URL(string: "https://wa.me/\(full)?text=\(encoded)")!
            }
        }
        return URL(string: "https://api.whatsapp.com/send?text=\(encoded)")!
    }
}
