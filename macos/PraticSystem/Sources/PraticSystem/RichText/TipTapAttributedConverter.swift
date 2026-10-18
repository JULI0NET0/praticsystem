import Foundation
import SwiftUI

/// Converte o JSON do TipTap em AttributedString para o editor nativo e de
/// volta. Cada linha do texto é um bloco (parágrafo, título, item de lista…);
/// o que o editor não sabe editar vira uma linha "opaca" que guarda o nó
/// original e volta igual ao salvar.
enum TipTapAttributedConverter {
    static let lineSeparator: Character = "\u{2028}"

    // MARK: - TipTap → AttributedString

    static func attributed(from doc: TipTapNode) -> AttributedString {
        var lines: [AttributedString] = []
        appendBlocks(doc.content ?? [], depth: 0, into: &lines)
        var result = AttributedString()
        for (index, line) in lines.enumerated() {
            if index > 0 {
                var newline = AttributedString("\n")
                newline[RichBlockAttribute.self] = line.runs.first?[RichBlockAttribute.self]
                result += newline
            }
            result += line
        }
        RichTextStyle.restyle(&result)
        return result
    }

    private static func appendBlocks(_ nodes: [TipTapNode], depth: Int, into lines: inout [AttributedString]) {
        for node in nodes {
            switch node.type {
            case "paragraph":
                lines.append(line(node.content ?? [], block: .paragraph))
            case "heading":
                let level = node.attrs?["level"]?.intValue ?? 1
                lines.append(line(node.content ?? [], block: RichBlock(kind: .heading, level: level)))
            case "bulletList", "orderedList", "taskList":
                appendList(node, depth: depth, into: &lines)
            case "blockquote" where (node.content ?? []).allSatisfy({ $0.type == "paragraph" }):
                for paragraph in node.content ?? [] {
                    lines.append(line(paragraph.content ?? [], block: RichBlock(kind: .quote), prefix: "▍ "))
                }
            default:
                lines.append(opaqueLine(node))
            }
        }
    }

    private static func appendList(_ list: TipTapNode, depth: Int, into lines: inout [AttributedString]) {
        let kind: RichBlock.Kind = switch list.type {
        case "orderedList": .ordered
        case "taskList": .task
        default: .bullet
        }
        let start = list.attrs?["start"]?.intValue ?? 1
        for (index, item) in (list.content ?? []).enumerated() {
            let checked = item.attrs?["checked"]?.boolValue ?? false
            let block = RichBlock(kind: kind, depth: depth, checked: checked)
            let children = item.content ?? []
            // Parágrafos do item viram uma linha só (quebras viram hardBreak);
            // listas aninhadas descem um nível.
            var inline: [TipTapNode] = []
            for child in children where child.type == "paragraph" {
                if !inline.isEmpty { inline.append(TipTapNode(type: "hardBreak")) }
                inline += child.content ?? []
            }
            let indent = String(repeating: "    ", count: depth)
            let marker = switch kind {
            case .ordered: "\(start + index). "
            case .task: checked ? "☑ " : "☐ "
            default: "• "
            }
            lines.append(line(inline, block: block, prefix: indent + marker))
            for child in children where child.type != "paragraph" {
                if ["bulletList", "orderedList", "taskList"].contains(child.type) {
                    appendList(child, depth: depth + 1, into: &lines)
                } else {
                    lines.append(opaqueLine(child))
                }
            }
        }
    }

    private static func line(_ inline: [TipTapNode], block: RichBlock, prefix: String? = nil) -> AttributedString {
        var result = AttributedString()
        if let prefix {
            var marker = AttributedString(prefix)
            marker[RichPrefixAttribute.self] = true
            result += marker
        }
        for node in inline { result += inlineText(node) }
        result[RichBlockAttribute.self] = block
        return result
    }

