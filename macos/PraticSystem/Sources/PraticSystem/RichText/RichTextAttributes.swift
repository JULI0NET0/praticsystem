import Foundation
import SwiftUI

/// Tipo de bloco de cada linha do editor. É o que permite voltar para o JSON
/// do TipTap sem adivinhar pela aparência.
struct RichBlock: Codable, Hashable, Sendable {
    enum Kind: String, Codable, Sendable {
        case paragraph, heading, bullet, ordered, task, quote, opaque
    }

    var kind: Kind
    var level: Int = 0
    var depth: Int = 0
    var checked: Bool = false
    /// Blocos que o editor nativo não edita (tabela, imagem, card de link…)
    /// guardam o nó original, que volta intacto ao salvar.
    var opaqueID: String?
    var opaqueJSON: String?

    static let paragraph = RichBlock(kind: .paragraph)

    var isList: Bool { kind == .bullet || kind == .ordered || kind == .task }
}

enum RichBlockAttribute: CodableAttributedStringKey {
    typealias Value = RichBlock
    static let name = "pratic.block"
}

/// Marca os caracteres de marcador ("• ", "1. ", "☐ ") que o editor desenha;
/// eles não vão para o documento.
enum RichPrefixAttribute: CodableAttributedStringKey {
    typealias Value = Bool
    static let name = "pratic.prefix"
}

/// Nó de menção (`mention`/`clientMention`) serializado em JSON.
enum RichMentionAttribute: CodableAttributedStringKey {
    typealias Value = String
    static let name = "pratic.mention"
}

/// Cor do destaque (`highlight`); string vazia = destaque padrão.
enum RichHighlightAttribute: CodableAttributedStringKey {
    typealias Value = String
    static let name = "pratic.highlight"
}

/// Cor do texto (`textStyle.color`), em hex/CSS como a web grava.
enum RichColorAttribute: CodableAttributedStringKey {
    typealias Value = String
    static let name = "pratic.color"
}

enum RichUnderlineAttribute: CodableAttributedStringKey {
    typealias Value = Bool
    static let name = "pratic.underline"
}

extension AttributeScopes {
    struct PraticRichTextAttributes: AttributeScope {
        let block: RichBlockAttribute
        let prefix: RichPrefixAttribute
        let mention: RichMentionAttribute
        let highlight: RichHighlightAttribute
        let textColor: RichColorAttribute
        let underline: RichUnderlineAttribute
        let foundation: FoundationAttributes
        let swiftUI: SwiftUIAttributes
    }

    var pratic: PraticRichTextAttributes.Type { PraticRichTextAttributes.self }
}

enum RichTextStyle {
    /// Aparência derivada do bloco e das marcas — sempre recalculada, nunca lida.
    static func font(block: RichBlock, intent: InlinePresentationIntent?) -> Font {
        var font: Font
        switch block.kind {
        case .heading:
            switch block.level {
            case 1: font = .title.weight(.bold)
            case 2: font = .title2.weight(.bold)
            default: font = .title3.weight(.semibold)
            }
        case .quote: font = .body.italic()
        case .opaque: font = .callout
        default: font = .body
        }
        guard let intent else { return font }
        if intent.contains(.code) { font = font.monospaced() }
        if intent.contains(.stronglyEmphasized) { font = font.bold() }
        if intent.contains(.emphasized) { font = font.italic() }
        return font
    }

    static func color(css: String) -> Color? {
        let hex = css.trimmingCharacters(in: .whitespaces)
        guard hex.hasPrefix("#"), hex.count == 7 || hex.count == 4 else { return nil }
        let expanded = hex.count == 4 ? "#" + hex.dropFirst().map { "\($0)\($0)" }.joined() : hex
        return Color(hex: expanded)
    }

    static func restyle(_ text: inout AttributedString) {
        for run in text.runs {
            let block = run[RichBlockAttribute.self] ?? .paragraph
            let range = run.range
            text[range].font = font(block: block, intent: run.inlinePresentationIntent)
            text[range].strikethroughStyle = run.inlinePresentationIntent?.contains(.strikethrough) == true ? .single : nil
            text[range].underlineStyle = run[RichUnderlineAttribute.self] == true ? .single : nil
            if run[RichMentionAttribute.self] != nil {
                text[range].foregroundColor = .praticOrange
            } else if let css = run[RichColorAttribute.self] {
                text[range].foregroundColor = color(css: css)
            } else if run[RichPrefixAttribute.self] == true || block.kind == .opaque || (block.kind == .task && block.checked) {
                text[range].foregroundColor = .secondary
            } else {
                text[range].foregroundColor = nil
            }
            if let highlight = run[RichHighlightAttribute.self] {
                text[range].backgroundColor = (color(css: highlight) ?? .yellow).opacity(0.35)
            } else {
                text[range].backgroundColor = nil
            }
        }
    }
}
