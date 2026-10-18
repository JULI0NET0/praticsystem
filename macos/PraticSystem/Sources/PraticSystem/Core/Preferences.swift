import AppKit
import SwiftUI

/// Mesmos nomes das chaves de localStorage da web, para ficar fácil de
/// comparar comportamento entre as duas.
enum PrefKey {
    static let demandsView = "pratic-demandas-view"
    static let demandsGroupBy = "pratic-demandas-groupby"
    static let demandsKanbanGroupBy = "pratic-demandas-kanban-groupby"
    static let demandsSound = "pratic-demandas-som"
    static let demandsShowClientTitle = "pratic-demandas-show-client-title"
    static let demandsAppendClientTitle = "pratic-demandas-append-client-title"
}

enum Sounds {
    /// Equivalente ao playSound("task_done") da web.
    @MainActor static func taskDone() {
        guard UserDefaults.standard.object(forKey: PrefKey.demandsSound) as? Bool ?? true else { return }
        NSSound(named: "Glass")?.play()
    }
}
