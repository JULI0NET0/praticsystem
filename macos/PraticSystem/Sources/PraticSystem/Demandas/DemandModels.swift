import Foundation
import Supabase
import SwiftUI

enum DemandPriority: String, Codable, CaseIterable, Sendable {
    case urgent, high, medium, low, none

    /// PRIORITY_ORDER de src/types/demandas.ts: urgente primeiro.
    var order: Int {
        switch self {
        case .urgent: 0
        case .high: 1
        case .medium: 2
        case .low: 3
        case .none: 4
        }
    }

    var label: String {
        switch self {
        case .none: "Sem prioridade"
        case .low: "Baixa"
        case .medium: "Média"
        case .high: "Alta"
        case .urgent: "Urgente"
        }
    }

    /// PRIORITY_SHORT (atalho digitável no título).
    var short: String {
        switch self {
        case .urgent: "P1"
        case .high: "P2"
        case .medium: "P3"
        case .low: "P4"
        case .none: "P5"
        }
    }

    /// PRIORITY_COLORS da web.
    var color: Color {
        switch self {
        case .none: Color(hex: "#8a8a83")
        case .low: Color(hex: "#4f7fb8")
        case .medium: Color(hex: "#c98a1e")
        case .high: Color(hex: "#e0642f")
        case .urgent: Color(hex: "#c0271b")
        }
    }
}

/// Assunto que faz a demanda aparecer na Agenda (demandAgendaSync.ts).
enum AgendaSubject: String, Codable, CaseIterable, Sendable {
    case meeting, prospecting, task, demand

    var label: String {
        switch self {
        case .meeting: "Reunião"
        case .prospecting: "Captação"
        case .task: "Tarefa"
        case .demand: "Demanda"
        }
    }

    /// Só reunião e captação vão para o Google Agenda (AGENDA_GOOGLE_SYNC_SUBJECTS).
    var syncsWithGoogle: Bool { self == .meeting || self == .prospecting }
}

enum DemandScopeFilter: String, CaseIterable, Sendable {
    case all, client, internalOnly = "internal"

    var label: String {
        switch self {
        case .all: "Todas"
        case .client: "Clientes"
        case .internalOnly: "Internas"
        }
    }
}

struct DemandStatus: Codable, Identifiable, Hashable, Sendable {
    let id: String
    var label: String
    var color: String
    var category: String
    var position: Int

    var isClosed: Bool { category == "fechado" }

    static let categories: [(id: String, label: String)] = [
        ("nao_iniciado", "Não iniciado"),
        ("ativo", "Ativo"),
        ("fechado", "Fechado"),
    ]
}

struct DemandClient: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let nomeFantasia: String?
    var status: String?

    enum CodingKeys: String, CodingKey {
        case id, name, status
        case nomeFantasia = "nome_fantasia"
    }

    var displayName: String {
        if let nomeFantasia, !nomeFantasia.isEmpty { return nomeFantasia }
        return name
    }
}

struct AgendaMirrorRef: Codable, Hashable, Sendable {
    let id: UUID
    var googleEventID: String?
    var googleAccount: String?
    var status: String?

    enum CodingKeys: String, CodingKey {
        case id, status
        case googleEventID = "google_event_id"
        case googleAccount = "google_account"
    }
}

/// Colunas lidas de `demands` (mais os agregados embutidos).
let demandColumns = "*, demand_comments(count), demand_attachments(count), agenda_events(id, google_event_id, google_account, status)"

