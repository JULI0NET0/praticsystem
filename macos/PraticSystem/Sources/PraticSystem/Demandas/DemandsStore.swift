import Foundation
import Observation
import Supabase

@MainActor
@Observable
final class DemandsStore {
    private(set) var demands: [Demand] = []
    private(set) var statuses: [DemandStatus] = []
    private(set) var clients: [UUID: DemandClient] = [:]
    private(set) var isLoading = false
    var errorMessage: String?

    private var channel: RealtimeChannelV2?

    func demands(in status: DemandStatus, matching search: String) -> [Demand] {
        demands
            .filter { $0.status == status.id }
            .filter { search.isEmpty || $0.title.localizedStandardContains(search) || clientName(for: $0)?.localizedStandardContains(search) == true }
            .sorted(by: demandPrecedes)
    }

    func clientName(for demand: Demand) -> String? {
        demand.clientID.flatMap { clients[$0]?.displayName }
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let demandsRequest: [Demand] = supabase
                .from("demands")
                .select("id, title, client_id, scope, status, status_category, priority, assignee_ids, due_date, due_time, completed_at, created_at")
                .order("created_at", ascending: false)
                .execute()
                .value
            async let statusesRequest: [DemandStatus] = supabase
                .from("demand_statuses")
                .select("*")
                .order("position", ascending: true)
                .execute()
                .value
            async let clientsRequest: [DemandClient] = supabase
                .from("clients")
                .select("id, name, nome_fantasia")
                .order("name")
                .execute()
                .value

            let (loadedDemands, loadedStatuses) = try await (demandsRequest, statusesRequest)
            demands = loadedDemands
            statuses = loadedStatuses
            // Clientes são acessórios, como na web: se falhar, o quadro segue.
            if let loadedClients = try? await clientsRequest {
                clients = Dictionary(uniqueKeysWithValues: loadedClients.map { ($0.id, $0) })
            }
            errorMessage = nil
        } catch {
            errorMessage = "Não foi possível carregar as demandas: \(error.localizedDescription)"
        }
    }

    /// Mesmo fluxo da web: otimista, manda só `{ status }` (a trigger deriva o
    /// resto) e volta atrás se o banco recusar.
    func move(_ demand: Demand, to status: DemandStatus) async {
        guard demand.status != status.id,
              let index = demands.firstIndex(where: { $0.id == demand.id }) else { return }
        let previous = demands[index]
        demands[index] = applyingStatus(status.id, to: previous, statuses: statuses)

        do {
            let saved: Demand = try await supabase
                .from("demands")
                .update(["status": status.id])
                .eq("id", value: demand.id)
                .select("id, title, client_id, scope, status, status_category, priority, assignee_ids, due_date, due_time, completed_at, created_at")
                .single()
                .execute()
                .value
            replace(saved)
        } catch {
            replace(previous)
            errorMessage = "Erro ao salvar: \(error.localizedDescription)"
        }
    }

    /// Escuta mudanças feitas na web (ou por outra pessoa) e aplica no quadro.
    func startLiveUpdates() async {
        guard channel == nil else { return }
        let channel = supabase.channel("mac-demands")
        self.channel = channel
        let changes = channel.postgresChange(AnyAction.self, schema: "public", table: "demands")
        do {
            try await channel.subscribeWithError()
        } catch {
            return
        }
        let decoder = JSONDecoder()
        for await change in changes {
            switch change {
            case .insert(let action):
                if let demand = try? action.decodeRecord(as: Demand.self, decoder: decoder) { replace(demand) }
            case .update(let action):
                if let demand = try? action.decodeRecord(as: Demand.self, decoder: decoder) { replace(demand) }
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
            demands.insert(demand, at: 0)
        }
    }
}
