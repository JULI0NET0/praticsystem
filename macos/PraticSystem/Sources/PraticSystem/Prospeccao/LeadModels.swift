import Foundation
import SwiftUI

/// Estágios do funil, na ordem de STAGES em src/lib/prospeccao/leads.ts.
enum LeadStage: String, Codable, CaseIterable, Identifiable, Sendable {
    case novo, contatado, conversando, proposta, ganho, perdido
    case standBy = "stand_by"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .novo: "Novo"
        case .contatado: "Contatado"
        case .conversando: "Conversando"
        case .proposta: "Proposta"
        case .ganho: "Ganho"
        case .perdido: "Perdido"
        case .standBy: "Stand by"
        }
    }

    var color: Color {
        switch self {
        case .novo: .secondary
        case .contatado: Color(hex: "#3B82F6")
        case .conversando: Color(hex: "#8B5CF6")
        case .proposta: .praticOrange
        case .ganho: .green
        case .perdido: .red
        case .standBy: Color(hex: "#CA8A04")
        }
    }

    var isClosed: Bool { self == .ganho || self == .perdido }
}

/// Canal de origem (ORIGIN_LABEL).
enum LeadOrigin: String, Codable, CaseIterable, Identifiable, Sendable {
    case prospeccaoAtiva = "prospeccao_ativa"
    case indicacao, instagram, whatsapp, site, csv, manual, outro

    var id: String { rawValue }

    var label: String {
        switch self {
        case .prospeccaoAtiva: "Prospecção ativa"
        case .indicacao: "Indicação"
        case .instagram: "Instagram"
        case .whatsapp: "WhatsApp"
        case .site: "Site"
        case .csv: "Importação"
        case .manual: "Manual"
        case .outro: "Outro"
        }
    }
}

/// Tipo de contato (TYPE_LABEL em src/lib/prospeccao/classify.ts).
enum ContactType: String, Codable, CaseIterable, Identifiable, Sendable {
    case lead, cliente, equipe, fornecedor, pessoal, triagem, ignorado

    var id: String { rawValue }

    var label: String {
        switch self {
        case .lead: "Lead"
        case .cliente: "Cliente"
        case .equipe: "Equipe"
        case .fornecedor: "Fornecedor"
        case .pessoal: "Pessoal"
        case .triagem: "Triagem"
        case .ignorado: "Ignorado"
        }
    }

    /// Contatos que contam como "precisa de atenção" (countsForBadge).
    var countsForBadge: Bool { self == .lead || self == .triagem }

    /// Não geram contador de não lidas (SILENT_TYPES).
    var isSilent: Bool { self == .equipe || self == .ignorado }
}

