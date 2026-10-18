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
            // Copiados direto para Contents/Resources pelo Scripts/package_app.sh
            exclude: ["Resources"]
        ),
        .testTarget(
            name: "PraticSystemTests",
            dependencies: ["PraticSystem"],
            path: "Tests/PraticSystemTests"
        ),
    ]
)
