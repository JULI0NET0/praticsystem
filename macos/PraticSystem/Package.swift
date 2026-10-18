// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "PraticSystem",
    platforms: [
        .macOS(.v26),
    ],
    dependencies: [
        .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0"),
    ],
    targets: [
        .executableTarget(
            name: "PraticSystem",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
            ],
            path: "Sources/PraticSystem",
            exclude: [
                // Copiados direto para Contents/Resources pelo Scripts/package_app.sh
                "Resources",
                // Rascunho da sessão de Prospecção, interrompida no meio; volta
                // para o build quando essa etapa for retomada.
                "Prospeccao",
            ]
        ),
        .testTarget(
            name: "PraticSystemTests",
            dependencies: ["PraticSystem"],
            path: "Tests/PraticSystemTests"
        ),
    ]
)
