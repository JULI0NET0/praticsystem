import AppKit
import SwiftUI

struct StatusPill: View {
    let status: DemandStatus?

    var body: some View {
        if let status {
            HStack(spacing: 5) {
                Circle().fill(Color(hex: status.color)).frame(width: 7, height: 7)
                Text(status.label).lineLimit(1)
            }
            .font(.caption.weight(.medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Color(hex: status.color).opacity(0.14), in: .capsule)
        }
    }
}

struct PriorityFlag: View {
    let priority: DemandPriority
    var showsLabel = false

    var body: some View {
        if priority != .none {
            Label {
                if showsLabel { Text(priority.label) } else { Text(priority.short) }
            } icon: {
                Image(systemName: "flag.fill")
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(priority.color)
            .help(priority.label)
        }
    }
}

struct AgendaChip: View {
    let demand: Demand

    var body: some View {
        if let subject = demand.agendaSubject, demand.dueDate != nil {
            Label(subject.label, systemImage: demand.agendaEvent?.googleEventID != nil ? "calendar.badge.checkmark" : "calendar")
                .font(.caption)
                .foregroundStyle(.secondary)
                .help(demand.agendaEvent?.googleEventID != nil ? "Na Agenda e no Google" : "Na Agenda")
        }
    }
}

struct AssigneeStack: View {
    let demand: Demand
    @Environment(TeamStore.self) private var team

    var body: some View {
        if demand.assignAllTeam {
            Image(systemName: "person.3.fill")
                .font(.caption)
                .foregroundStyle(.secondary)
                .help("Toda a equipe")
        } else {
            let members = team.members(demand.assigneeIDs)
            HStack(spacing: -6) {
                ForEach(members.prefix(3)) { member in
                    Avatar(member: member, size: 20)
                }
                if members.count > 3 {
                    Text("+\(members.count - 3)").font(.caption2).padding(.leading, 8)
                }
            }
            .help(members.map(\.name).joined(separator: ", "))
        }
    }
}

struct Avatar: View {
    let member: TeamMember
    var size: CGFloat = 24

    var body: some View {
        AsyncImage(url: member.avatarURL.flatMap(URL.init(string:))) { image in
            image.resizable().scaledToFill()
        } placeholder: {
            Text(member.initials)
                .font(.system(size: size * 0.42, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.praticOrange)
        }
        .frame(width: size, height: size)
        .clipShape(.circle)
        .overlay(Circle().strokeBorder(.background, lineWidth: 1.5))
    }
}

/// Prazo clicável: abre o popover com Hoje / Amanhã / Próx. semana / Sem prazo,
/// calendário e hora (DueDatePickerPopover.tsx).
struct DueChip: View {
    let demand: Demand
    let onChange: (_ date: String?, _ time: String?) -> Void
    @State private var isPresented = false

    var body: some View {
        let label = DueDate.label(demand.dueDate)
        Button {
            isPresented = true
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "calendar")
                Text(label.label)
                if !DueDate.formatTime(demand.dueTime).isEmpty {
                    Text(DueDate.formatTime(demand.dueTime))
                }
            }
            .font(.caption)
            .foregroundStyle(demand.isDone ? .secondary : Self.color(label.tone))
        }
        .buttonStyle(.plain)
        .popover(isPresented: $isPresented, arrowEdge: .bottom) {
            DueDatePopover(date: demand.dueDate, time: demand.dueTime) { date, time in
                onChange(date, time)
                isPresented = false
            }
        }
    }

    static func color(_ tone: DueTone) -> Color {
        switch tone {
        case .overdue: .red
        case .today: .green
        case .soon: .praticOrange
        case .normal: .primary
        case .muted: .secondary
        }
    }
}

struct DueDatePopover: View {
    let date: String?
    let time: String?
    let onPick: (_ date: String?, _ time: String?) -> Void

    @State private var picked = Date.now
    @State private var hasTime = false
    @State private var pickedTime = Date.now
    @State private var typed = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            TextField("Digite: sexta, 03/09, em 3 dias…", text: $typed)
                .textFieldStyle(.roundedBorder)
                .onSubmit {
                    if let parsed = DueDate.parseInput(typed) { onPick(parsed, currentTime) }
                }
            HStack {
                preset("Hoje", DueDate.toISO(.now))
                preset("Amanhã", DueDate.toISO(DueDate.addDays(.now, 1)))
                preset("Próx. semana", nextMondayISO())
                Button("Sem prazo") { onPick(nil, nil) }
            }
            .buttonStyle(.bordered)
            .controlSize(.small)

            DatePicker("", selection: $picked, displayedComponents: .date)
                .datePickerStyle(.graphical)
                .labelsHidden()
                .environment(\.locale, Locale(identifier: "pt_BR"))

            Toggle("Horário", isOn: $hasTime)
            if hasTime {
                DatePicker("Hora", selection: $pickedTime, displayedComponents: .hourAndMinute)
                    .environment(\.locale, Locale(identifier: "pt_BR"))
            }
            HStack {
                Spacer()
                Button("Aplicar") { onPick(DueDate.toISO(picked), currentTime) }
                    .buttonStyle(.glassProminent)
                    .keyboardShortcut(.defaultAction)
            }
        }
        .padding(14)
        .frame(width: 300)
        .onAppear {
            if let date, let parsed = DueDate.fromISO(date) { picked = parsed }
            if let time, !time.isEmpty {
                hasTime = true
                let parts = time.split(separator: ":").compactMap { Int($0) }
                if parts.count >= 2 {
                    pickedTime = Calendar.current.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: .now) ?? .now
                }
            }
        }
    }

    private var currentTime: String? {
        guard hasTime else { return nil }
        let c = Calendar.current.dateComponents([.hour, .minute], from: pickedTime)
        return String(format: "%02d:%02d", c.hour ?? 0, c.minute ?? 0)
    }

    private func preset(_ title: String, _ iso: String) -> some View {
        Button(title) { onPick(iso, currentTime) }
    }
}

