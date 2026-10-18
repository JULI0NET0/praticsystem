import Foundation
import Supabase
import Testing
@testable import PraticSystem

struct TipTapConverterTests {
    private func roundTrip(_ doc: TipTapNode) -> TipTapNode {
        TipTapAttributedConverter.document(from: TipTapAttributedConverter.attributed(from: doc))
    }

    private func paragraph(_ nodes: TipTapNode...) -> TipTapNode {
        TipTapNode(type: "paragraph", content: nodes.isEmpty ? nil : nodes)
    }

    @Test func textoComMarcasVoltaIgual() {
        let doc = TipTapNode.doc([
            TipTapNode(type: "heading", attrs: ["level": .integer(2)], content: [.textNode("Briefing")]),
            paragraph(
                .textNode("Olá "),
                .textNode("negrito", marks: [TipTapMark(type: "bold")]),
                .textNode(" e "),
                .textNode("link", marks: [TipTapMark(type: "italic"), TipTapMark(type: "link", attrs: ["href": .string("https://pratic.com")])])
            ),
            paragraph(),
            paragraph(.textNode("linha 1"), TipTapNode(type: "hardBreak"), .textNode("linha 2")),
        ])
        #expect(roundTrip(doc) == doc)
    }

    @Test func listasAninhadasETarefasVoltamIguais() {
        let doc = TipTapNode.doc([
            TipTapNode(type: "bulletList", content: [
                TipTapNode(type: "listItem", content: [
                    paragraph(.textNode("um")),
                    TipTapNode(type: "orderedList", content: [
                        TipTapNode(type: "listItem", content: [paragraph(.textNode("um.a"))]),
                        TipTapNode(type: "listItem", content: [paragraph(.textNode("um.b"))]),
                    ]),
                ]),
                TipTapNode(type: "listItem", content: [paragraph(.textNode("dois"))]),
            ]),
            TipTapNode(type: "taskList", content: [
                TipTapNode(type: "taskItem", attrs: ["checked": .bool(true)], content: [paragraph(.textNode("feito"))]),
                TipTapNode(type: "taskItem", attrs: ["checked": .bool(false)], content: [paragraph(.textNode("a fazer"))]),
            ]),
        ])
        #expect(roundTrip(doc) == doc)
    }

    @Test func blocosDesconhecidosSaoPreservados() {
        let table = TipTapNode(type: "table", content: [
            TipTapNode(type: "tableRow", content: [
                TipTapNode(type: "tableHeader", attrs: ["colspan": .integer(1)], content: [paragraph(.textNode("A"))]),
            ]),
        ])
        let image = TipTapNode(type: "image", attrs: ["src": .string("https://x/y.png")])
        let doc = TipTapNode.doc([paragraph(.textNode("antes")), table, image, paragraph(.textNode("depois"))])
        #expect(roundTrip(doc) == doc)
    }

    @Test func mencaoVoltaComoNo() {
        let mention = TipTapNode(type: "mention", attrs: ["id": .string("u1"), "label": .string("Julio")])
        let doc = TipTapNode.doc([paragraph(.textNode("fala "), mention, .textNode(" ok"))])
        #expect(roundTrip(doc) == doc)
    }

    @Test func stringLegadaViraParagrafos() {
        let doc = TipTapNode.from(.string("a\nb"))
        #expect(doc.content?.count == 2)
        #expect(doc.plainText == "a\nb")
    }

    @Test func documentoVazio() {
        #expect(TipTapNode.from(nil).isEmptyDocument)
        #expect(roundTrip(.doc([])) == .doc([]))
    }
}
