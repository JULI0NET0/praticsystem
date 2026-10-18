import Foundation
import Supabase

/// Chamadas às rotas /api da web — as que dependem de segredos do servidor
/// (service role, Asaas, Google). Vão sempre com o access token da sessão,
/// que as rotas validam em src/lib/apiAuth.ts.
enum APIClient {
    struct APIError: LocalizedError {
        let status: Int
        let message: String
        var errorDescription: String? { message }
    }

    static func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        try await send(path, method: "GET", query: query, body: Optional<Data>.none)
    }

    static func post<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        try await send(path, method: "POST", body: try JSONEncoder().encode(body))
    }

    static func put<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        try await send(path, method: "PUT", body: try JSONEncoder().encode(body))
    }

    static func delete<T: Decodable>(_ path: String) async throws -> T {
        try await send(path, method: "DELETE", body: Optional<Data>.none)
    }

    /// Para rotas cuja resposta não interessa.
    static func fire(_ path: String, method: String = "POST", body: some Encodable) async throws {
        let _: AnyJSON = try await send(path, method: method, body: try JSONEncoder().encode(body))
    }

    private static func send<T: Decodable>(
        _ path: String, method: String, query: [String: String] = [:], body: Data?
    ) async throws -> T {
        var components = URLComponents(url: AppConfig.shared.webBaseURL.appending(path: path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) } }

        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let token = try await supabase.auth.session.accessToken
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            throw APIError(status: status, message: errorMessage(from: data, status: status))
        }
        if data.isEmpty, let empty = AnyJSON.null as? T { return empty }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private static func errorMessage(from data: Data, status: Int) -> String {
        if let json = try? JSONDecoder().decode([String: AnyJSON].self, from: data),
           let message = json["error"]?.stringValue ?? json["message"]?.stringValue {
            return message
        }
        switch status {
        case 401, 403: return "Sem permissão. Entre de novo na conta."
        case 404: return "Não encontrado."
        default: return "Erro no servidor (\(status))."
        }
    }
}
