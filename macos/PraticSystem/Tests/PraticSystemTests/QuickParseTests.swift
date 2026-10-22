import Foundation
import Testing
@testable import PraticSystem

/// Mesmos casos de src/lib/quickParse.test.ts.
struct QuickParseTests {
    let now = Calendar.current.date(from: DateComponents(year: 2026, month: 8, day: 26, hour: 12))!
    let catalogs = QuickParse.Catalogs(
        clients: [
            .init(id: "c1", label: "Cold Joias"),
            .init(id: "c2", label: "Recloset Bazar", alias: "Recloset Comercio LTDA"),
        ],
        users: [
            .init(id: "u1", label: "julioneto", alias: "Julio"),
            .init(id: "u2", label: "anapaula", alias: "Ana Paula"),
        ]
    )

    func parse(_ text: String) -> QuickParse.Result { QuickParse.parse(text, catalogs: catalogs, now: now) }

    @Test func tituloIntactoSemAtalhos() {
        let r = parse("Ajustar o banner da home")
        #expect(r.title == "Ajustar o banner da home")
        #expect(r.clientID == nil)
        #expect(r.assigneeIDs.isEmpty)
        #expect(r.tokens.isEmpty)
    }

    @Test func clienteComEspaco() {
        let r = parse("Ajustar banner #Cold Joias")
        #expect(r.clientID == "c1")
        #expect(r.title == "Ajustar banner")
    }

    @Test func aliasDoCliente() {
        #expect(parse("Post #Recloset Comercio LTDA").clientID == "c2")
    }

    @Test func variosResponsaveis() {
        let r = parse("Gravar vídeo @Julio @Ana Paula")
        #expect(r.assigneeIDs == ["u1", "u2"])
        #expect(r.title == "Gravar vídeo")
    }

    @Test func prioridadeDataEHora() {
        let r = parse("Enviar proposta #Cold Joias @Julio sexta 14h P1")
        #expect(r.clientID == "c1")
        #expect(r.assigneeIDs == ["u1"])
        #expect(r.priority == .urgent)
        #expect(r.dueDate == "2026-08-28")
        #expect(r.dueTime == "14:00")
        #expect(r.title == "Enviar proposta")
    }

    @Test func formasDeHora() {
        #expect(parse("Reunião 14:30").dueTime == "14:30")
        #expect(parse("Reunião 9h").dueTime == "09:00")
        #expect(parse("Reunião 9h30").dueTime == "09:30")
        #expect(parse("Reunião às 8h").dueTime == "08:00")
    }

    @Test func dataNumericaNaoViraHora() {
        let r = parse("Entrega 03/09")
        #expect(r.dueDate == "2026-09-03")
        #expect(r.dueTime == nil)
        #expect(r.title == "Entrega")
    }

    @Test func marcadorDesconhecidoFica() {
        let r = parse("Falar com #Inexistente")
        #expect(r.clientID == nil)
        #expect(r.title == "Falar com #Inexistente")
    }

    @Test func emailNaoEhMencao() {
        let r = parse("Responder julio@empresa.com")
        #expect(r.assigneeIDs.isEmpty)
        #expect(r.title == "Responder julio@empresa.com")
    }

    @Test func numerosSoltosFicam() {
        let r = parse("Criar 3 variações do post")
        #expect(r.dueTime == nil)
        #expect(r.dueDate == nil)
        #expect(r.title == "Criar 3 variações do post")
    }

    @Test func marcadorAtivo() {
        let text = "Banner #Col"
        #expect(QuickParse.activeMarker(text, caret: text.count) == .init(marker: "#", query: "Col", start: 7))
        #expect(QuickParse.activeMarker("Banner novo", caret: 11) == nil)
        #expect(QuickParse.activeMarker("julio@empresa", caret: 13) == nil)
    }

    @Test func completarMarcador() {
        let text = "Banner #Col"
        let result = QuickParse.applyCompletion(text, caret: text.count, label: "Cold Joias")
        #expect(result.text == "Banner #Cold Joias ")
        #expect(result.caret == 19)
    }

    @Test func mencoesEmComentarios() {
        func split(_ text: String) -> [QuickParse.Segment] { QuickParse.splitMentions(text, catalogs: catalogs) }
        #expect(split("Falar com @julioneto sobre #Cold Joias") == [
            .init(kind: .text, value: "Falar com "), .init(kind: .user, value: "@julioneto"),
            .init(kind: .text, value: " sobre "), .init(kind: .client, value: "#Cold Joias"),
        ])
        #expect(split("Falar com @Julio sobre #Cold Joias")[1] == .init(kind: .user, value: "@Julio"))
        #expect(split("@Ana Paula revisa") == [.init(kind: .user, value: "@Ana Paula"), .init(kind: .text, value: " revisa")])
        #expect(split("avisar julio@empresa.com sobre #Nada") == [.init(kind: .text, value: "avisar julio@empresa.com sobre #Nada")])
        #expect(split("sem mencao alguma") == [.init(kind: .text, value: "sem mencao alguma")])
    }

    @Test func nomeMaisLongoVence() {
        let catalogs = QuickParse.Catalogs(clients: [], users: [.init(id: "u1", label: "Ana"), .init(id: "u2", label: "Ana Paula")])
        #expect(QuickParse.splitMentions("@Ana Paula", catalogs: catalogs) == [.init(kind: .user, value: "@Ana Paula")])
    }
}
