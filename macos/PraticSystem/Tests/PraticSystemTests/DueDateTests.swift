import Foundation
import Testing
@testable import PraticSystem

/// Mesmos casos de src/lib/dueDate.test.ts.
struct DueDateTests {
    // Quarta-feira, 26 de agosto de 2026, meio-dia local
    let now = Calendar.current.date(from: DateComponents(year: 2026, month: 8, day: 26, hour: 12))!

    func parse(_ text: String) -> String? { DueDate.parseInput(text, now: now) }

    @Test func atalhosRelativos() {
        #expect(parse("hoje") == "2026-08-26")
        #expect(parse("Hoje") == "2026-08-26")
        #expect(parse("amanhã") == "2026-08-27")
        #expect(parse("amanha") == "2026-08-27")
        #expect(parse("depois de amanhã") == "2026-08-28")
        #expect(parse("ontem") == "2026-08-25")
        #expect(parse("próxima semana") == "2026-09-02")
    }

    @Test func diasDaSemanaApontamParaAProximaOcorrencia() {
        #expect(parse("sexta") == "2026-08-28")
        #expect(parse("sexta-feira") == "2026-08-28")
        #expect(parse("segunda") == "2026-08-31")
        #expect(parse("próxima segunda") == "2026-08-31")
        #expect(parse("terça que vem") == "2026-09-01")
        #expect(parse("domingo") == "2026-08-30")
        #expect(parse("quarta") == "2026-09-02")
    }

    @Test func prazosEmDias() {
        #expect(parse("em 3 dias") == "2026-08-29")
        #expect(parse("+10") == "2026-09-05")
        #expect(parse("5 dias") == "2026-08-31")
    }

    @Test func datasNumericas() {
        #expect(parse("03/09") == "2026-09-03")
        #expect(parse("3/9") == "2026-09-03")
        #expect(parse("03/09/2027") == "2027-09-03")
        #expect(parse("03/09/27") == "2027-09-03")
        #expect(parse("2026-12-31") == "2026-12-31")
    }

    @Test func entradaInvalida() {
        #expect(parse("") == nil)
        #expect(parse("   ") == nil)
        #expect(parse("sem data") == nil)
        #expect(parse("qualquer coisa") == nil)
        #expect(parse("31/02") == nil)
        #expect(parse("40/13") == nil)
    }

    @Test func idaEVoltaNoFusoLocal() {
        let jan5 = Calendar.current.date(from: DateComponents(year: 2026, month: 1, day: 5))!
        #expect(DueDate.toISO(jan5) == "2026-01-05")
        #expect(DueDate.toISO(DueDate.fromISO("2026-01-05")!) == "2026-01-05")
        #expect(DueDate.toISO(DueDate.fromISO("2026-03-10T23:30:00Z")!) == "2026-03-10")
    }

    @Test func rotulos() {
        #expect(DueDate.label("2026-08-26", now: now) == DueDateLabel(label: "Hoje", tone: .today))
        #expect(DueDate.label("2026-08-27", now: now) == DueDateLabel(label: "Amanhã", tone: .soon))
        #expect(DueDate.label("2026-08-25", now: now) == DueDateLabel(label: "Ontem", tone: .overdue))
        #expect(DueDate.label("2026-08-28", now: now) == DueDateLabel(label: "Sexta-feira", tone: .soon))
        #expect(DueDate.label("2026-09-15", now: now) == DueDateLabel(label: "15 de set", tone: .normal))
        #expect(DueDate.label("2027-01-08", now: now) == DueDateLabel(label: "8 de jan de 2027", tone: .normal))
        #expect(DueDate.label("2026-08-01", now: now).tone == .overdue)
        #expect(DueDate.label(nil, now: now) == DueDateLabel(label: "Sem prazo", tone: .muted))
    }

    @Test func gruposPorPrazo() {
        #expect(DueDate.bucket(nil, now: now) == .semData)
        #expect(DueDate.bucket("2026-08-01", now: now) == .atrasada)
        #expect(DueDate.bucket("2026-08-26", now: now) == .hoje)
        #expect(DueDate.bucket("2026-08-27", now: now) == .amanha)
        #expect(DueDate.bucket("2026-09-02", now: now) == .semana)
        #expect(DueDate.bucket("2026-09-30", now: now) == .depois)
    }

    @Test func grupoConsideraConclusao() {
        #expect(DueDate.demandBucket(dueDate: "2026-08-25", isDone: false, completedAt: nil, now: now) == .atrasada)
        #expect(DueDate.demandBucket(dueDate: "2026-08-25", isDone: true, completedAt: "2026-08-25T18:00:00Z", now: now) == .hoje)
        #expect(DueDate.demandBucket(dueDate: "2026-08-20", isDone: true, completedAt: "2026-08-25T18:00:00Z", now: now) == .atrasada)
        #expect(DueDate.demandBucket(dueDate: "2026-08-25", isDone: true, completedAt: nil, now: now) == .atrasada)
    }

    @Test func horaDoPostgres() {
        #expect(DueDate.formatTime("14:30:00") == "14:30")
        #expect(DueDate.formatTime(nil) == "")
        #expect(DueDate.parseTimestamp("2026-08-25 18:00:00+00") != nil)
        #expect(DueDate.parseTimestamp("2026-08-25T18:00:00.123456+00:00") != nil || DueDate.parseTimestamp("2026-08-25T18:00:00.123+00:00") != nil)
    }
}