struct Demand: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    var title: String
    var description: AnyJSON?
    var clientID: UUID?
    var scope: String
    var status: String
    var statusCategory: String
    var priority: DemandPriority
    var assigneeIDs: [UUID]
    var assignAllTeam: Bool
    var createdBy: UUID?
    var startDate: String?
    var dueDate: String?
    var dueTime: String?
    var position: Double
    var completedAt: String?
    var type: String?
    var createdAt: String?
    var updatedAt: String?
    var agendaSubject: AgendaSubject?
    var planID: UUID?
    var planRole: String?
    var contentType: String?

    // Agregados — só leitura
    var commentCount: Int
    var attachmentCount: Int
    var agendaEvent: AgendaMirrorRef?
    var checklistTotal: Int
    var checklistDone: Int

    enum CodingKeys: String, CodingKey {
        case id, title, description, scope, status, priority, position, type
        case clientID = "client_id"
        case statusCategory = "status_category"
        case assigneeIDs = "assignee_ids"
        case assignAllTeam = "assign_all_team"
        case createdBy = "created_by"
        case startDate = "start_date"
        case dueDate = "due_date"
        case dueTime = "due_time"
        case completedAt = "completed_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case agendaSubject = "agenda_subject"
        case planID = "plan_id"
        case planRole = "plan_role"
        case contentType = "content_type"
        case demandComments = "demand_comments"
        case demandAttachments = "demand_attachments"
        case agendaEvents = "agenda_events"
    }

    private struct CountRow: Decodable { let count: Int }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? ""
        description = try c.decodeIfPresent(AnyJSON.self, forKey: .description)
        clientID = try c.decodeIfPresent(UUID.self, forKey: .clientID)
        scope = try c.decodeIfPresent(String.self, forKey: .scope) ?? "internal"
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "pending"
        statusCategory = try c.decodeIfPresent(String.self, forKey: .statusCategory) ?? "nao_iniciado"
        priority = DemandPriority(rawValue: try c.decodeIfPresent(String.self, forKey: .priority) ?? "none") ?? .none
        assigneeIDs = try c.decodeIfPresent([UUID].self, forKey: .assigneeIDs) ?? []
        assignAllTeam = try c.decodeIfPresent(Bool.self, forKey: .assignAllTeam) ?? false
        createdBy = try c.decodeIfPresent(UUID.self, forKey: .createdBy)
        startDate = try c.decodeIfPresent(String.self, forKey: .startDate)
        dueDate = try c.decodeIfPresent(String.self, forKey: .dueDate)
        dueTime = try c.decodeIfPresent(String.self, forKey: .dueTime)
        position = try c.decodeIfPresent(Double.self, forKey: .position) ?? 0
        completedAt = try c.decodeIfPresent(String.self, forKey: .completedAt)
        type = try c.decodeIfPresent(String.self, forKey: .type)
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt)
        updatedAt = try c.decodeIfPresent(String.self, forKey: .updatedAt)
        agendaSubject = try c.decodeIfPresent(String.self, forKey: .agendaSubject).flatMap(AgendaSubject.init(rawValue:))
        planID = try c.decodeIfPresent(UUID.self, forKey: .planID)
        planRole = try c.decodeIfPresent(String.self, forKey: .planRole)
        contentType = try c.decodeIfPresent(String.self, forKey: .contentType)

        commentCount = (try? c.decodeIfPresent([CountRow].self, forKey: .demandComments))??.first?.count ?? 0
        attachmentCount = (try? c.decodeIfPresent([CountRow].self, forKey: .demandAttachments))??.first?.count ?? 0
        // O embed vem como objeto (1:1) ou lista, conforme a relação.
        if let single = try? c.decodeIfPresent(AgendaMirrorRef.self, forKey: .agendaEvents) {
            agendaEvent = single
        } else {
            agendaEvent = (try? c.decodeIfPresent([AgendaMirrorRef].self, forKey: .agendaEvents))??.first
        }
        checklistTotal = 0
        checklistDone = 0
    }

    func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(title, forKey: .title)
        try c.encodeIfPresent(description, forKey: .description)
        try c.encode(clientID, forKey: .clientID)
        try c.encode(status, forKey: .status)
        try c.encode(priority, forKey: .priority)
        try c.encode(assigneeIDs, forKey: .assigneeIDs)
        try c.encode(assignAllTeam, forKey: .assignAllTeam)
        try c.encode(startDate, forKey: .startDate)
        try c.encode(dueDate, forKey: .dueDate)
        try c.encode(dueTime, forKey: .dueTime)
        try c.encode(position, forKey: .position)
        try c.encode(agendaSubject, forKey: .agendaSubject)
    }

    init(
        id: UUID = UUID(), title: String, status: String = "pending",
        statusCategory: String = "nao_iniciado", priority: DemandPriority = .none, dueDate: String? = nil
    ) {
        self.id = id
        self.title = title
        self.description = nil
        self.clientID = nil
        self.scope = "internal"
        self.status = status
        self.statusCategory = statusCategory
        self.priority = priority
        self.assigneeIDs = []
        self.assignAllTeam = false
        self.createdBy = nil
        self.startDate = nil
        self.dueDate = dueDate
        self.dueTime = nil
        self.position = 0
        self.completedAt = nil
        self.type = nil
        self.createdAt = nil
        self.updatedAt = nil
        self.agendaSubject = nil
        self.planID = nil
        self.planRole = nil
        self.contentType = nil
        self.commentCount = 0
        self.attachmentCount = 0
        self.agendaEvent = nil
        self.checklistTotal = 0
        self.checklistDone = 0
    }

    var isDone: Bool { statusCategory == "fechado" }

    /// Mantém agregados e vínculo com a agenda quando o servidor devolve só `*`.
    func merging(server: Demand) -> Demand {
        var merged = server
        merged.commentCount = commentCount
        merged.attachmentCount = attachmentCount
        merged.checklistTotal = checklistTotal
        merged.checklistDone = checklistDone
        if merged.agendaEvent == nil { merged.agendaEvent = agendaEvent }
        return merged
    }
}

