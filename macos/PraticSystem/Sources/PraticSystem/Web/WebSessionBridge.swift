import Foundation
import WebKit

/// Leva a sessão própria do WebView (criada no login nativo) para o
/// localStorage do site, onde o supabase-js procura. Só grava quando o site
/// ainda não tem sessão: depois disso o próprio supabase-js cuida do refresh.
@MainActor
enum WebSessionBridge {
    static func makePage(sessionJSON: String?) -> WebPage {
        var configuration = WebPage.Configuration()
        configuration.websiteDataStore = .default()

        if let sessionJSON {
            let script = """
            (function () {
              try {
                var key = \(jsString(AppConfig.shared.webStorageKey));
                if (!window.localStorage.getItem(key)) {
                  window.localStorage.setItem(key, \(jsString(sessionJSON)));
                }
              } catch (e) {}
            })();
            """
            configuration.userContentController.addUserScript(
                WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            )
        }

        let page = WebPage(configuration: configuration)
        return page
    }

    /// No logout do app, o site também sai: limpa cookies e localStorage.
    static func clearWebData() async {
        let store = WKWebsiteDataStore.default()
        await store.removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), modifiedSince: .distantPast)
    }

    private static func jsString(_ value: String) -> String {
        let data = (try? JSONEncoder().encode(value)) ?? Data("\"\"".utf8)
        return String(decoding: data, as: UTF8.self)
    }
}
