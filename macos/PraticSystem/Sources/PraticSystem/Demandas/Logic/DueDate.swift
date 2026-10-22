import Foundation

/// Porte de src/lib/dueDate.ts. Tudo em horário LOCAL: 'YYYY-MM-DD' é sempre
/// meia-noite local, nunca UTC.
enum DueBucket: String, CaseIterable, Sendable {
    case atrasada, hoje, amanha, semana, depois, semData = "sem_data"

    var label: String {
        switch self {
        case .atrasada: "Atrasadas"
        case .hoje: "Hoje"
        case .amanha: "Amanhã"
        case .semana: "Esta semana"
        case .depois: "Depois"
        case .semData: "Sem prazo"
        }
    }

    /// Grupos que aceitam soltar uma demanda na lista agrupada por prazo
    /// (DemandListView.tsx:25) e o prazo que ela recebe.
    func dropDate(now: Date = .now) -> String?? {
        switch self {
        case .hoje: .some(DueDate.toISO(DueDate.startOfDay(now)))
        case .amanha: .some(DueDate.toISO(DueDate.addDays(now, 1)))
        case .semData: .some(nil)
        default: nil
        }
    }
}

enum DueTone: Sendable {
    case overdue, today, soon, normal, muted
}

struct DueDateLabel: Equatable, Sendable {
    let label: String
    let tone: DueTone
}

enum DueDate {
    static var calendar: Calendar { Calendar.current }

