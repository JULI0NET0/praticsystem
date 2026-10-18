import Foundation
import Observation
import Supabase

struct TeamMember: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let email: String
    let username: String?
    let avatarURL: String?
    let phone: String?

    enum CodingKeys: String, CodingKey {
        case id, name, email, username, phone
        case avatarURL = "avatar_url"
    }

    var initials: String {
        let parts = name.split(separator: " ")
        let letters = parts.prefix(2).compactMap(\.first)
        return letters.isEmpty ? "?" : String(letters).uppercased()
    }

    var firstName: String { name.split(separator: " ").first.map(String.init) ?? name }
}

/// A equipe (public.users): responsáveis, avatares e menções.
@MainActor
@Observable
final class TeamStore {
    private(set) var members: [TeamMember] = []

    func load() async {
        let rows: [TeamMember]? = try? await supabase
            .from("users")
            .select("id, name, email, username, avatar_url, phone")
            .order("name")
            .execute()
            .value
        if let rows { members = rows }
    }

    func member(_ id: UUID) -> TeamMember? { members.first { $0.id == id } }

    func members(_ ids: [UUID]) -> [TeamMember] { ids.compactMap(member) }
}
