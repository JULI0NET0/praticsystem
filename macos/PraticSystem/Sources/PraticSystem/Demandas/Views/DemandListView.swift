import SwiftUI

enum DemandListGroupBy: String, CaseIterable {
    case due, status

    var label: String { self == .due ? "Por prazo" : "Por status" }
}

/// Visão em lista (DemandListView.tsx): seções por prazo ou por status,
/// recolhíveis, com adição rápida e arrastar entre seções.
struct DemandListView: View {
    @Bindable var store: DemandsStore
    let demands: [Demand]
    let groupBy: DemandListGroupBy
    var onOpen: (Demand) -> Void
    var onDelete: (Set<UUID>) -> Void

    @State private var collapsed: Set<String> = []
    /// Concluídas há pouco ficam no lugar 380 ms antes de descer (COMPLETION_HOLD_MS).
    @State private var holding: Set<UUID> = []

    private struct Group: Identifiable {
        let id: String
        let title: String
        let color: Color?
        let demands: [Demand]
        let quickAdd: QuickAddPreset?
        let acceptsDrop: Bool
    }

    private var groups: [Group] {
        let isDone: (Demand) -> Bool = { $0.isDone && !holding.contains($0.id) }
        let sorter: (Demand, Demand) -> Bool = { a, b in
            if isDone(a) != isDone(b) { return !isDone(a) }
            if a.priority.order != b.priority.order { return a.priority.order < b.priority.order }
            return (a.dueDate ?? "9999") < (b.dueDate ?? "9999")
        }
        switch groupBy {
        case .due:
            let byBucket = Dictionary(grouping: demands) {
                DueDate.demandBucket(dueDate: $0.dueDate, isDone: $0.isDone, completedAt: $0.completedAt)
            }
            return DueBucket.allCases.compactMap { bucket in
                let items = (byBucket[bucket] ?? []).sorted(by: sorter)
                let droppable = bucket.dropDate() != nil
                guard !items.isEmpty || droppable else { return nil }
                let preset: QuickAddPreset? = droppable ? QuickAddPreset(dueDate: bucket.dropDate() ?? nil) : nil
                return Group(id: bucket.rawValue, title: bucket.label, color: bucket == .atrasada ? .red : nil,
                             demands: items, quickAdd: preset, acceptsDrop: droppable)
            }
        case .status:
            return store.statuses.map { status in
                Group(id: status.id, title: status.label, color: Color(hex: status.color),
                      demands: demands.filter { $0.status == status.id }.sorted(by: sorter),
                      quickAdd: QuickAddPreset(status: status.id), acceptsDrop: true)
            }
        }
    }

    var body: some View {
        List(selection: $store.selection) {
            ForEach(groups) { group in
                Section(isExpanded: expansion(group.id)) {
                    ForEach(group.demands) { demand in
                        DemandRow(demand: demand, store: store, isHeld: holding.contains(demand.id)) {
                            complete(demand)
                        }
                        .tag(demand.id)
                        .draggable(demand.id.lower)
                        .contextMenu {
                            DemandContextMenu(demand: demand, store: store, onOpen: { onOpen(demand) }, onDelete: onDelete)
                        }
                    }
                    if let preset = group.quickAdd {
                        QuickAddRow(store: store, preset: preset)
                    }
                } header: {
                    header(group)
                }
            }
        }
        .listStyle(.inset)
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: demands.map(\.id))
        .contextMenu(forSelectionType: UUID.self) { _ in
            EmptyView()
        } primaryAction: { ids in
            if let id = ids.first, let demand = store.demand(id) { onOpen(demand) }
        }
    }

    private func header(_ group: Group) -> some View {
        HStack(spacing: 8) {
            if let color = group.color {
                Circle().fill(color).frame(width: 8, height: 8)
            }
            Text(group.title).font(.headline)
            Text("\(group.demands.count)").foregroundStyle(.secondary).monospacedDigit()
            Spacer()
            if group.id == DueBucket.atrasada.rawValue {
                RescheduleOverdueMenu(store: store)
            }
        }
        .contentShape(.rect)
        .dropDestination(for: String.self) { ids, _ in
            guard group.acceptsDrop else { return false }
            drop(ids, on: group.id)
            return true
        }
    }

    private func expansion(_ id: String) -> Binding<Bool> {
        Binding(
            get: { !collapsed.contains(id) },
            set: { if $0 { collapsed.remove(id) } else { collapsed.insert(id) } }
        )
    }

    private func complete(_ demand: Demand) {
        if !demand.isDone {
            holding.insert(demand.id)
            Task {
                try? await Task.sleep(for: .milliseconds(380))
                withAnimation { _ = holding.remove(demand.id) }
            }
        }
        Task { await store.toggleComplete(demand.id) }
    }

    private func drop(_ ids: [String], on groupID: String) {
        let uuids = Set(ids.compactMap(UUID.init(uuidString:)))
        let targets = uuids.count == 1 && store.selection.contains(uuids.first!) ? store.selection : uuids
        Task {
            switch groupBy {
            case .due:
                guard let bucket = DueBucket(rawValue: groupID), let date = bucket.dropDate() else { return }
                await store.batchOrSingle(targets, date == nil ? [.dueDate(nil), .dueTime(nil)] : [.dueDate(date)])
            case .status:
                await store.batchOrSingle(targets, [.status(groupID)])
            }
        }
    }
}

struct DemandRow: View {
    let demand: Demand
    let store: DemandsStore
    var isHeld = false
    let onToggle: () -> Void
    @AppStorage(PrefKey.demandsShowClientTitle) private var showClientInTitle = false
    @State private var isHovering = false