    private static let weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]
    private static let monthsShort = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
    private static let weekdayKeys = [["domingo", "dom"], ["segunda", "seg"], ["terca", "ter"], ["quarta", "qua"], ["quinta", "qui"], ["sexta", "sex"], ["sabado", "sab"]]

    static func toISO(_ date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    /// 'YYYY-MM-DD' (ou timestamp completo) → meia-noite local daquele dia.
    static func fromISO(_ iso: String) -> Date? {
        guard let match = iso.prefixMatch(of: /(\d{4})-(\d{2})-(\d{2})/) else { return nil }
        return makeDate(Int(match.1)!, Int(match.2)!, Int(match.3)!)
    }

    static func startOfDay(_ date: Date = .now) -> Date { calendar.startOfDay(for: date) }

    static func addDays(_ date: Date, _ days: Int) -> Date {
        calendar.date(byAdding: .day, value: days, to: startOfDay(date))!
    }

    static func daysBetween(_ from: Date, _ to: Date) -> Int {
        calendar.dateComponents([.day], from: startOfDay(from), to: startOfDay(to)).day ?? 0
    }

    private static func makeDate(_ year: Int, _ month: Int, _ day: Int) -> Date? {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        guard let date = calendar.date(from: components) else { return nil }
        let back = calendar.dateComponents([.year, .month, .day], from: date)
        // Rejeita datas que "estouram" o mês (31/02 viraria 03/03).
        return back.month == month && back.day == day ? date : nil
    }

    static func normalize(_ text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .folding(options: .diacriticInsensitive, locale: Locale(identifier: "pt_BR"))
    }

    /// Próxima ocorrência do dia da semana (0 = domingo); hoje não conta.
    private static func nextWeekday(_ from: Date, _ weekday: Int) -> Date {
        let today = startOfDay(from)
        let current = calendar.component(.weekday, from: today) - 1
        let delta = (weekday - current + 7) % 7
        return addDays(today, delta == 0 ? 7 : delta)
    }

    /// Prazo escrito à mão → 'YYYY-MM-DD', ou nil se não entender.
    static func parseInput(_ input: String, now: Date = .now) -> String? {
        let text = normalize(input)
        guard !text.isEmpty else { return nil }

        switch text {
        case "sem data", "sem prazo", "nenhum": return nil
        case "hoje": return toISO(startOfDay(now))
        case "ontem": return toISO(addDays(now, -1))
        case "amanha": return toISO(addDays(now, 1))
        case "depois de amanha": return toISO(addDays(now, 2))
        case "proxima semana", "semana que vem": return toISO(addDays(now, 7))
        case "proximo mes", "mes que vem":
            return calendar.date(byAdding: .month, value: 1, to: startOfDay(now)).map(toISO)
        default: break
        }

        if let match = text.wholeMatch(of: /(?:em\s+)?\+?(\d{1,3})\s*(?:d|dias?)?/),
           text.contains("d") || text.contains("+") || text.contains("em") {
            return toISO(addDays(now, Int(match.1)!))
        }

        if let match = text.wholeMatch(of: /(\d{4})-(\d{1,2})-(\d{1,2})/) {
            return makeDate(Int(match.1)!, Int(match.2)!, Int(match.3)!).map(toISO)
        }

        if let match = text.wholeMatch(of: /(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2}|\d{4}))?/) {
            let day = Int(match.1)!
            let month = Int(match.2)!
            guard (1...31).contains(day), (1...12).contains(month) else { return nil }
            var year = calendar.component(.year, from: now)
            if let y = match.3 {
                year = y.count == 2 ? 2000 + Int(y)! : Int(y)!
            }
            return makeDate(year, month, day).map(toISO)
        }

        let weekdayText = text
            .replacing(/^(proxima|proximo|prox\.?)\s+/, with: "")
            .replacing(/\s+(que vem)$/, with: "")
            .replacing(/-?feira$/, with: "")
            .trimmingCharacters(in: .whitespaces)
        if let index = weekdayKeys.firstIndex(where: { $0.contains(weekdayText) }) {
            return toISO(nextWeekday(now, index))
        }
        return nil
    }

    /// Rótulo curto do prazo + tom (estilo Todoist).
    static func label(_ iso: String?, now: Date = .now) -> DueDateLabel {
        guard let iso, let date = fromISO(iso) else { return DueDateLabel(label: "Sem prazo", tone: .muted) }
        let diff = daysBetween(now, date)
        if diff == 0 { return DueDateLabel(label: "Hoje", tone: .today) }
        if diff == 1 { return DueDateLabel(label: "Amanhã", tone: .soon) }
        if diff == -1 { return DueDateLabel(label: "Ontem", tone: .overdue) }

        let tone: DueTone = diff < 0 ? .overdue : diff <= 6 ? .soon : .normal
        if diff > 1, diff <= 6 {
            let name = weekdays[calendar.component(.weekday, from: date) - 1]
            return DueDateLabel(label: name.prefix(1).uppercased() + name.dropFirst(), tone: tone)
        }
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        let sameYear = c.year == calendar.component(.year, from: now)
        let base = "\(c.day!) de \(monthsShort[c.month! - 1])"
        return DueDateLabel(label: sameYear ? base : "\(base) de \(c.year!)", tone: tone)
    }

    static func bucket(_ iso: String?, now: Date = .now) -> DueBucket {
        guard let iso, let date = fromISO(iso) else { return .semData }
        let diff = daysBetween(now, date)
        if diff < 0 { return .atrasada }
        if diff == 0 { return .hoje }
        if diff == 1 { return .amanha }
        if diff <= 7 { return .semana }
        return .depois
    }

    /// Concluída no prazo não fica em "Atrasadas": compara com o instante da
    /// conclusão em vez de agora.
    static func demandBucket(dueDate: String?, isDone: Bool, completedAt: String?, now: Date = .now) -> DueBucket {
        if isDone, let completedAt, let completed = parseTimestamp(completedAt) {
            return bucket(dueDate, now: completed)
        }
        return bucket(dueDate, now: now)
    }

    /// 'HH:MM:SS' (TIME do Postgres) → 'HH:MM'.
    static func formatTime(_ time: String?) -> String {
        guard let time, let match = time.prefixMatch(of: /(\d{2}):(\d{2})/) else { return "" }
        return "\(match.1):\(match.2)"
    }

    /// Timestamps do Postgres/ISO, com ou sem fração de segundo.
    static func parseTimestamp(_ value: String) -> Date? {
        let withFraction = Date.ISO8601FormatStyle(includingFractionalSeconds: true)
        if let date = try? withFraction.parse(value) { return date }
        if let date = try? Date.ISO8601FormatStyle().parse(value) { return date }
        // "2026-08-25 18:00:00+00" (formato do Postgres)
        let normalized = value.replacingOccurrences(of: " ", with: "T")
            .replacing(/([+-]\d{2})$/) { "\($0.1):00" }
        return (try? withFraction.parse(normalized)) ?? (try? Date.ISO8601FormatStyle().parse(normalized))
    }
}
