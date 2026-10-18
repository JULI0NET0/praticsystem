import Foundation
import Supabase

/// Um nó do JSON do TipTap/ProseMirror, como a web grava em
/// `demands.description` e `notes.content`.
struct TipTapNode: Codable, Hashable, Sendable {
    var type: String
    var attrs: [String: AnyJSON]?
    var content: [TipTapNode]?
    var text: String?
    var marks: [TipTapMark]?

    init(type: String, attrs: [String: AnyJSON]? = nil, content: [TipTapNode]? = nil, text: String? = nil, marks: [TipTapMark]? = nil) {
        self.type = type
        self.attrs = attrs
        self.content = content
        self.text = text
        self.marks = marks
    }

    static func doc(_ content: [TipTapNode]) -> TipTapNode {
        TipTapNode(type: "doc", content: content.isEmpty ? [TipTapNode(type: "paragraph")] : content)
    }

    static func textNode(_ text: String, marks: [TipTapMark] = []) -> TipTapNode {
        TipTapNode(type: "text", text: text, marks: marks.isEmpty ? nil : marks)
    }

    /// Texto puro do nó, para resumos e para mostrar blocos não editáveis.
    var plainText: String {
        if let text { return text }
        if type == "hardBreak" { return "\n" }
        if type == "mention" || type == "clientMention" {
            return "@" + (attrs?["label"]?.stringValue ?? attrs?["id"]?.stringValue ?? "")
        }
        let separator = ["doc", "bulletList", "orderedList", "taskList", "listItem", "taskItem", "table", "tableRow", "blockquote"].contains(type) ? "\n" : (type == "tableCell" || type == "tableHeader" ? "\t" : "")
        return (content ?? []).map(\.plainText).joined(separator: separator)
    }

    /// Decodifica o que vier do banco: JSON do TipTap, string (legado) ou nada.
    static func from(_ json: AnyJSON?) -> TipTapNode {
        guard let json, json != .null else { return .doc([]) }
        if case let .string(text) = json {
            return .doc(text.split(separator: "\n", omittingEmptySubsequences: false).map {
                TipTapNode(type: "paragraph", content: $0.isEmpty ? nil : [.textNode(String($0))])
            })
        }
        if let data = try? JSONEncoder().encode(json),
           let node = try? JSONDecoder().decode(TipTapNode.self, from: data),
           node.type == "doc" {
            return node
        }
        return .doc([])
    }

    var anyJSON: AnyJSON {
        (try? JSONDecoder().decode(AnyJSON.self, from: JSONEncoder().encode(self))) ?? .null
    }

    var isEmptyDocument: Bool {
        plainText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !(content ?? []).contains { !["paragraph", "heading"].contains($0.type) }
    }
}

struct TipTapMark: Codable, Hashable, Sendable {
    var type: String
    var attrs: [String: AnyJSON]?

    init(type: String, attrs: [String: AnyJSON]? = nil) {
        self.type = type
        self.attrs = attrs
    }
}