    private static func inlineText(_ node: TipTapNode) -> AttributedString {
        switch node.type {
        case "text":
            var text = AttributedString(node.text ?? "")
            var intent: InlinePresentationIntent = []
            for mark in node.marks ?? [] {
                switch mark.type {
                case "bold": intent.insert(.stronglyEmphasized)
                case "italic": intent.insert(.emphasized)
                case "strike": intent.insert(.strikethrough)
                case "code": intent.insert(.code)
                case "underline": text[RichUnderlineAttribute.self] = true
                case "link":
                    if let href = mark.attrs?["href"]?.stringValue { text.link = URL(string: href) }
                case "highlight": text[RichHighlightAttribute.self] = mark.attrs?["color"]?.stringValue ?? ""
                case "textStyle":
                    if let color = mark.attrs?["color"]?.stringValue { text[RichColorAttribute.self] = color }
                default: break
                }
            }
            if !intent.isEmpty { text.inlinePresentationIntent = intent }
            return text
        case "hardBreak":
            return AttributedString(String(lineSeparator))
        case "mention", "clientMention":
            var text = AttributedString(node.plainText)
            text[RichMentionAttribute.self] = encode(node)
            return text
        default:
            return AttributedString(node.plainText)
        }
    }

    private static func opaqueLine(_ node: TipTapNode) -> AttributedString {
        let label: String = switch node.type {
        case "image": "🖼  Imagem"
        case "table": "▦  Tabela — edite na web"
        case "horizontalRule": "———"
        case "codeBlock": "⌨︎  " + node.plainText.replacingOccurrences(of: "\n", with: " ⏎ ")
        case "linkCard": "🔗  " + (node.attrs?["url"]?.stringValue ?? node.attrs?["href"]?.stringValue ?? "Link")
        default: "◻︎  " + (node.plainText.isEmpty ? node.type : node.plainText.replacingOccurrences(of: "\n", with: " "))
        }
        var text = AttributedString(label)
        text[RichBlockAttribute.self] = RichBlock(kind: .opaque, opaqueID: UUID().uuidString, opaqueJSON: encode(node))
        return text
    }

    // MARK: - AttributedString → TipTap

    private struct Line {
        var block: RichBlock
        var inline: [TipTapNode]
    }

    static func document(from text: AttributedString) -> TipTapNode {
        let lines = splitLines(text)
        var blocks: [TipTapNode] = []
        var index = 0
        var lastOpaqueID: String?
        while index < lines.count {
            let line = lines[index]
            switch line.block.kind {
            case .opaque:
                if line.block.opaqueID != lastOpaqueID, let node = line.block.opaqueJSON.flatMap(decodeNode) {
                    blocks.append(node)
                }
                lastOpaqueID = line.block.opaqueID
                index += 1
                continue
            case .heading:
                blocks.append(TipTapNode(type: "heading", attrs: ["level": .integer(max(1, min(3, line.block.level)))], content: nonEmpty(line.inline)))
                index += 1
            case .quote:
                var paragraphs: [TipTapNode] = []
                while index < lines.count, lines[index].block.kind == .quote {
                    paragraphs.append(TipTapNode(type: "paragraph", content: nonEmpty(lines[index].inline)))
                    index += 1
                }
                blocks.append(TipTapNode(type: "blockquote", content: paragraphs))
            case .bullet, .ordered, .task:
                blocks.append(buildList(lines, index: &index, depth: line.block.depth))
            case .paragraph:
                blocks.append(TipTapNode(type: "paragraph", content: nonEmpty(line.inline)))
                index += 1
            }
            lastOpaqueID = nil
        }
        // Linhas vazias no fim não viram parágrafos soltos.
        while blocks.count > 1, let last = blocks.last, last.type == "paragraph", last.content == nil {
            blocks.removeLast()
        }
        return .doc(blocks)
    }

