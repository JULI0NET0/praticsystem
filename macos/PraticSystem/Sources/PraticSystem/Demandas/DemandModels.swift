import Foundation
import SwiftUI

enum DemandPriority: String, Codable, CaseIterable, Sendable {
    case none, low, medium, high, urgent

    /// Mesmo PRIORITY_ORDER de src/types/demandas.ts: urgente primeiro.
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

    var color: Color? {
        switch self {
        case .urgent: .red
        case .high: .praticOrange
        case .medium: .yellow
        case .low: .secondary
        case .none: nil
        }
    }
}

struct DemandStatus: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let label: String
    let color: String
    let category: String
    let position: Int

    var isClosed: Bool { category == "fechado" }
}

struct DemandClient: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let nomeFantasia: String?

    enum CodingKeys: String, CodingKey {
        case id, name
        case nomeFantasia = "nome_fantasia"
    }

    var displayName: String {
        if let nomeFantasia, !nomeFantasia.isEmpty { return nomeFantasia }
        return name
    }
}

struct Demand: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    var title: String
    var clientID: UUID?
    var scope: String
    var status: String
    var statusCategory: String
    var priority: DemandPriority
    var assigneeIDs: [UUID]
    var dueDate: String?
    var dueTime: String?
    var completedAt: String?
    var createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, title, scope, status, priority
        case clientID = "client_id"
        case statusCategory = "status_category"
        case assigneeIDs = "assignee_ids"
        case dueDate = "due_date"
        case dueTime = "due_time"
        case completedAt = "completed_at"
        case createdAt = "created_at"
    }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? ""
        clientID = try c.decodeIfPresent(UUID.self, forKey: .clientID)
        scope = try c.decodeIfPresent(String.self, forKey: .scope) ?? "internal"
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "pending"
        statusCategory = try c.decodeIfPresent(String.self, forKey: .statusCategory) ?? "nao_iniciado"
        let rawPriority = try c.decodeIfPresent(String.self, forKey: .priority) ?? "none"
        priority = DemandPriority(rawValue: rawPriority) ?? .none
        assigneeIDs = try c.decodeIfPresent([UUID].self, forKey: .assigneeIDs) ?? []
        dueDate = try c.decodeIfPresent(String.self, forKey: .dueDate)
        dueTime = try c.decodeIfPresent(String.self, forKey: .dueTime)
        completedAt = try c.decodeIfPresent(String.self, forKey: .completedAt)
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt)
    }

    init(
        id: UUID = UUID(), title: String, status: String = "pending",
        statusCategory: String = "nao_iniciado", priority: DemandPriority = .none, dueDate: String? = nil
    ) {
        self.id = id
        self.title = title
        self.clientID = nil
        self.scope = "internal"
        self.status = status
        self.statusCategory = statusCategory
        self.priority = priority
        self.assigneeIDs = []
        self.dueDate = dueDate
        self.dueTime = nil
        self.completedAt = nil
        self.createdAt = nil
    }

    var isDone: Bool { statusCategory == "fechado" }
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
