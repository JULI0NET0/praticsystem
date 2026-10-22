import Foundation
import Observation
import Supabase

struct ContentPlanRef: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let title: String
    let clientID: UUID?
    let monthRef: String?

    enum CodingKeys: String, CodingKey {
        case id, title
        case clientID = "client_id"
        case monthRef = "month_ref"
    }
}

struct StoreToast: Identifiable, Equatable {
    enum Kind { case success, error, info }
    let id = UUID()
    let message: String
    let kind: Kind
}

/// Estado e operações da área de Demandas — o equivalente nativo do
/// DemandasProvider.tsx. Mutações são otimistas com rollback, como na web.
@MainActor
@Observable
final class DemandsStore {
    private(set) var demands: [Demand] = []
    private(set) var statuses: [DemandStatus] = []
    private(set) var clientList: [DemandClient] = []
    private(set) var clients: [UUID: DemandClient] = [:]
    private(set) var templates: [DemandTemplate] = []
    private(set) var contentPlans: [ContentPlanRef]?
    private(set) var isLoading = false
    private(set) var hasLoaded = false

    var filters = DemandFilters()
    var selection: Set<UUID> = []
    var toast: StoreToast?

    private(set) var comments: [UUID: [DemandComment]] = [:]
    private(set) var attachments: [UUID: [DemandAttachment]] = [:]
    private(set) var checklists: [UUID: [DemandChecklistItem]] = [:]

    var currentUserID: UUID?
    private var channel: RealtimeChannelV2?

    // MARK: - Leitura

    var visibleDemands: [Demand] {
        let today = filters.todayOnly ? DueDate.toISO(.now) : nil
        let planIDs = contentPlans.map { Set($0.map(\.id)) }
        return demands.filter { demand in
            demandMatchesFilters(demand, filters, DemandFilterContext(
                todayISO: today,
                clientHaystack: clientHaystack(demand),
                registeredPlanIDs: planIDs
            ))
        }
    }

    func clientName(for demand: Demand) -> String? {
        demand.clientID.flatMap { clients[$0]?.displayName }
    }

    func status(_ id: String) -> DemandStatus? { statuses.first { $0.id == id } }

    func demand(_ id: UUID) -> Demand? { demands.first { $0.id == id } }

    func plan(_ id: UUID?) -> ContentPlanRef? { id.flatMap { id in contentPlans?.first { $0.id == id } } }

    private func clientHaystack(_ demand: Demand) -> String {
        guard let client = demand.clientID.flatMap({ clients[$0] }) else { return "" }
        return "\(client.name) \(client.nomeFantasia ?? "")".lowercased()
    }

    /// Ordem geral do provider: position, prioridade, criação.
    private static func providerOrder(_ a: Demand, _ b: Demand) -> Bool {
        if a.position != b.position { return a.position < b.position }
        if a.priority.order != b.priority.order { return a.priority.order < b.priority.order }
        return (a.createdAt ?? "") < (b.createdAt ?? "")
    }

