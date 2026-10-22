import Foundation

/// Porte de src/lib/quickParse.ts — atalhos digitados no título:
/// "Ajustar banner #Cold Joias @Julio sexta 14h P1".
enum QuickParse {
    enum TokenKind: String, Sendable { case client, assignee, priority, date, time }

    struct Token: Equatable, Sendable {
        let kind: TokenKind
        let raw: String
        let label: String
    }

    struct CatalogItem: Sendable {
        let id: String
        let label: String
        var alias: String?
    }

    struct Catalogs: Sendable {
        var clients: [CatalogItem]
        var users: [CatalogItem]
    }

    struct Result: Equatable, Sendable {
        var title: String
        var clientID: String?
        var assigneeIDs: [String]
        var priority: DemandPriority?
        var dueDate: String?
        var dueTime: String?
        var tokens: [Token]
    }

    struct ActiveMarker: Equatable, Sendable {
        let marker: Character
        let query: String
        let start: Int
    }

    enum SegmentKind: String, Sendable { case text, user, client }

    struct Segment: Equatable, Sendable {
        let kind: SegmentKind
        let value: String
    }

    private static func normalize(_ text: String) -> String {
        text.lowercased().folding(options: .diacriticInsensitive, locale: Locale(identifier: "pt_BR"))
    }

