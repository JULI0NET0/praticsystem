import SwiftUI

struct LoginView: View {
    @Environment(SessionStore.self) private var session
    @State private var login = ""
    @State private var password = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#141413"), Color(hex: "#1B1C1A"), Color.praticOrange.opacity(0.55)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("pratic.")
                        .font(.system(size: 34, weight: .bold))
                        .foregroundStyle(Color.praticOrange)
                    Text("Entre com a mesma conta do sistema web.")
                        .foregroundStyle(.secondary)
                }

                VStack(spacing: 10) {
                    TextField("E-mail ou @usuário", text: $login)
                        .textContentType(.username)
                    SecureField("Senha", text: $password)
                        .textContentType(.password)
                        .onSubmit(submit)
                }
                .textFieldStyle(.roundedBorder)
                .controlSize(.large)

                if let errorMessage {
                    Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                        .font(.callout)
                        .foregroundStyle(.red)
                }

                Button(action: submit) {
                    HStack {
                        if isSubmitting { ProgressView().controlSize(.small) }
                        Text("Entrar")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.glassProminent)
                .controlSize(.large)
                .keyboardShortcut(.defaultAction)
                .disabled(isSubmitting || login.isEmpty || password.isEmpty)
            }
            .padding(32)
            .frame(width: 380)
            .glassEffect(.regular, in: .rect(cornerRadius: 28))
            .environment(\.colorScheme, .dark)
        }
    }

    private func submit() {
        guard !isSubmitting, !login.isEmpty, !password.isEmpty else { return }
        isSubmitting = true
        errorMessage = nil
        Task {
            defer { isSubmitting = false }
            do {
                try await session.signIn(login: login, password: password)
            } catch let error as LoginError {
                errorMessage = error.errorDescription
            } catch {
                errorMessage = "Senha incorreta ou credenciais inválidas."
            }
        }
    }
}
