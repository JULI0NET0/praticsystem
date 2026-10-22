import SwiftUI

/// Quadro de demandas por status, ao vivo com a web. Arrastar um card para
/// outra coluna troca o status, como no quadro da web.
struct DemandBoardView: View {
    @State private var store = DemandsStore()
    @State private var search = ""
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView(.horizontal) {
            HStack(alignment: .top, spacing: 16) {
                ForEach(store.statuses) { status in
                    DemandColumn(
                        status: status,
                        demands: store.demands(in: status, matching: search),
                        store: store
                    )
                }
            }
            .padding(20)
        }
        .scrollIndicators(.automatic)
        .overlay {
            if store.statuses.isEmpty {
                if store.isLoading {
                    ProgressView()
                } else if let message = store.errorMessage {
                    ContentUnavailableView("Sem conexão", systemImage: "wifi.exclamationmark", description: Text(message))
                }
            }
        }
        .searchable(text: $search, placement: .toolbar, prompt: "Buscar demanda ou cliente")
        .navigationTitle("Demandas")
        .navigationSubtitle("\(store.demands.filter { !$0.isDone }.count) em aberto")
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button("Atualizar", systemImage: "arrow.clockwise") {
                    Task { await store.load() }
                }
                .keyboardShortcut("r")
                Button("Abrir na web", systemImage: "safari") {
                    openURL(AppModule.demandas.webURL)
                }
            }
        }
        .alert(
            "Demandas",
            isPresented: Binding(
                get: { store.errorMessage != nil && !store.statuses.isEmpty },
                set: { if !$0 { store.errorMessage = nil } }
            ),
            actions: { Button("OK") {} },
            message: { Text(store.errorMessage ?? "") }
        )
        .task {
            await store.load()
            await store.startLiveUpdates()
        }
        // A tabela `demands` ainda não está na publicação do Realtime, então
        // também recarrega a cada 30 s e ao voltar para o app.
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(30))
                await store.load()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSApplication.didBecomeActiveNotification)) { _ in
            Task { await store.load() }
        }
    }
}

private struct DemandColumn: View {
    let status: DemandStatus
    let demands: [Demand]
    let store: DemandsStore
    @State private var isTargeted = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Circle()
                    .fill(Color(hex: status.color))
                    .frame(width: 8, height: 8)
                Text(status.label)
                    .font(.headline)
                Text("\(demands.count)")
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .glassEffect(.regular.tint(Color(hex: status.color).opacity(0.18)), in: .capsule)

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(demands) { demand in
                        DemandCard(demand: demand, clientName: store.clientName(for: demand))
                            .draggable(demand.id.uuidString)
                            .contextMenu {
                                Menu("Mover para") {
                                    ForEach(store.statuses) { target in
                                        Button(target.label) {
                                            Task { await store.move(demand, to: target) }
                                        }
                                        .disabled(target.id == demand.status)
                                    }
                                }
                            }
                    }
                }
                .padding(.bottom, 12)
            }
            .scrollIndicators(.never)
        }
        .frame(width: 290)
        .frame(maxHeight: .infinity, alignment: .top)
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(isTargeted ? Color.praticOrange.opacity(0.08) : Color.primary.opacity(0.03))
        )
        .dropDestination(for: String.self) { ids, _ in
            guard let id = ids.first.flatMap(UUID.init(uuidString:)),
                  let demand = store.demands.first(where: { $0.id == id }) else { return false }
            Task { await store.move(demand, to: status) }
            return true
        } isTargeted: { isTargeted = $0 }
    }
}

private struct DemandCard: View {
    let demand: Demand
    let clientName: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let clientName {
                Text(clientName.uppercased())
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            Text(demand.title.isEmpty ? "Sem título" : demand.title)
                .font(.body.weight(.medium))
                .strikethrough(demand.isDone)
                .foregroundStyle(demand.isDone ? .secondary : .primary)
                .lineLimit(3)

            HStack(spacing: 10) {
                if demand.priority != .none {
                    let color = demand.priority.color
                    Label(demand.priority.label, systemImage: "flag.fill")
                        .foregroundStyle(color)
                }
                if let due = demand.dueDate, let label = Self.dueLabel(due) {
                    Label(label, systemImage: "calendar")
                        .foregroundStyle(Self.isOverdue(due) && !demand.isDone ? .red : .secondary)
                }
            }
            .font(.caption)
            .labelStyle(.titleAndIcon)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(.background, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(.separator.opacity(0.6)))
        .accessibilityElement(children: .combine)
    }

    private static let parser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static func dueLabel(_ value: String) -> String? {
        guard let date = parser.date(from: value) else { return nil }
        return date.formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "pt_BR")))
    }

    private static func isOverdue(_ value: String) -> Bool {
        guard let date = parser.date(from: value) else { return false }
        return date < Calendar.current.startOfDay(for: .now)
    }
}
