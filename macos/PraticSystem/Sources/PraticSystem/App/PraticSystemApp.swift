import SwiftUI

@main
struct PraticSystemApp: App {
    @State private var session = SessionStore()

    var body: some Scene {
        WindowGroup("Pratic System") {
            RootView()
                .environment(session)
                .task { await session.start() }
                .frame(minWidth: 960, minHeight: 620)
                .tint(.praticOrange)
        }
        .windowToolbarStyle(.unified)
        .commands {
            CommandGroup(after: .appSettings) {
                Button("Sair da conta") {
                    Task { await session.signOut() }
                }
                .disabled(session.phase != .signedIn)
            }
        }
    }
}

struct RootView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        switch session.phase {
        case .loading:
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        case .signedOut:
            LoginView()
        case .signedIn:
            MainView()
        }
    }
}
