import SwiftUI
import WebKit

/// Um módulo da web dentro do app. Cada módulo guarda a própria página para
/// não recarregar quando se troca de item na barra lateral.
struct WebModuleView: View {
    let page: WebPage
    let module: AppModule

    var body: some View {
        WebView(page)
            .webViewBackForwardNavigationGestures(.enabled)
            .overlay(alignment: .top) {
                if page.isLoading {
                    ProgressView(value: page.estimatedProgress)
                        .progressViewStyle(.linear)
                        .tint(.praticOrange)
                }
            }
            .navigationTitle(module.title)
            .toolbar {
                ToolbarItemGroup(placement: .navigation) {
                    Button("Voltar", systemImage: "chevron.backward") {
                        if let item = page.backForwardList.backList.last { _ = page.load(item) }
                    }
                    .disabled(page.backForwardList.backList.isEmpty)
                }
                ToolbarItemGroup(placement: .primaryAction) {
                    Button("Recarregar", systemImage: "arrow.clockwise") {
                        _ = page.reload()
                    }
                    if let url = page.url {
                        ShareLink(item: url)
                    }
                }
            }
    }
}

/// Uma página por módulo, criada sob demanda e mantida enquanto o app vive.
@MainActor
@Observable
final class WebPageCache {
    private var pages: [AppModule: WebPage] = [:]

    func page(for module: AppModule, sessionJSON: String?) -> WebPage {
        if let page = pages[module] { return page }
        let page = WebSessionBridge.makePage(sessionJSON: sessionJSON)
        _ = page.load(URLRequest(url: module.webURL))
        pages[module] = page
        return page
    }

    func reset() { pages.removeAll() }
}