/// Menu de contexto de uma demanda (DemandContextMenu.tsx). Age sobre a
/// seleção inteira quando a demanda clicada faz parte dela.
struct DemandContextMenu: View {
    let demand: Demand
    let store: DemandsStore
    var onOpen: (() -> Void)?
    var onDelete: (Set<UUID>) -> Void

    private var targets: Set<UUID> {
        store.selection.contains(demand.id) && store.selection.count > 1 ? store.selection : [demand.id]
    }

    var body: some View {
        if let onOpen, targets.count == 1 {
            Button("Abrir", systemImage: "arrow.up.forward.square", action: onOpen)
        }
        Button(demand.isDone ? "Reabrir" : "Concluir", systemImage: demand.isDone ? "arrow.uturn.backward" : "checkmark.circle") {
            Task {
                if targets.count == 1 { await store.toggleComplete(demand.id) } else { await store.batchComplete(targets, done: !demand.isDone) }
            }
        }
        Divider()
        Menu("Reagendar", systemImage: "calendar") {
            Button("Hoje") { reschedule(ReschedulePreset.hoje.date()) }
            Button("Amanhã") { reschedule(ReschedulePreset.amanha.date()) }
            Button("Daqui a 7 dias") { reschedule(DueDate.toISO(DueDate.addDays(.now, 7))) }
            Button("Próxima segunda") { reschedule(nextMondayISO()) }
            Divider()
            Button("Sem prazo") { Task { await store.batchOrSingle(targets, [.dueDate(nil), .dueTime(nil)]) } }
        }
        Menu("Prioridade", systemImage: "flag") {
            ForEach(DemandPriority.allCases, id: \.self) { priority in
                Button("\(priority.short) · \(priority.label)") { Task { await store.batchOrSingle(targets, [.priority(priority)]) } }
            }
        }
        Menu("Status", systemImage: "circle.dashed") {
            ForEach(store.statuses) { status in
                Button(status.label) { Task { await store.batchOrSingle(targets, [.status(status.id)]) } }
            }
        }
        Menu("Agenda", systemImage: "calendar.badge.plus") {
            ForEach(AgendaSubject.allCases, id: \.self) { subject in
                Button(subject.label) { Task { await store.batchOrSingle(targets, [.agendaSubject(subject)]) } }
            }
            Button("Não aparecer na agenda") { Task { await store.batchOrSingle(targets, [.agendaSubject(nil)]) } }
        }
        Divider()
        if targets.count == 1 {
            Button("Duplicar", systemImage: "plus.square.on.square") { Task { await store.duplicate(demand.id) } }
            Button("Copiar título", systemImage: "doc.on.doc") { copy(demand.title) }
            Button("Copiar ID", systemImage: "number") { copy(demand.id.lower) }
            Button("Copiar link", systemImage: "link") {
                copy(AppConfig.shared.webBaseURL.appending(path: "/admin/demandas").appending(queryItems: [URLQueryItem(name: "d", value: demand.id.lower)]).absoluteString)
            }
            Divider()
        }
        Button(targets.count > 1 ? "Excluir \(targets.count) demandas" : "Excluir", systemImage: "trash", role: .destructive) {
            onDelete(targets)
        }
    }

    private func reschedule(_ date: String) {
        Task { await store.batchOrSingle(targets, [.dueDate(date)]) }
    }

    private func copy(_ text: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
    }
}

extension DemandsStore {
    /// Uma demanda vai pelo update (com agenda e pontos); várias, pelo lote.
    func batchOrSingle(_ ids: Set<UUID>, _ fields: [DemandField]) async {
        if ids.count == 1, let id = ids.first {
            await update(id, fields)
        } else {
            await batchUpdate(ids, fields)
        }
    }
}

/// Toast de vidro no rodapé, some sozinho.
struct ToastOverlay: View {
    @Binding var toast: StoreToast?

    var body: some View {
        VStack {
            Spacer()
            if let toast {
                Label(toast.message, systemImage: icon(toast.kind))
                    .font(.callout)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .glassEffect(.regular.tint(tint(toast.kind).opacity(0.2)), in: .capsule)
                    .padding(.bottom, 20)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .task(id: toast.id) {
                        try? await Task.sleep(for: .seconds(toast.kind == .error ? 5 : 3))
                        withAnimation { self.toast = nil }
                    }
            }
        }
        .animation(.spring(duration: 0.3), value: toast)
        .allowsHitTesting(false)
    }

    private func icon(_ kind: StoreToast.Kind) -> String {
        switch kind {
        case .success: "checkmark.circle.fill"
        case .error: "exclamationmark.triangle.fill"
        case .info: "info.circle.fill"
        }
    }

    private func tint(_ kind: StoreToast.Kind) -> Color {
        switch kind {
        case .success: .green
        case .error: .red
        case .info: .praticOrange
        }
    }
}