    func load() async {
        isLoading = true
        defer { isLoading = false; hasLoaded = true }
        do {
            async let demandsRequest: [Demand] = supabase.from("demands").select(demandColumns)
                .order("created_at", ascending: false).execute().value
            async let statusesRequest: [DemandStatus] = supabase.from("demand_statuses").select("*")
                .order("position", ascending: true).execute().value
            async let clientsRequest: [DemandClient] = supabase.from("clients").select("id, name, nome_fantasia, status")
                .order("name").execute().value
            async let templatesRequest: [DemandTemplate] = supabase.from("demand_templates").select("*")
                .order("position", ascending: true).execute().value
            struct CountRow: Decodable { let demand_id: UUID; let done: Bool }
            async let checklistRequest: [CountRow] = supabase.from("demand_checklist").select("demand_id, done").execute().value

            var loaded = try await demandsRequest
            statuses = try await statusesRequest
            // Clientes, templates e checklist são acessórios, como na web.
            if let list = try? await clientsRequest {
                clientList = list
                clients = Dictionary(list.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
            }
            if let list = try? await templatesRequest { templates = list }
            if let rows = try? await checklistRequest {
                var counts: [UUID: (Int, Int)] = [:]
                for row in rows {
                    let current = counts[row.demand_id] ?? (0, 0)
                    counts[row.demand_id] = (current.0 + 1, current.1 + (row.done ? 1 : 0))
                }
                for index in loaded.indices {
                    loaded[index].checklistTotal = counts[loaded[index].id]?.0 ?? 0
                    loaded[index].checklistDone = counts[loaded[index].id]?.1 ?? 0
                }
            }
            demands = loaded.sorted(by: Self.providerOrder)
        } catch {
            show("Não foi possível carregar as demandas: \(error.localizedDescription)", .error)
        }
    }

    func loadContentPlans() async {
        guard contentPlans == nil else { return }
        do {
            contentPlans = try await supabase.from("content_plans").select("id, title, client_id, month_ref")
                .order("created_at", ascending: false).execute().value
        } catch {
            contentPlans = []
            show("Erro ao carregar cronogramas: \(error.localizedDescription)", .error)
        }
    }

    // MARK: - Criar, editar, excluir

    struct NewDemandInput {
        var title = ""
        var description: AnyJSON?
        var clientID: UUID?
        var status: String?
        var priority: DemandPriority = .none
        var assigneeIDs: [UUID]?
        var assignAllTeam = false
        var startDate: String?
        var dueDate: String?
        var dueTime: String?
        /// `.some(nil)` = escolheu não vincular à agenda.
        var agendaSubject: AgendaSubject?? = .none
        var notifyAssignees = false
    }

    @discardableResult
    func create(_ input: NewDemandInput) async -> Demand? {
        guard let me = currentUserID else { return nil }
        let assignees = input.assigneeIDs ?? [me]
        let subject: AgendaSubject? = input.agendaSubject ?? .demand
        let payload: [String: AnyJSON] = [
            "title": .string(input.title.trimmingCharacters(in: .whitespaces).isEmpty ? "Nova demanda" : input.title.trimmingCharacters(in: .whitespaces)),
            "description": input.description ?? .null,
            "client_id": input.clientID.map { .string($0.lower) } ?? .null,
            "status": .string(input.status ?? statuses.first?.id ?? "pending"),
            "priority": .string(input.priority.rawValue),
            "assignee_ids": .array((input.assignAllTeam ? [] : assignees).map { .string($0.lower) }),
            "assign_all_team": .bool(input.assignAllTeam),
            "created_by": .string(me.lower),
            "start_date": input.startDate.map(AnyJSON.string) ?? .null,
            "due_date": input.dueDate.map(AnyJSON.string) ?? .null,
            "due_time": input.dueTime.map(AnyJSON.string) ?? .null,
            "position": .double((Date.now.timeIntervalSince1970 * 1000).rounded()),
            "agenda_subject": subject.map { .string($0.rawValue) } ?? .null,
        ]
        do {
            let created: Demand = try await supabase.from("demands").insert(payload).select(demandColumns)
                .single().execute().value
            demands.append(created)
            demands.sort(by: Self.providerOrder)
            await syncAgendaMirror(created)
            if input.notifyAssignees, !assignees.isEmpty, !input.assignAllTeam {
                await sendPush(to: assignees, title: "📋 Nova Demanda Atribuída", body: created.title)
            }
            return created
        } catch {
            show("Erro ao criar demanda: \(error.localizedDescription)", .error)
            return nil
        }
    }

    func update(_ id: UUID, _ fields: [DemandField]) async {
        guard let index = demands.firstIndex(where: { $0.id == id }), !fields.isEmpty else { return }
        let previous = demands[index]
        var optimistic = previous
        for field in fields { field.apply(to: &optimistic) }
        for case let .status(statusID) in fields {
            optimistic = applyingStatus(statusID, to: optimistic, statuses: statuses)
        }
        demands[index] = optimistic
        let completing = !previous.isDone && optimistic.isDone
        if completing { Sounds.taskDone() }

        do {
            let saved: Demand = try await supabase.from("demands").update(fields.json).eq("id", value: id)
                .select(demandColumns).single().execute().value
            let merged = previous.merging(server: saved)
            replace(merged)
            if fields.contains(where: Self.affectsAgenda) { await syncAgendaMirror(merged) }
            if completing {
                let bonus = isOnTime(dueDate: previous.dueDate, completedAt: merged.completedAt) ? Points.onTimeBonus : 0
                let total = Points.demandCompleted + bonus
                show(bonus > 0 ? "+\(total) pts! Demanda concluída no prazo 🎉⏱️" : "+\(total) pts! Demanda concluída 🎉", .success)
            }
        } catch {
            replace(previous)
            show("Erro ao salvar: \(error.localizedDescription)", .error)
        }
    }

    private static func affectsAgenda(_ field: DemandField) -> Bool {
        switch field {
        case .title, .client, .assignees, .dueDate, .dueTime, .agendaSubject: true
        default: false
        }
    }

    func move(_ id: UUID, toStatus statusID: String) async {
        guard demand(id)?.status != statusID else { return }
        await update(id, [.status(statusID)])
    }

    func toggleComplete(_ id: UUID) async {
        guard let demand = demand(id) else { return }
        if demand.isDone {
            guard let open = statuses.first(where: { $0.category == "nao_iniciado" }) ?? statuses.first(where: { $0.category == "ativo" }) else {
                show("Nenhum status aberto configurado.", .error)
                return
            }
            await update(id, [.status(open.id)])
        } else {
            guard let closed = statuses.first(where: { $0.isClosed }) else {
                show("Nenhum status de conclusão configurado.", .error)
                return
            }
            await update(id, [.status(closed.id)])
        }
    }

    func delete(_ id: UUID) async {
        guard let demand = demand(id) else { return }
        // O cascade apaga o espelho, mas não avisa o Google: tira de lá antes.
        if let mirror = demand.agendaEvent, mirror.googleEventID != nil {
            try? await pushGoogleSync(mirror.id, action: "delete")
        }
        let previous = demands
        demands.removeAll { $0.id == id }
        selection.remove(id)
        do {
            try await supabase.from("demands").delete().eq("id", value: id).execute()
            show("Demanda excluída.", .success)
        } catch {
            demands = previous
            show("Erro ao excluir: \(error.localizedDescription)", .error)
        }
    }

    func duplicate(_ id: UUID) async -> Demand? {
        guard let source = demand(id) else { return nil }
        var input = NewDemandInput()
        input.title = source.title
        input.description = source.description
        input.clientID = source.clientID
        input.status = statuses.first?.id
        input.priority = source.priority
        input.assigneeIDs = source.assigneeIDs
        input.assignAllTeam = source.assignAllTeam
        input.dueDate = source.dueDate
        input.dueTime = source.dueTime
        input.agendaSubject = .some(source.agendaSubject)
        return await create(input)
    }

    // MARK: - Lote

    func batchUpdate(_ ids: Set<UUID>, _ fields: [DemandField]) async {
        guard !ids.isEmpty, !fields.isEmpty else { return }
        let previous = demands
        for index in demands.indices where ids.contains(demands[index].id) {
            for field in fields { field.apply(to: &demands[index]) }
            for case let .status(statusID) in fields {
                demands[index] = applyingStatus(statusID, to: demands[index], statuses: statuses)
            }
        }
        do {
            try await supabase.from("demands").update(fields.json).in("id", values: ids.map(\.lower)).execute()
            show("\(ids.count) demanda\(ids.count > 1 ? "s" : "") atualizada\(ids.count > 1 ? "s" : "").", .success)
            await load()
        } catch {
            demands = previous
            show("Erro ao atualizar em lote: \(error.localizedDescription)", .error)
        }
    }

    func batchComplete(_ ids: Set<UUID>, done: Bool) async {
        let target = done
            ? statuses.first(where: \.isClosed)
            : statuses.first(where: { $0.category == "nao_iniciado" }) ?? statuses.first(where: { $0.category == "ativo" })
        guard let target else {
            show("Status de destino não encontrado.", .error)
            return
        }
        if done { Sounds.taskDone() }
        await batchUpdate(ids, [.status(target.id)])
    }

    func batchDelete(_ ids: Set<UUID>) async {
        guard !ids.isEmpty else { return }
        let previous = demands
        demands.removeAll { ids.contains($0.id) }
        selection.subtract(ids)
        do {
            try await supabase.from("demands").delete().in("id", values: ids.map(\.lower)).execute()
            show("\(ids.count) demanda\(ids.count > 1 ? "s" : "") excluída\(ids.count > 1 ? "s" : "").", .success)
        } catch {
            demands = previous
            show("Erro ao excluir demandas: \(error.localizedDescription)", .error)
        }
    }

    // MARK: - Status

    func upsertStatus(_ status: DemandStatus) async {
        do {
            let saved: DemandStatus = try await supabase.from("demand_statuses").upsert(status).select("*")
                .single().execute().value
            if let index = statuses.firstIndex(where: { $0.id == saved.id }) { statuses[index] = saved } else { statuses.append(saved) }
            statuses.sort { $0.position < $1.position }
        } catch {
            show("Erro ao salvar status: \(error.localizedDescription)", .error)
        }
    }

    func newStatus(label: String, color: String, category: String) async {
        var id = slugifyStatus(label)
        if statuses.contains(where: { $0.id == id }) { id += "_\(Int(Date.now.timeIntervalSince1970) % 10000)" }
        await upsertStatus(DemandStatus(id: id, label: label, color: color, category: category, position: (statuses.map(\.position).max() ?? -1) + 1))
    }

    /// Bloqueado se alguma demanda usa o status ou se for o último.
    func deleteStatus(_ id: String) async {
        if statuses.count <= 1 {
            show("É preciso manter pelo menos um status.", .error)
            return
        }
        let inUse = demands.filter { $0.status == id }.count
        if inUse > 0 {
            show("Há \(inUse) demanda\(inUse > 1 ? "s" : "") neste status. Mova-as antes de excluir.", .error)
            return
        }
        do {
            try await supabase.from("demand_statuses").delete().eq("id", value: id).execute()
            statuses.removeAll { $0.id == id }
        } catch {
            show("Erro ao excluir status: \(error.localizedDescription)", .error)
        }
    }

    func reorderStatuses(_ ordered: [DemandStatus]) async {
        let previous = statuses
        statuses = ordered.enumerated().map { index, status in
            var copy = status
            copy.position = index
            return copy
        }
        do {
            try await supabase.from("demand_statuses").upsert(statuses).execute()
        } catch {
            statuses = previous
            show("Erro ao reordenar status: \(error.localizedDescription)", .error)
        }
    }

    // MARK: - Detalhes: comentários, anexos, checklist

    func loadDetails(_ demandID: UUID) async {
        async let commentsRequest: [DemandComment] = supabase.from("demand_comments").select("*")
            .eq("demand_id", value: demandID).order("created_at", ascending: true).execute().value
        async let attachmentsRequest: [DemandAttachment] = supabase.from("demand_attachments").select("*")
            .eq("demand_id", value: demandID).order("created_at", ascending: true).execute().value
        async let checklistRequest: [DemandChecklistItem] = supabase.from("demand_checklist").select("*")
            .eq("demand_id", value: demandID).order("position", ascending: true).execute().value
        if let list = try? await commentsRequest { comments[demandID] = list }
        if let list = try? await attachmentsRequest { attachments[demandID] = list }
        if let list = try? await checklistRequest {
            checklists[demandID] = list
            syncChecklistCounts(demandID)
        }
    }

    private func putAttachment(_ demandID: UUID, fileURL: URL, commentID: UUID?) async throws {
        guard let me = currentUserID else { return }
        let file = try await StorageService.upload(fileURL, to: .demandAttachments, folder: demandID.lower)
        do {
            let row: DemandAttachment = try await supabase.from("demand_attachments").insert([
                "demand_id": AnyJSON.string(demandID.lower),
                "comment_id": commentID.map { .string($0.lower) } ?? .null,
                "user_id": .string(me.lower),
                "name": .string(file.name),
                "file_path": .string(file.path),
                "file_type": .string(file.mimeType),
                "size": .integer(file.size),
            ]).select("*").single().execute().value
            attachments[demandID, default: []].append(row)
            adjustCount(demandID, attachments: commentID == nil ? 1 : 0)
        } catch {
            // Não deixa arquivo órfão se a linha falhar.
            try? await StorageService.remove([file.path], from: .demandAttachments)
            throw error
        }
    }

    func uploadAttachments(_ demandID: UUID, files: [URL]) async {
        for file in files {
            do {
                try await putAttachment(demandID, fileURL: file, commentID: nil)
            } catch {
                show("Erro ao anexar \"\(file.lastPathComponent)\": \(error.localizedDescription)", .error)
            }
        }
    }

    func removeAttachment(_ attachment: DemandAttachment) async {
        do {
            try await supabase.from("demand_attachments").delete().eq("id", value: attachment.id).execute()
            attachments[attachment.demandID]?.removeAll { $0.id == attachment.id }
            if attachment.commentID == nil { adjustCount(attachment.demandID, attachments: -1) }
            try? await StorageService.remove([attachment.filePath], from: .demandAttachments)
        } catch {
            show("Erro ao remover anexo: \(error.localizedDescription)", .error)
        }
    }

    /// Imagem colada na descrição: sobe e devolve a URL pública.
    func uploadDescriptionImage(_ demandID: UUID, file: URL) async throws -> URL {
        try await StorageService.upload(file, to: .demandAttachments, folder: demandID.lower).publicURL
    }

    func addComment(_ demandID: UUID, body: String, files: [URL]) async {
        guard let me = currentUserID else { return }
        let text = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty || !files.isEmpty else { return }
        do {
            let comment: DemandComment = try await supabase.from("demand_comments").insert([
                "demand_id": AnyJSON.string(demandID.lower), "user_id": .string(me.lower), "body": .string(text),
            ]).select("*").single().execute().value
            comments[demandID, default: []].append(comment)
            adjustCount(demandID, comments: 1)
            for file in files {
                do { try await putAttachment(demandID, fileURL: file, commentID: comment.id) } catch {
                    show("Erro ao anexar \"\(file.lastPathComponent)\".", .error)
                }
            }
        } catch {
            show("Erro ao comentar: \(error.localizedDescription)", .error)
        }
    }

    func deleteComment(_ comment: DemandComment) async {
        do {
            try await supabase.from("demand_comments").delete().eq("id", value: comment.id).execute()
            comments[comment.demandID]?.removeAll { $0.id == comment.id }
            adjustCount(comment.demandID, comments: -1)
            // O cascade apagou as linhas dos anexos; limpa os arquivos.
            let orphans = (attachments[comment.demandID] ?? []).filter { $0.commentID == comment.id }
            attachments[comment.demandID]?.removeAll { $0.commentID == comment.id }
            try? await StorageService.remove(orphans.map(\.filePath), from: .demandAttachments)
        } catch {
            show("Erro ao excluir comentário: \(error.localizedDescription)", .error)
        }
    }

    func toggleChecklistItem(_ item: DemandChecklistItem) async {
        let next = !item.done
        setChecklistItem(item.id, in: item.demandID) { $0.done = next }
        if next {
            Sounds.taskDone()
            show("+\(Points.checklistItemCompleted) pts! Etapa concluída ✅", .success)
        }
        do {
            try await supabase.from("demand_checklist").update(["done": next]).eq("id", value: item.id).execute()
        } catch {
            setChecklistItem(item.id, in: item.demandID) { $0.done = item.done }
            show("Erro ao atualizar etapa: \(error.localizedDescription)", .error)
        }
    }

    func addChecklistItem(_ demandID: UUID, group: String, label: String) async {
        let text = label.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        do {
            let item: DemandChecklistItem = try await supabase.from("demand_checklist").insert([
                "demand_id": AnyJSON.string(demandID.lower), "group_name": .string(group), "label": .string(text),
                "position": .integer(checklists[demandID]?.count ?? 0),
            ]).select("*").single().execute().value
            checklists[demandID, default: []].append(item)
            syncChecklistCounts(demandID)
        } catch {
            show("Erro ao adicionar etapa: \(error.localizedDescription)", .error)
        }
    }

    func renameChecklistItem(_ item: DemandChecklistItem, label: String) async {
        let text = label.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty, text != item.label else { return }
        setChecklistItem(item.id, in: item.demandID) { $0.label = text }
        try? await supabase.from("demand_checklist").update(["label": text]).eq("id", value: item.id).execute()
    }

    func removeChecklistItem(_ item: DemandChecklistItem) async {
        checklists[item.demandID]?.removeAll { $0.id == item.id }
        syncChecklistCounts(item.demandID)
        do {
            try await supabase.from("demand_checklist").delete().eq("id", value: item.id).execute()
        } catch {
            show("Erro ao remover etapa: \(error.localizedDescription)", .error)
            await loadDetails(item.demandID)
        }
    }

    /// Acrescenta as etapas do template depois das que já existem.
    func applyTemplate(_ demandID: UUID, template: DemandTemplate) async {
        do {
            let items: [DemandTemplateItem] = try await supabase.from("demand_template_items").select("*")
                .eq("template_id", value: template.id).order("position", ascending: true).execute().value
            guard !items.isEmpty else {
                show("Este template não tem etapas.", .info)
                return
            }
            let offset = checklists[demandID]?.count ?? 0
            let rows: [[String: AnyJSON]] = items.enumerated().map { index, item in
                ["demand_id": .string(demandID.lower), "group_name": .string(item.groupName), "label": .string(item.label), "position": .integer(offset + index)]
            }
            let inserted: [DemandChecklistItem] = try await supabase.from("demand_checklist").insert(rows).select("*").execute().value
            checklists[demandID, default: []].append(contentsOf: inserted)
            syncChecklistCounts(demandID)
            show("\(inserted.count) etapas adicionadas.", .success)
        } catch {
            show("Erro ao aplicar template: \(error.localizedDescription)", .error)
        }
    }

    private func setChecklistItem(_ id: UUID, in demandID: UUID, _ change: (inout DemandChecklistItem) -> Void) {
        guard let index = checklists[demandID]?.firstIndex(where: { $0.id == id }) else { return }
        change(&checklists[demandID]![index])
        syncChecklistCounts(demandID)
    }

    private func syncChecklistCounts(_ demandID: UUID) {
        guard let index = demands.firstIndex(where: { $0.id == demandID }) else { return }
        let items = checklists[demandID] ?? []
        demands[index].checklistTotal = items.count
        demands[index].checklistDone = items.filter(\.done).count
    }

    private func adjustCount(_ demandID: UUID, comments: Int = 0, attachments: Int = 0) {
        guard let index = demands.firstIndex(where: { $0.id == demandID }) else { return }
        demands[index].commentCount = max(0, demands[index].commentCount + comments)
        demands[index].attachmentCount = max(0, demands[index].attachmentCount + attachments)
    }

    // MARK: - Agenda, Google e push (o que a web faz no navegador)

    private struct GoogleSyncBody: Encodable { let eventId: String; let action: String }

    private func pushGoogleSync(_ eventID: UUID, action: String) async throws {
        try await APIClient.fire("/api/agenda/google-sync", body: GoogleSyncBody(eventId: eventID.lower, action: action))
    }

    /// Mantém o evento-espelho em agenda_events alinhado à demanda.
    func syncAgendaMirror(_ demand: Demand) async {
        switch computeAgendaMirror(demand) {
        case .none:
            return
        case .clear:
            if let mirror = demand.agendaEvent, mirror.googleEventID != nil {
                try? await pushGoogleSync(mirror.id, action: "delete")
            }
            do {
                try await supabase.from("agenda_events").delete().eq("demand_id", value: demand.id).execute()
                setAgendaEvent(nil, for: demand.id)
            } catch {
                show("Não foi possível remover o vínculo com a Agenda: \(error.localizedDescription)", .info)
            }
        case .upsert(let payload):
            let row: [String: AnyJSON] = [
                "demand_id": .string(demand.id.lower),
                "title": .string(payload.title),
                "type": .string(payload.type.rawValue),
                "date": .string(payload.date),
                "client_id": payload.clientID.map { .string($0.lower) } ?? .null,
                "assigned_to": payload.assignedTo.map { .string($0.lower) } ?? .null,
                "visibility": .string(payload.visibility),
                "description": .string(payload.description),
                "status": .string("scheduled"),
            ]
            do {
                var mirror: AgendaMirrorRef = try await supabase.from("agenda_events")
                    .upsert(row, onConflict: "demand_id")
                    .select("id, google_event_id, google_account, status").single().execute().value
                if payload.type.syncsWithGoogle {
                    do {
                        try await pushGoogleSync(mirror.id, action: "update")
                        if let refreshed: AgendaMirrorRef = try? await supabase.from("agenda_events")
                            .select("id, google_event_id, google_account, status").eq("id", value: mirror.id)
                            .single().execute().value {
                            mirror = refreshed
                        }
                    } catch {
                        show("Demanda salva na Agenda, mas a sincronização com o Google falhou.", .info)
                    }
                } else if mirror.googleEventID != nil {
                    // O assunto deixou de sincronizar: tira do Google e limpa.
                    try? await pushGoogleSync(mirror.id, action: "delete")
                    try? await supabase.from("agenda_events")
                        .update(["google_event_id": AnyJSON.null, "google_account": .null])
                        .eq("id", value: mirror.id).execute()
                    mirror.googleEventID = nil
                    mirror.googleAccount = nil
                }
                setAgendaEvent(mirror, for: demand.id)
            } catch {
                show("Demanda salva, mas não foi possível atualizar a Agenda: \(error.localizedDescription)", .info)
            }
        }
    }

    private func setAgendaEvent(_ mirror: AgendaMirrorRef?, for id: UUID) {
        guard let index = demands.firstIndex(where: { $0.id == id }) else { return }
        demands[index].agendaEvent = mirror
    }

    private struct PushBody: Encodable {
        let userIds: [String]
        let title: String
        let body: String
        let url: String
        let type: String
    }

    func sendPush(to users: [UUID], title: String, body: String) async {
        try? await APIClient.fire("/api/push/send", body: PushBody(
            userIds: users.map(\.lower), title: title, body: body, url: "/admin/demandas", type: "demand"
        ))
    }

    // MARK: - Realtime

    func startLiveUpdates() async {
        guard channel == nil else { return }
        let channel = supabase.channel("mac-demands")
        self.channel = channel
        let changes = channel.postgresChange(AnyAction.self, schema: "public", table: "demands")
        do { try await channel.subscribeWithError() } catch { return }
        let decoder = JSONDecoder()
        for await change in changes {
            switch change {
            case .insert(let action):
                if let demand = try? action.decodeRecord(as: Demand.self, decoder: decoder) { replace(demand) }
            case .update(let action):
                if let demand = try? action.decodeRecord(as: Demand.self, decoder: decoder) {
                    replace(self.demand(demand.id).map { $0.merging(server: demand) } ?? demand)
                }
            case .delete(let action):
                if let id = action.oldRecord["id"]?.stringValue.flatMap(UUID.init(uuidString:)) {
                    demands.removeAll { $0.id == id }
                }
            }
        }
    }

    func stopLiveUpdates() async {
        if let channel { await supabase.removeChannel(channel) }
        channel = nil
    }

    private func replace(_ demand: Demand) {
        if let index = demands.firstIndex(where: { $0.id == demand.id }) {
            demands[index] = demand
        } else {
            demands.append(demand)
            demands.sort(by: Self.providerOrder)
        }
    }

    func show(_ message: String, _ kind: StoreToast.Kind) {
        toast = StoreToast(message: message, kind: kind)
    }
}
