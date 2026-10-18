import Foundation

/// Chaves públicas do projeto, lidas do Config.plist que o
/// Scripts/gen_config.sh gera a partir do .env.local da web.
/// Rodando via `swift run`, cai para as variáveis de ambiente.
struct AppConfig: Sendable {
    let supabaseURL: URL
    let supabaseAnonKey: String
    let webBaseURL: URL

    static let shared: AppConfig = load()

    private static func load() -> AppConfig {
        var values: [String: String] = [:]
        if let url = Bundle.main.url(forResource: "Config", withExtension: "plist"),
           let data = try? Data(contentsOf: url),
           let plist = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: String] {
            values = plist
        }
        let env = ProcessInfo.processInfo.environment
        let supabaseURL = values["SupabaseURL"] ?? env["NEXT_PUBLIC_SUPABASE_URL"] ?? ""
        let anonKey = values["SupabaseAnonKey"] ?? env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? ""
        let webBase = values["WebBaseURL"] ?? env["WEB_BASE_URL"] ?? "https://praticsystem.vercel.app"

        guard let url = URL(string: supabaseURL), !anonKey.isEmpty else {
            fatalError("Config.plist ausente. Rode Scripts/gen_config.sh ou defina NEXT_PUBLIC_SUPABASE_URL/ANON_KEY.")
        }
        return AppConfig(supabaseURL: url, supabaseAnonKey: anonKey, webBaseURL: URL(string: webBase)!)
    }

    /// Chave que o supabase-js usa no localStorage do navegador:
    /// `sb-<ref do projeto>-auth-token`.
    var webStorageKey: String {
        let ref = supabaseURL.host()?.split(separator: ".").first.map(String.init) ?? ""
        return "sb-\(ref)-auth-token"
    }
}
