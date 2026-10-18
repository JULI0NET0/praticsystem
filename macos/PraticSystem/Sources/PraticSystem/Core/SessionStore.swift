import Foundation
import Observation
import Supabase

let supabase = SupabaseClient(
    supabaseURL: AppConfig.shared.supabaseURL,
    supabaseKey: AppConfig.shared.supabaseAnonKey,
    options: SupabaseClientOptions(
        auth: .init(
            storage: KeychainLocalStorage(service: "com.praticlabs.praticsystem.auth"),
            emitLocalSessionAsInitialSession: true
        )
    )
)

struct StaffProfile: Decodable, Sendable {
    let id: UUID
    let name: String
    let email: String
    let username: String?
    let avatarURL: String?

    enum CodingKeys: String, CodingKey {
        case id, name, email, username
        case avatarURL = "avatar_url"
    }
}

@MainActor
@Observable
final class SessionStore {
    enum Phase: Equatable {
        case loading
        case signedOut
        case signedIn
    }

    private(set) var phase: Phase = .loading
    private(set) var profile: StaffProfile?

    /// Sessão separada para o WebView, criada no login. Os módulos web e o app
    /// nativo não podem compartilhar o mesmo refresh token: o Supabase revoga a
    /// família inteira quando o mesmo token é reutilizado.
    private(set) var webSessionJSON: String?

    func start() async {
        for await (event, session) in supabase.auth.authStateChanges {
            switch event {
            case .initialSession, .signedIn, .tokenRefreshed, .userUpdated:
                if let session, !session.isExpired {
                    if profile == nil { await loadProfile(userID: session.user.id) }
                    phase = profile == nil ? .signedOut : .signedIn
                } else {
                    phase = .signedOut
                }
            case .signedOut:
                profile = nil
                phase = .signedOut
            default:
                break
            }
        }
    }

    /// Aceita e-mail ou @usuário, como a tela de login da web.
    func signIn(login: String, password: String) async throws {
        let email = try await resolveEmail(login)
        try await supabase.auth.signIn(email: email, password: password)
        webSessionJSON = try? await mintWebSession(email: email, password: password)
        let user = try await supabase.auth.session.user
        await loadProfile(userID: user.id)
        guard profile != nil else {
            try? await supabase.auth.signOut(scope: .local)
            throw LoginError.notStaff
        }
        phase = .signedIn
    }

    /// `.local` encerra só este app; a sessão do navegador continua valendo.
    func signOut() async {
        try? await supabase.auth.signOut(scope: .local)
        webSessionJSON = nil
        await WebSessionBridge.clearWebData()
    }

    private func resolveEmail(_ login: String) async throws -> String {
        let trimmed = login.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.contains("@") && !trimmed.hasPrefix("@") { return trimmed }

        struct Row: Decodable { let email: String }
        let username = trimmed.replacingOccurrences(of: "@", with: "").lowercased()
        let rows: [Row] = try await supabase
            .from("users")
            .select("email")
            .eq("username", value: username)
            .limit(1)
            .execute()
            .value
        guard let email = rows.first?.email else { throw LoginError.userNotFound }
        return email
    }

    private func loadProfile(userID: UUID) async {
        let rows: [StaffProfile]? = try? await supabase
            .from("users")
            .select("id, name, email, username, avatar_url")
            .eq("id", value: userID)
            .limit(1)
            .execute()
            .value
        profile = rows?.first
    }

    private func mintWebSession(email: String, password: String) async throws -> String {
        let webAuth = AuthClient(
            url: AppConfig.shared.supabaseURL.appendingPathComponent("auth/v1"),
            headers: ["apikey": AppConfig.shared.supabaseAnonKey],
            localStorage: InMemoryAuthStorage(),
            autoRefreshToken: false
        )
        let session = try await webAuth.signIn(email: email, password: password)
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        return String(decoding: try encoder.encode(session), as: UTF8.self)
    }
}

enum LoginError: LocalizedError {
    case userNotFound
    case notStaff

    var errorDescription: String? {
        switch self {
        case .userNotFound: "Usuário não encontrado."
        case .notStaff: "Este app é só para a equipe. Clientes usam o portal na web."
        }
    }
}

private final class InMemoryAuthStorage: AuthLocalStorage, @unchecked Sendable {
    private var values: [String: Data] = [:]
    private let lock = NSLock()

    func store(key: String, value: Data) throws { lock.withLock { values[key] = value } }
    func retrieve(key: String) throws -> Data? { lock.withLock { values[key] } }
    func remove(key: String) throws { lock.withLock { _ = values.removeValue(forKey: key) } }
}