    private static let dateWord = #"depois de amanh[aã]|hoje|amanh[aã]|ontem|pr[oó]xima semana|semana que vem|(?:pr[oó]xim[ao]\s+)?(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-?feira)?(?:\s+que\s+vem)?|em\s+\d{1,3}\s+dias?|\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?"#
    // swiftlint:disable force_try
    nonisolated(unsafe) private static let dateRegex = try! Regex(#"(?:^|\s)("# + dateWord + #")(?=\s|$)"#).ignoresCase()
    nonisolated(unsafe) private static let timeRegex = try! Regex(#"(?:^|\s)(?:[àa]s\s+)?(\d{1,2})(?::(\d{2})|h(\d{2})?)(?=\s|$)"#).ignoresCase()
    nonisolated(unsafe) private static let priorityRegex = try! Regex(#"(?:^|\s)(p[1-5])(?=\s|$)"#).ignoresCase()
    // swiftlint:enable force_try

    /// Nome MAIS LONGO do catálogo logo depois do marcador (nomes têm espaço).
    private static func matchCatalog(_ rest: [Character], _ catalog: [CatalogItem]) -> (item: CatalogItem, consumed: Int)? {
        let haystack = Array(normalize(String(rest)))
        var best: (item: CatalogItem, consumed: Int)?
        for item in catalog {
            for raw in [item.label, item.alias].compactMap({ $0 }) {
                var candidate = raw
                if candidate.first == "@" || candidate.first == "#" { candidate.removeFirst() }
                let needle = Array(normalize(candidate).trimmingCharacters(in: .whitespaces))
                guard !needle.isEmpty, haystack.count >= needle.count, Array(haystack[0..<needle.count]) == needle else { continue }
                if haystack.count > needle.count, haystack[needle.count] != " " { continue }
                if best == nil || needle.count > best!.consumed { best = (item, needle.count) }
            }
        }
        return best
    }

    private static func extractMarker(_ text: String, _ marker: Character, _ catalog: [CatalogItem]) -> (text: String, item: CatalogItem, raw: String)? {
        let chars = Array(text)
        var from = 0
        while let index = chars[from...].firstIndex(of: marker) {
            if index > 0, chars[index - 1] != " " {
                from = index + 1
                continue
            }
            if let match = matchCatalog(Array(chars[(index + 1)...]), catalog) {
                let end = index + 1 + match.consumed
                let raw = String(chars[index..<end])
                let stripped = String(chars[..<index]) + String(chars[end...])
                return (stripped, match.item, raw)
            }
            from = index + 1
        }
        return nil
    }

    /// Trecho digitado após `#`/`@` no cursor — alimenta o autocomplete.
    static func activeMarker(_ text: String, caret: Int) -> ActiveMarker? {
        let upToCaret = Array(text.prefix(caret))
        guard let index = upToCaret.lastIndex(where: { $0 == "#" || $0 == "@" }) else { return nil }
        if index > 0, upToCaret[index - 1] != " " { return nil }
        let query = String(upToCaret[(index + 1)...])
        if query.split(separator: " ", omittingEmptySubsequences: false).count > 3 { return nil }
        return ActiveMarker(marker: upToCaret[index], query: query, start: index)
    }

    /// Troca o trecho em edição pelo nome escolhido.
    static func applyCompletion(_ text: String, caret: Int, label: String) -> (text: String, caret: Int) {
        guard let active = activeMarker(text, caret: caret) else { return (text, caret) }
        var clean = label
        if clean.first == "@" || clean.first == "#" { clean.removeFirst() }
        let head = String(text.prefix(active.start)) + String(active.marker) + clean + " "
        return (head + String(text.dropFirst(caret)), head.count)
    }

    static func parse(_ input: String, catalogs: Catalogs, now: Date = .now) -> Result {
        var text = input
        var tokens: [Token] = []

        var clientID: String?
        if let client = extractMarker(text, "#", catalogs.clients) {
            text = client.text
            clientID = client.item.id
            tokens.append(Token(kind: .client, raw: client.raw, label: client.item.label))
        }

        var assigneeIDs: [String] = []
        while let assignee = extractMarker(text, "@", catalogs.users) {
            text = assignee.text
            if !assigneeIDs.contains(assignee.item.id) {
                assigneeIDs.append(assignee.item.id)
                tokens.append(Token(kind: .assignee, raw: assignee.raw, label: assignee.item.label))
            }
        }

        var priority: DemandPriority?
        if let match = text.firstMatch(of: priorityRegex), let raw = match.output[1].substring.map(String.init),
           let parsed = parsePriorityToken(raw) {
            priority = parsed
            text.replaceSubrange(match.range, with: " ")
            tokens.append(Token(kind: .priority, raw: raw, label: raw.uppercased()))
        }

        // Hora antes da data, senão "14:30" poderia virar dd/mm.
        var dueTime: String?
        if let match = text.firstMatch(of: timeRegex) {
            let hours = Int(match.output[1].substring ?? "") ?? 99
            let minutes = Int(match.output[2].substring ?? match.output[3].substring ?? "0") ?? 99
            if hours < 24, minutes < 60 {
                let time = String(format: "%02d:%02d", hours, minutes)
                dueTime = time
                let raw = String(text[match.range]).trimmingCharacters(in: .whitespaces)
                text.replaceSubrange(match.range, with: " ")
                tokens.append(Token(kind: .time, raw: raw, label: time))
            }
        }

        var dueDate: String?
        if let match = text.firstMatch(of: dateRegex), let word = match.output[1].substring.map(String.init),
           let parsed = DueDate.parseInput(word, now: now) {
            dueDate = parsed
            text.replaceSubrange(match.range, with: " ")
            let raw = word.trimmingCharacters(in: .whitespaces)
            tokens.append(Token(kind: .date, raw: raw, label: raw))
        }

        let title = text.replacing(/\s{2,}/, with: " ").trimmingCharacters(in: .whitespaces)
        return Result(title: title, clientID: clientID, assigneeIDs: assigneeIDs, priority: priority, dueDate: dueDate, dueTime: dueTime, tokens: tokens)
    }

    /// Quebra o texto marcando `@Colaborador` e `#Cliente` (nomes mais longos primeiro).
    static func splitMentions(_ text: String, catalogs: Catalogs) -> [Segment] {
        func entries(_ items: [CatalogItem], marker: Character, kind: SegmentKind) -> [(Character, String, SegmentKind)] {
            items.flatMap { item -> [(Character, String, SegmentKind)] in
                let strip: (String) -> String = { $0.first == marker ? String($0.dropFirst()) : $0 }
                let primary = strip(item.label)
                var result = [(marker, primary, kind)]
                if let alias = item.alias.map(strip), alias != primary { result.append((marker, alias, kind)) }
                return result
            }
        }
        let all = (entries(catalogs.users, marker: "@", kind: .user) + entries(catalogs.clients, marker: "#", kind: .client))
            .sorted { $0.1.count > $1.1.count }

        let chars = Array(text)
        var segments: [Segment] = []
        var buffer = ""
        var index = 0
        func flush() {
            if !buffer.isEmpty { segments.append(Segment(kind: .text, value: buffer)) }
            buffer = ""
        }

        outer: while index < chars.count {
            let char = chars[index]
            if char == "@" || char == "#" {
                let before: Character = index > 0 ? chars[index - 1] : " "
                if before == " " || before == "\n" {
                    let rest = Array(chars[(index + 1)...])
                    for entry in all where entry.0 == char {
                        let label = Array(entry.1)
                        guard rest.count >= label.count,
                              String(rest[0..<label.count]).lowercased() == entry.1.lowercased() else { continue }
                        if rest.count > label.count, rest[label.count].isLetter || rest[label.count].isNumber || rest[label.count] == "_" { continue }
                        flush()
                        segments.append(Segment(kind: entry.2, value: "\(char)\(entry.1)"))
                        index += 1 + label.count
                        continue outer
                    }
                }
            }
            buffer.append(char)
            index += 1
        }
        flush()
        return segments
    }

    /// Catálogos a partir dos dados do app (cliente: nome fantasia + razão social;
    /// colaborador: username + nome), como a web monta.
    static func catalogs(clients: [DemandClient], team: [TeamMember]) -> Catalogs {
        Catalogs(
            clients: clients.map { CatalogItem(id: $0.id.uuidString.lowercased(), label: $0.displayName, alias: $0.displayName == $0.name ? nil : $0.name) },
            users: team.map {
                let label = $0.username.flatMap { $0.isEmpty ? nil : $0 } ?? ($0.name.isEmpty ? $0.email : $0.name)
                return CatalogItem(id: $0.id.uuidString.lowercased(), label: label, alias: $0.name)
            }
        )
    }
}

/// 'p1' → urgente. Aceita P1..P5 e os nomes por extenso (types/demandas.ts).
func parsePriorityToken(_ token: String) -> DemandPriority? {
    switch token.trimmingCharacters(in: .whitespaces).lowercased() {
    case "p1", "urgente": .urgent
    case "p2", "alta": .high
    case "p3", "media": .medium
    case "p4", "baixa": .low
    case "p5", "nenhuma": DemandPriority.none
    default: nil
    }
}