    private var looksDone: Bool { demand.isDone || isHeld }

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            Button(action: onToggle) {
                Image(systemName: looksDone ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(looksDone ? Color.praticOrange : demand.priority == .none ? .secondary : demand.priority.color)
                    .contentTransition(.symbolEffect(.replace))
            }
            .buttonStyle(.plain)
            .help(looksDone ? "Reabrir" : "Concluir")

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(titleText)
                        .strikethrough(looksDone)
                        .foregroundStyle(looksDone ? .secondary : .primary)
                        .lineLimit(2)
                    PriorityFlag(priority: demand.priority)
                }
                HStack(spacing: 10) {
                    Text(store.clientName(for: demand) ?? "Interna")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if isHovering || store.selection.contains(demand.id) {
                        StatusPill(status: store.status(demand.status))
                    }
                    AgendaChip(demand: demand)
                    if demand.checklistTotal > 0 {
                        Label("\(demand.checklistDone)/\(demand.checklistTotal)", systemImage: "checklist")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    if demand.commentCount > 0 {
                        Label("\(demand.commentCount)", systemImage: "bubble.left").font(.caption).foregroundStyle(.secondary)
                    }
                    if demand.attachmentCount > 0 {
                        Label("\(demand.attachmentCount)", systemImage: "paperclip").font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
            Spacer(minLength: 8)
            DueChip(demand: demand) { date, time in
                Task { await store.update(demand.id, [.dueDate(date), .dueTime(time)]) }
            }
            AssigneeStack(demand: demand)
        }
        .padding(.vertical, 4)
        .onHover { isHovering = $0 }
    }

    private var titleText: String {
        guard showClientInTitle, let client = store.clientName(for: demand) else { return demand.title }
        return "\(demand.title) - \(client)"
    }
}

struct QuickAddPreset {
    var dueDate: String?
    var status: String?
    var priority: DemandPriority?
}

/// Linha de adição rápida com os atalhos do título (#cliente @pessoa sexta 14h P1).
struct QuickAddRow: View {
    let store: DemandsStore
    let preset: QuickAddPreset
    @Environment(TeamStore.self) private var team
    @State private var text = ""
    @FocusState private var focused: Bool

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "plus").foregroundStyle(Color.praticOrange)
            TextField("Adicionar demanda…  #cliente  @pessoa  sexta 14h  P1", text: $text)
                .textFieldStyle(.plain)
                .focused($focused)
                .onSubmit(submit)
            if !text.isEmpty {
                QuickTokenChips(result: parsed)
            }
        }
        .padding(.vertical, 2)
        .selectionDisabled()
    }

    private var parsed: QuickParse.Result {
        QuickParse.parse(text, catalogs: QuickParse.catalogs(clients: store.clientList, team: team.members))
    }

    private func submit() {
        let result = parsed
        guard !result.title.isEmpty || !text.isEmpty else { return }
        var input = DemandsStore.NewDemandInput()
        input.title = result.title.isEmpty ? text : result.title
        input.clientID = result.clientID.flatMap(UUID.init(uuidString:))
        if !result.assigneeIDs.isEmpty { input.assigneeIDs = result.assigneeIDs.compactMap(UUID.init(uuidString:)) }
        input.priority = result.priority ?? preset.priority ?? .none
        input.dueDate = result.dueDate ?? preset.dueDate
        input.dueTime = result.dueTime
        input.status = preset.status
        text = ""
        Task { await store.create(input) }
        focused = true
    }
}

struct QuickTokenChips: View {
    let result: QuickParse.Result

    var body: some View {
        HStack(spacing: 4) {
            ForEach(Array(result.tokens.enumerated()), id: \.offset) { _, token in
                Label(token.label, systemImage: icon(token.kind))
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.praticOrange.opacity(0.14), in: .capsule)
            }
        }
    }

    private func icon(_ kind: QuickParse.TokenKind) -> String {
        switch kind {
        case .client: "building.2"
        case .assignee: "person"
        case .priority: "flag"
        case .date: "calendar"
        case .time: "clock"
        }
    }
}

/// Reagendar todas as atrasadas de uma vez (RescheduleOverdueMenu.tsx).
struct RescheduleOverdueMenu: View {
    let store: DemandsStore
    @State private var pending: (ids: Set<UUID>, date: String, label: String)?
    @State private var showPicker = false
    @State private var picked = Date.now

    var body: some View {
        let overdue = openOverdueDemands(store.demands)
        if !overdue.isEmpty {
            Menu("Reagendar") {
                ForEach(ReschedulePreset.allCases, id: \.self) { preset in
                    Button(preset.label) { pending = (Set(overdue.map(\.id)), preset.date(), preset.label.lowercased()) }
                }
                Button("Escolher data…") { showPicker = true }
            }
            .menuStyle(.button)
            .buttonStyle(.borderless)
            .controlSize(.small)
            .fixedSize()
            .popover(isPresented: $showPicker) {
                VStack {
                    DatePicker("", selection: $picked, displayedComponents: .date).datePickerStyle(.graphical).labelsHidden()
                    Button("Reagendar para esta data") {
                        showPicker = false
                        pending = (Set(overdue.map(\.id)), DueDate.toISO(picked), DueDate.label(DueDate.toISO(picked)).label.lowercased())
                    }
                }
                .padding()
            }
            .confirmationDialog(
                pending.map { "Reagendar \($0.ids.count) demanda\($0.ids.count == 1 ? " atrasada" : "s atrasadas") para \($0.label)?" } ?? "",
                isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } })
            ) {
                Button("Reagendar") {
                    if let pending { Task { await store.batchUpdate(pending.ids, [.dueDate(pending.date)]) } }
                    pending = nil
                }
            }
        }
    }
}