/// Campos que podem ir num PATCH de `demands`. Só o que foi alterado é
/// enviado — o resto (status_category, completed_at, scope…) a trigger deriva.
enum DemandField: Hashable, Sendable {
    case title(String)
    case description(AnyJSON)
    case client(UUID?)
    case status(String)
    case priority(DemandPriority)
    case assignees([UUID], allTeam: Bool)
    case startDate(String?)
    case dueDate(String?)
    case dueTime(String?)
    case agendaSubject(AgendaSubject?)
    case contentType(String?)
    case position(Double)

    var json: [String: AnyJSON] {
        func optional(_ value: String?) -> AnyJSON { value.map(AnyJSON.string) ?? .null }
        switch self {
        case .title(let value): return ["title": .string(value)]
        case .description(let value): return ["description": value]
        case .client(let value): return ["client_id": optional(value?.uuidString.lowercased())]
        case .status(let value): return ["status": .string(value)]
        case .priority(let value): return ["priority": .string(value.rawValue)]
        case .assignees(let ids, let allTeam):
            return ["assignee_ids": .array(ids.map { .string($0.uuidString.lowercased()) }), "assign_all_team": .bool(allTeam)]
        case .startDate(let value): return ["start_date": optional(value)]
        case .dueDate(let value): return ["due_date": optional(value)]
        case .dueTime(let value): return ["due_time": optional(value)]
        case .agendaSubject(let value): return ["agenda_subject": optional(value?.rawValue)]
        case .contentType(let value): return ["content_type": optional(value)]
        case .position(let value): return ["position": .double(value)]
        }
    }

    func apply(to demand: inout Demand) {
        switch self {
        case .title(let value): demand.title = value
        case .description(let value): demand.description = value
        case .client(let value):
            demand.clientID = value
            demand.scope = value == nil ? "internal" : "client"
        case .status(let value): demand.status = value
        case .priority(let value): demand.priority = value
        case .assignees(let ids, let allTeam):
            demand.assigneeIDs = allTeam ? [] : ids
            demand.assignAllTeam = allTeam
        case .startDate(let value): demand.startDate = value
        case .dueDate(let value): demand.dueDate = value
        case .dueTime(let value): demand.dueTime = value
        case .agendaSubject(let value): demand.agendaSubject = value
        case .contentType(let value): demand.contentType = value
        case .position(let value): demand.position = value
        }
    }
}

extension Array where Element == DemandField {
    var json: [String: AnyJSON] {
        reduce(into: [:]) { result, field in result.merge(field.json) { _, new in new } }
    }
}

struct DemandComment: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let demandID: UUID
    let userID: UUID
    var body: String
    var edited: Bool?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, body, edited
        case demandID = "demand_id"
        case userID = "user_id"
        case createdAt = "created_at"
    }
}

struct DemandAttachment: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let demandID: UUID
    let commentID: UUID?
    let userID: UUID?
    let name: String
    let filePath: String
    let fileType: String?
    let size: Int?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name, size
        case demandID = "demand_id"
        case commentID = "comment_id"
        case userID = "user_id"
        case filePath = "file_path"
        case fileType = "file_type"
        case createdAt = "created_at"
    }

    /// A web guarda o caminho no bucket; a URL pública sai dele.
    var url: URL? {
        if filePath.hasPrefix("http") { return URL(string: filePath) }
        return try? StorageService.publicURL(filePath, in: .demandAttachments)
    }
}

struct DemandChecklistItem: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let demandID: UUID
    var groupName: String
    var label: String
    var done: Bool
    var position: Double
    var doneAt: String?

    enum CodingKeys: String, CodingKey {
        case id, label, done, position
        case demandID = "demand_id"
        case groupName = "group_name"
        case doneAt = "done_at"
    }
}

struct DemandTemplate: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let kind: String
    let description: String?
    let position: Int
}

struct DemandTemplateItem: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let templateID: UUID
    let groupName: String
    let label: String
    let position: Double

    enum CodingKeys: String, CodingKey {
        case id, label, position
        case templateID = "template_id"
        case groupName = "group_name"
    }
}

struct ChecklistGroup: Identifiable, Hashable, Sendable {
    var id: String { name }
    let name: String
    let items: [DemandChecklistItem]
    var done: Int { items.filter(\.done).count }
}

/// groupChecklist (types/demandas.ts): etapas na ordem de `position`.
func groupChecklist(_ items: [DemandChecklistItem]) -> [ChecklistGroup] {
    var order: [String] = []
    var groups: [String: [DemandChecklistItem]] = [:]
    for item in items.sorted(by: { $0.position < $1.position }) {
        if groups[item.groupName] == nil { order.append(item.groupName) }
        groups[item.groupName, default: []].append(item)
    }
    return order.map { ChecklistGroup(name: $0, items: groups[$0]!) }
}

extension Color {
    /// Laranja Pratic #F2581A (pratic-design-system.md)
    static let praticOrange = Color(hex: "#F2581A")

    /// Aceita "#RRGGBB", o formato de demand_statuses.color.
    init(hex: String) {
        let value = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0x8A8A83
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}

extension UUID {
    var lower: String { uuidString.lowercased() }
}
