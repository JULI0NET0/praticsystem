import SwiftUI
import UniformTypeIdentifiers

/// Editor nativo para os documentos TipTap da web (descrição de demanda,
/// notas). Salva 900 ms depois de parar de digitar, como o BlockEditor.
struct RichTextEditorView: View {
    let document: TipTapNode
    var placeholder = "Escreva aqui…"
    var minHeight: CGFloat = 160
    /// Sobe uma imagem e devolve a URL pública; nil esconde o botão.
    var uploadImage: ((URL) async throws -> URL)?
    let onSave: (TipTapNode) async -> Void

    @State private var text = AttributedString()
    @State private var selection = AttributedTextSelection()
    @State private var lastSaved: TipTapNode?
    @State private var saveTask: Task<Void, Never>?
    @State private var isImporting = false
    @State private var linkDraft = ""
    @State private var isEditingLink = false
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            toolbar
            Divider()
            ZStack(alignment: .topLeading) {
                if text.characters.isEmpty {
                    Text(placeholder)
                        .foregroundStyle(.tertiary)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 8)
                        .allowsHitTesting(false)
                }
                TextEditor(text: $text, selection: $selection)
                    .focused($isFocused)
                    .scrollContentBackground(.hidden)
                    .font(.body)
                    .frame(minHeight: minHeight)
                    .padding(.vertical, 4)
            }
            .padding(.horizontal, 8)
        }
        .background(.background, in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(.separator))
        .onAppear(perform: loadFromDocument)
        .onChange(of: document) { _, newValue in
            // Mudança vinda de fora (outra pessoa, a web): só recarrega se não
            // estiver editando e se não for o próprio salvamento voltando.
            if !isFocused, newValue != lastSaved { loadFromDocument() }
        }
        .onChange(of: text) { _, _ in scheduleSave() }
        .onDisappear { flushSave() }
        .fileImporter(isPresented: $isImporting, allowedContentTypes: [.image]) { result in
            if case let .success(url) = result { insertImage(url) }
        }
        .alert("Link", isPresented: $isEditingLink) {
            TextField("https://…", text: $linkDraft)
            Button("Aplicar") { applyLink() }
            Button("Remover link", role: .destructive) { linkDraft = ""; applyLink() }
            Button("Cancelar", role: .cancel) {}
        }
    }

    private var toolbar: some View {
        HStack(spacing: 2) {
            Menu {
                Button("Texto") { setBlock(.paragraph) }
                Button("Título 1") { setBlock(RichBlock(kind: .heading, level: 1)) }
                Button("Título 2") { setBlock(RichBlock(kind: .heading, level: 2)) }
                Button("Título 3") { setBlock(RichBlock(kind: .heading, level: 3)) }
                Button("Citação") { setBlock(RichBlock(kind: .quote)) }
            } label: {
                Image(systemName: "textformat.size")
            }
            .menuIndicator(.hidden)
            .fixedSize()

            Divider().frame(height: 16).padding(.horizontal, 4)
            formatButton("bold", "Negrito", key: "b") { toggleIntent(.stronglyEmphasized) }
            formatButton("italic", "Itálico", key: "i") { toggleIntent(.emphasized) }
            formatButton("underline", "Sublinhado", key: "u") { toggleUnderline() }
            formatButton("strikethrough", "Riscado", key: "x", modifiers: [.command, .shift]) { toggleIntent(.strikethrough) }
            formatButton("chevron.left.forwardslash.chevron.right", "Código", key: "e") { toggleIntent(.code) }
            formatButton("highlighter", "Destaque", key: "h", modifiers: [.command, .shift]) { toggleHighlight() }
            formatButton("link", "Link", key: "k") { linkDraft = ""; isEditingLink = true }

            Divider().frame(height: 16).padding(.horizontal, 4)
            formatButton("list.bullet", "Lista", key: "8", modifiers: [.command, .shift]) { toggleList(.bullet) }
            formatButton("list.number", "Lista numerada", key: "7", modifiers: [.command, .shift]) { toggleList(.ordered) }
            formatButton("checklist", "Lista de tarefas", key: "9", modifiers: [.command, .shift]) { toggleList(.task) }
            formatButton("checkmark.square", "Marcar tarefa", key: "\r", modifiers: [.command]) { toggleChecked() }
            formatButton("increase.indent", "Aumentar recuo", key: "]") { indent(1) }
            formatButton("decrease.indent", "Diminuir recuo", key: "[") { indent(-1) }

            if uploadImage != nil {
                Divider().frame(height: 16).padding(.horizontal, 4)
                formatButton("photo", "Imagem", key: nil) { isImporting = true }
            }
            Spacer()
        }
        .buttonStyle(.borderless)
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
    }

    private func formatButton(_ symbol: String, _ help: String, key: Character?, modifiers: EventModifiers = .command, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol).frame(width: 22, height: 20)
        }
        .help(help)
        .modifier(OptionalShortcut(key: key, modifiers: modifiers))
    }

    // MARK: - Carregar e salvar

    private func loadFromDocument() {
        text = TipTapAttributedConverter.attributed(from: document)
        lastSaved = document
    }

    private func scheduleSave() {
        saveTask?.cancel()
        saveTask = Task {
            try? await Task.sleep(for: .milliseconds(900))
            guard !Task.isCancelled else { return }
            await save()
        }
    }

    private func flushSave() {
        saveTask?.cancel()
        Task { await save() }
    }

    private func save() async {
        let doc = TipTapAttributedConverter.document(from: text)
        guard doc != lastSaved else { return }
        lastSaved = doc
        await onSave(doc)
    }

    // MARK: - Marcas (inline)

    private func toggleIntent(_ intent: InlinePresentationIntent) {
        let hasIt = selectionAttribute { $0.inlinePresentationIntent?.contains(intent) == true }
        text.transformAttributes(in: &selection) { container in
            var current = container.inlinePresentationIntent ?? []
            if hasIt { current.remove(intent) } else { current.insert(intent) }
            container.inlinePresentationIntent = current.isEmpty ? nil : current
            container.font = RichTextStyle.font(block: container[RichBlockAttribute.self] ?? .paragraph, intent: current)
            container.strikethroughStyle = current.contains(.strikethrough) ? .single : nil
        }
    }

    private func toggleUnderline() {
        let hasIt = selectionAttribute { $0[RichUnderlineAttribute.self] == true }
        text.transformAttributes(in: &selection) { container in
            container[RichUnderlineAttribute.self] = hasIt ? nil : true
            container.underlineStyle = hasIt ? nil : .single
        }
    }

    private func toggleHighlight() {
        let hasIt = selectionAttribute { $0[RichHighlightAttribute.self] != nil }
        text.transformAttributes(in: &selection) { container in
            container[RichHighlightAttribute.self] = hasIt ? nil : ""
            container.backgroundColor = hasIt ? nil : Color.yellow.opacity(0.35)
        }
    }

    private func applyLink() {
        let url = URL(string: linkDraft.trimmingCharacters(in: .whitespaces))
        text.transformAttributes(in: &selection) { container in
            container.link = linkDraft.isEmpty ? nil : url
        }
    }

    private func selectionAttribute(_ predicate: (AttributedString.Runs.Run) -> Bool) -> Bool {
        let ranges = selectedRanges()
        guard !ranges.isEmpty else { return false }
        return ranges.allSatisfy { range in text[range].runs.allSatisfy(predicate) }
    }

    // MARK: - Blocos (linha inteira)

    private func setBlock(_ block: RichBlock) {
        mutateLines { _ in block }
    }

    private func toggleList(_ kind: RichBlock.Kind) {
        let lines = selectedLineRanges()
        let allAlready = lines.allSatisfy { text[$0].runs.first?[RichBlockAttribute.self]?.kind == kind }
        mutateLines { current in
            allAlready ? .paragraph : RichBlock(kind: kind, depth: current.isList ? current.depth : 0)
        }
    }

    private func toggleChecked() {
        mutateLines { current in
            guard current.kind == .task else { return current }
            var block = current
            block.checked.toggle()
            return block
        }
    }

    private func indent(_ delta: Int) {
        mutateLines { current in
            guard current.isList else { return current }
            var block = current
            block.depth = max(0, min(6, block.depth + delta))
            return block
        }
    }

    /// Troca o bloco das linhas selecionadas e redesenha o documento inteiro
    /// (marcadores, numeração, fontes) a partir do JSON resultante.
    private func mutateLines(_ transform: (RichBlock) -> RichBlock) {
        let lines = selectedLineRanges()
        guard !lines.isEmpty else { return }
        for range in lines {
            let current = text[range].runs.first?[RichBlockAttribute.self] ?? .paragraph
            guard current.kind != .opaque else { continue }
            var updated = transform(current)
            updated.opaqueID = nil
            updated.opaqueJSON = nil
            text[range][RichBlockAttribute.self] = updated
            if range.isEmpty { continue }
        }
        let doc = TipTapAttributedConverter.document(from: text)
        text = TipTapAttributedConverter.attributed(from: doc)
        selection = AttributedTextSelection()
    }

    private func insertImage(_ fileURL: URL) {
        guard let uploadImage else { return }
        Task {
            guard let url = try? await uploadImage(fileURL) else { return }
            var doc = TipTapAttributedConverter.document(from: text)
            doc.content = (doc.content ?? []) + [TipTapNode(type: "image", attrs: ["src": .string(url.absoluteString)])]
            text = TipTapAttributedConverter.attributed(from: doc)
            selection = AttributedTextSelection()
        }
    }

    private func selectedRanges() -> [Range<AttributedString.Index>] {
        switch selection.indices(in: text) {
        case .insertionPoint:
            return []
        case .ranges(let set):
            return set.ranges.map { $0 }
        }
    }

    /// Linhas tocadas pela seleção (ou a linha do cursor), sem o "\n" final.
    private func selectedLineRanges() -> [Range<AttributedString.Index>] {
        let chars = text.characters
        var anchors: [Range<AttributedString.Index>] = []
        switch selection.indices(in: text) {
        case .insertionPoint(let index):
            anchors = [index..<index]
        case .ranges(let set):
            anchors = set.ranges.map { $0 }
        }
        var lines: [Range<AttributedString.Index>] = []
        for anchor in anchors {
            var start = anchor.lowerBound
            while start > chars.startIndex, chars[chars.index(before: start)] != "\n" {
                start = chars.index(before: start)
            }
            var cursor = start
            while true {
                var end = cursor
                while end < chars.endIndex, chars[end] != "\n" { end = chars.index(after: end) }
                lines.append(cursor..<end)
                guard end < chars.endIndex, end < anchor.upperBound else { break }
                cursor = chars.index(after: end)
            }
        }
        return lines
    }
}

private struct OptionalShortcut: ViewModifier {
    let key: Character?
    let modifiers: EventModifiers

    func body(content: Content) -> some View {
        if let key {
            content.keyboardShortcut(KeyEquivalent(key), modifiers: modifiers)
        } else {
            content
        }
    }
}
