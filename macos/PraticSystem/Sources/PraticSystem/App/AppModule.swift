import Foundation

/// Itens da barra lateral. Os nativos têm tela SwiftUI; o resto abre a rota
/// correspondente da web dentro do app.
enum AppModule: String, CaseIterable, Identifiable, Hashable {
    case workspace
    case demandas
    case prospeccao
    case chat
    case agenda
    case notas
    case clientes
    case cronogramas
    case propostas
    case contratos
    case financeiro
    case diagramas
    case instagram

    var id: String { rawValue }

    enum Section: String, CaseIterable {
        case trabalho = "Trabalho"
        case comercial = "Comercial"
        case gestao = "Gestão"
    }

    var section: Section {
        switch self {
        case .workspace, .demandas, .chat, .agenda, .notas, .diagramas: .trabalho
        case .prospeccao, .propostas, .instagram: .comercial
        case .clientes, .cronogramas, .contratos, .financeiro: .gestao
        }
    }

    var title: String {
        switch self {
        case .workspace: "Workspace"
        case .demandas: "Demandas"
        case .prospeccao: "Prospecção"
        case .chat: "Chat"
        case .agenda: "Agenda"
        case .notas: "Notas"
        case .clientes: "Clientes"
        case .cronogramas: "Cronogramas"
        case .propostas: "Propostas"
        case .contratos: "Contratos"
        case .financeiro: "Financeiro"
        case .diagramas: "Diagramas"
        case .instagram: "Instagram"
        }
    }

    var symbol: String {
        switch self {
        case .workspace: "square.grid.2x2"
        case .demandas: "checklist"
        case .prospeccao: "person.crop.circle.badge.plus"
        case .chat: "bubble.left.and.bubble.right"
        case .agenda: "calendar"
        case .notas: "note.text"
        case .clientes: "person.2"
        case .cronogramas: "calendar.day.timeline.left"
        case .propostas: "doc.richtext"
        case .contratos: "signature"
        case .financeiro: "creditcard"
        case .diagramas: "point.3.connected.trianglepath.dotted"
        case .instagram: "camera"
        }
    }

    /// Rota da web. Demandas também tem uma, usada no "Abrir na web".
    var webPath: String {
        switch self {
        case .workspace: "/admin/workspace"
        case .demandas: "/admin/demandas"
        case .prospeccao: "/admin/prospeccao"
        case .chat: "/admin/chat"
        case .agenda: "/admin/schedule"
        case .notas: "/admin/notas"
        case .clientes: "/admin/clients"
        case .cronogramas: "/admin/cronogramas"
        case .propostas: "/admin/propostas"
        case .contratos: "/admin/contracts"
        case .financeiro: "/admin/financeiro"
        case .diagramas: "/admin/diagramas"
        case .instagram: "/automacao-instagram"
        }
    }

    var webURL: URL { AppConfig.shared.webBaseURL.appending(path: webPath) }

    /// Prospecção ainda é web; vira nativa na próxima etapa.
    var isNative: Bool { self == .demandas }
}