    private static func buildList(_ lines: [Line], index: inout Int, depth: Int) -> TipTapNode {
        let kind = lines[index].block.kind
        var items: [TipTapNode] = []
        while index < lines.count {
            let line = lines[index]
            guard line.block.isList, line.block.depth >= depth else { break }
            if line.block.depth > depth {
                // Lista aninhada pertence ao último item.
                let nested = buildList(lines, index: &index, depth: line.block.depth)
                if items.isEmpty {
                    items.append(TipTapNode(type: kind == .task ? "taskItem" : "listItem", attrs: kind == .task ? ["checked": .bool(false)] : nil, content: [TipTapNode(type: "paragraph")]))
                }
                items[items.count - 1].content?.append(nested)
                continue
            }
            guard line.block.kind == kind else { break }
            let paragraph = TipTapNode(type: "paragraph", content: nonEmpty(line.inline))
            items.append(kind == .task
                ? TipTapNode(type: "taskItem", attrs: ["checked": .bool(line.block.checked)], content: [paragraph])
                : TipTapNode(type: "listItem", content: [paragraph]))
            index += 1
        }
        let type = switch kind {
        case .ordered: "orderedList"
        case .task: "taskList"
        default: "bulletList"
        }
        return TipTapNode(type: type, content: items)
    }

    private static func splitLines(_ text: AttributedString) -> [Line] {
        var lines: [Line] = []
        var current = Line(block: .paragraph, inline: [])
        var blockSet = false

        func flush() {
            lines.append(current)
            current = Line(block: .paragraph, inline: [])
            blockSet = false
        }

        for run in text.runs {
            let block = run[RichBlockAttribute.self]
            let segments = String(text[run.range].characters).split(separator: "\n", omittingEmptySubsequences: false)
            for (offset, segment) in segments.enumerated() {
                if offset > 0 { flush() }
                if !blockSet, let block, !segment.isEmpty {
                    current.block = block
                    blockSet = true
                }
                guard !segment.isEmpty, run[RichPrefixAttribute.self] != true else { continue }
                appendInline(String(segment), run: run, to: &current.inline)
            }
        }
        flush()
        return lines
    }

    private static func appendInline(_ string: String, run: AttributedString.Runs.Run, to inline: inout [TipTapNode]) {
        if let mention = run[RichMentionAttribute.self], let node = decodeNode(mention) {
            if inline.last != node { inline.append(node) }
            return
        }
        var marks: [TipTapMark] = []
        let intent = run.inlinePresentationIntent ?? []
        if intent.contains(.stronglyEmphasized) { marks.append(TipTapMark(type: "bold")) }
        if intent.contains(.emphasized) { marks.append(TipTapMark(type: "italic")) }
        if run[RichUnderlineAttribute.self] == true { marks.append(TipTapMark(type: "underline")) }
        if intent.contains(.strikethrough) { marks.append(TipTapMark(type: "strike")) }
        if intent.contains(.code) { marks.append(TipTapMark(type: "code")) }
        if let link = run.link { marks.append(TipTapMark(type: "link", attrs: ["href": .string(link.absoluteString)])) }
        if let highlight = run[RichHighlightAttribute.self] {
            marks.append(TipTapMark(type: "highlight", attrs: highlight.isEmpty ? nil : ["color": .string(highlight)]))
        }
        if let color = run[RichColorAttribute.self] {
            marks.append(TipTapMark(type: "textStyle", attrs: ["color": .string(color)]))
        }

        let pieces = string.split(separator: lineSeparator, omittingEmptySubsequences: false)
        for (offset, piece) in pieces.enumerated() {
            if offset > 0 { inline.append(TipTapNode(type: "hardBreak")) }
            guard !piece.isEmpty else { continue }
            if let last = inline.last, last.type == "text", (last.marks ?? []) == marks {
                inline[inline.count - 1].text = (last.text ?? "") + piece
            } else {
                inline.append(.textNode(String(piece), marks: marks))
            }
        }
    }

    private static func nonEmpty(_ inline: [TipTapNode]) -> [TipTapNode]? {
        inline.isEmpty ? nil : inline
    }

    private static func encode(_ node: TipTapNode) -> String {
        (try? String(decoding: JSONEncoder().encode(node), as: UTF8.self)) ?? "{}"
    }

    private static func decodeNode(_ json: String) -> TipTapNode? {
        try? JSONDecoder().decode(TipTapNode.self, from: Data(json.utf8))
    }
}
