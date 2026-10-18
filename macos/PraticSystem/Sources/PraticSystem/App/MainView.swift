import SwiftUI

struct MainView: View {
    @Environment(SessionStore.self) private var session
    @State private var selection: AppModule? = .demandas
    @State private var pages = WebPageCache()

    var body: some View {
        NavigationSplitView {
            List(selection: $selection) {
                ForEach(AppModule.Section.allCases, id: \.self) { section in
                    Section(section.rawValue) {
                        ForEach(AppModule.allCases.filter { $0.section == section }) { module in
                            Label(module.title, systemImage: module.symbol)
                                .tag(module)
                        }
                    }
                }
            }
            .navigationSplitViewColumnWidth(min: 200, ideal: 220)
            .safeAreaInset(edge: .bottom) {
                if let profile = session.profile {
                    ProfileBadge(profile: profile)
                        .padding(12)
                }
            }
        } detail: {
            switch selection {
            case .demandas:
                DemandBoardView()
            case let module?:
                WebModuleView(
                    page: pages.page(for: module, sessionJSON: session.webSessionJSON),
                    module: module
                )
                .id(module)
            case nil:
                ContentUnavailableView("Escolha um módulo", systemImage: "sidebar.left")
            }
        }
        .onChange(of: session.phase) { _, phase in
            if phase != .signedIn { pages.reset() }
        }
    }
}

private struct ProfileBadge: View {
    let profile: StaffProfile
    @Environment(SessionStore.self) private var session

    var body: some View {
        HStack(spacing: 10) {
            Text(String(profile.name.prefix(1)).uppercased())
                .font(.headline)
                .frame(width: 30, height: 30)
                .background(Color.praticOrange, in: .circle)
                .foregroundStyle(.white)
            VStack(alignment: .leading, spacing: 0) {
                Text(profile.name).font(.callout.weight(.medium)).lineLimit(1)
                if let username = profile.username {
                    Text("@\(username)").font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 0)
            Menu {
                Button("Sair da conta", systemImage: "rectangle.portrait.and.arrow.right") {
                    Task { await session.signOut() }
                }
            } label: {
                Image(systemName: "ellipsis")
            }
            .menuStyle(.button)
            .buttonStyle(.plain)
            .fixedSize()
        }
        .padding(10)
        .glassEffect(.regular, in: .rect(cornerRadius: 14))
    }
}