struct Lead: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    var nome: String
    var empresa: String?
    var telefone: String?
    var email: String?
    var instagram: String?
    var origem: LeadOrigin
    var estagio: LeadStage
    var tipo: ContactType
    var valorEstimado: Double?
    var servicoInteresse: String?
    var tags: [String]
    var segmentos: [String]
    var cnpj: String?
    var razaoSocial: String?
    var cidade: String?
    var uf: String?
    var cnaeDescricao: String?
    var notas: String?
    var perdidoMotivo: String?
    var waName: String?
    var waContactName: String?
    var waAvatarURL: String?
    var lastMessageAt: String?
    var lastMessagePreview: String?
    var unreadCount: Int
    var clientID: UUID?
    var createdAt: String?
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, nome, empresa, telefone, email, instagram, origem, estagio, tipo, tags, segmentos, cnpj, cidade, uf, notas
        case valorEstimado = "valor_estimado"
        case servicoInteresse = "servico_interesse"
        case razaoSocial = "razao_social"
        case cnaeDescricao = "cnae_descricao"
        case perdidoMotivo = "perdido_motivo"
        case waName = "wa_name"
        case waContactName = "wa_contact_name"
        case waAvatarURL = "wa_avatar_url"
        case lastMessageAt = "last_message_at"
        case lastMessagePreview = "last_message_preview"
        case unreadCount = "unread_count"
        case clientID = "client_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        nome = try c.decodeIfPresent(String.self, forKey: .nome) ?? ""
        empresa = try c.decodeIfPresent(String.self, forKey: .empresa)
        telefone = try c.decodeIfPresent(String.self, forKey: .telefone)
        email = try c.decodeIfPresent(String.self, forKey: .email)
        instagram = try c.decodeIfPresent(String.self, forKey: .instagram)
        origem = (try c.decodeIfPresent(String.self, forKey: .origem)).flatMap(LeadOrigin.init(rawValue:)) ?? .manual
        estagio = (try c.decodeIfPresent(String.self, forKey: .estagio)).flatMap(LeadStage.init(rawValue:)) ?? .novo
        tipo = (try c.decodeIfPresent(String.self, forKey: .tipo)).flatMap(ContactType.init(rawValue:)) ?? .lead
        valorEstimado = try c.decodeLossyDouble(forKey: .valorEstimado)
        servicoInteresse = try c.decodeIfPresent(String.self, forKey: .servicoInteresse)
        tags = try c.decodeIfPresent([String].self, forKey: .tags) ?? []
        segmentos = try c.decodeIfPresent([String].self, forKey: .segmentos) ?? []
        cnpj = try c.decodeIfPresent(String.self, forKey: .cnpj)
        razaoSocial = try c.decodeIfPresent(String.self, forKey: .razaoSocial)
        cidade = try c.decodeIfPresent(String.self, forKey: .cidade)
        uf = try c.decodeIfPresent(String.self, forKey: .uf)
        cnaeDescricao = try c.decodeIfPresent(String.self, forKey: .cnaeDescricao)
        notas = try c.decodeIfPresent(String.self, forKey: .notas)
        perdidoMotivo = try c.decodeIfPresent(String.self, forKey: .perdidoMotivo)
        waName = try c.decodeIfPresent(String.self, forKey: .waName)
        waContactName = try c.decodeIfPresent(String.self, forKey: .waContactName)
        waAvatarURL = try c.decodeIfPresent(String.self, forKey: .waAvatarURL)
        lastMessageAt = try c.decodeIfPresent(String.self, forKey: .lastMessageAt)
        lastMessagePreview = try c.decodeIfPresent(String.self, forKey: .lastMessagePreview)
        unreadCount = try c.decodeIfPresent(Int.self, forKey: .unreadCount) ?? 0
        clientID = try c.decodeIfPresent(UUID.self, forKey: .clientID)
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt)
        updatedAt = try c.decodeIfPresent(String.self, forKey: .updatedAt)
    }

    init(
        id: UUID = UUID(), nome: String, empresa: String? = nil, telefone: String? = "5511999998888",
        origem: LeadOrigin = .manual, estagio: LeadStage = .novo, tipo: ContactType = .lead,
        valorEstimado: Double? = nil, tags: [String] = [], segmentos: [String] = [], unreadCount: Int = 0
    ) {
        self.id = id
        self.nome = nome
        self.empresa = empresa
        self.telefone = telefone
        self.origem = origem
        self.estagio = estagio
        self.tipo = tipo
        self.valorEstimado = valorEstimado
        self.tags = tags
        self.segmentos = segmentos
        self.unreadCount = unreadCount
    }

    var displayName: String {
        Prospeccao.displayName(nome: nome, telefone: telefone, waName: waName, waContactName: waContactName)
    }
}

struct LeadActivity: Codable, Identifiable, Hashable, Sendable {
    enum Kind: String, Codable, Sendable {
        case estagio, nota, ligacao, conversao
    }

    let id: UUID
    let leadID: UUID
    let tipo: Kind
    let descricao: String
    let userID: UUID?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, tipo, descricao
        case leadID = "lead_id"
        case userID = "user_id"
        case createdAt = "created_at"
    }

    var kindLabel: String {
        switch tipo {
        case .estagio: "Status"
        case .nota: "Observação"
        case .ligacao: "Ligação"
        case .conversao: "Conversão"
        }
    }
}

struct LeadMessage: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let leadID: UUID
    let direction: String
    let body: String
    let messageType: String
    let mediaURL: String?
    let mediaName: String?
    var status: String
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, direction, body, status
        case leadID = "lead_id"
        case messageType = "message_type"
        case mediaURL = "media_url"
        case mediaName = "media_name"
        case createdAt = "created_at"
    }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        leadID = try c.decode(UUID.self, forKey: .leadID)
        direction = try c.decodeIfPresent(String.self, forKey: .direction) ?? "in"
        body = try c.decodeIfPresent(String.self, forKey: .body) ?? ""
        messageType = try c.decodeIfPresent(String.self, forKey: .messageType) ?? "text"
        mediaURL = try c.decodeIfPresent(String.self, forKey: .mediaURL)
        mediaName = try c.decodeIfPresent(String.self, forKey: .mediaName)
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "sent"
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt)
    }

    var isOutgoing: Bool { direction == "out" }

    /// Texto para a bolha: mídia sem legenda vira um rótulo.
    var displayText: String {
        if !body.isEmpty { return body }
        switch messageType {
        case "image": return "📷 Imagem"
        case "audio": return "🎤 Áudio"
        case "video": return "🎬 Vídeo"
        case "document": return "📄 \(mediaName ?? "Documento")"
        case "sticker": return "Figurinha"
        default: return ""
        }
    }
}

extension KeyedDecodingContainer {
    /// `numeric` do Postgres chega como número pelo PostgREST, mas pode vir
    /// como texto pelo Realtime.
    func decodeLossyDouble(forKey key: Key) throws -> Double? {
        if let value = try? decodeIfPresent(Double.self, forKey: key) { return value }
        if let text = try? decodeIfPresent(String.self, forKey: key) { return Double(text) }
        return nil
    }
}
