import Foundation
import Supabase
import UniformTypeIdentifiers

/// Buckets públicos usados pela web. A URL pública é o que a web guarda e abre.
enum StorageBucket: String {
    case demandAttachments = "demand-attachments"
    case clientDocuments = "client-documents"
    case contracts = "contracts"
    case notesAttachments = "notes-attachments"
}

struct UploadedFile: Sendable {
    let path: String
    let publicURL: URL
    let name: String
    let mimeType: String
    let size: Int
}

enum StorageService {
    /// Sobe `fileURL` em `<folder>/<uuid>.<ext>`, igual à web.
    static func upload(_ fileURL: URL, to bucket: StorageBucket, folder: String) async throws -> UploadedFile {
        let accessing = fileURL.startAccessingSecurityScopedResource()
        defer { if accessing { fileURL.stopAccessingSecurityScopedResource() } }

        let data = try Data(contentsOf: fileURL)
        let ext = fileURL.pathExtension.lowercased()
        let mime = UTType(filenameExtension: ext)?.preferredMIMEType ?? "application/octet-stream"
        let path = "\(folder)/\(UUID().uuidString.lowercased())\(ext.isEmpty ? "" : ".\(ext)")"
        return try await upload(data, path: path, bucket: bucket, name: fileURL.lastPathComponent, mimeType: mime)
    }

    static func upload(_ data: Data, path: String, bucket: StorageBucket, name: String, mimeType: String, upsert: Bool = false) async throws -> UploadedFile {
        try await supabase.storage
            .from(bucket.rawValue)
            .upload(path, data: data, options: FileOptions(contentType: mimeType, upsert: upsert))
        return UploadedFile(
            path: path,
            publicURL: try publicURL(path, in: bucket),
            name: name,
            mimeType: mimeType,
            size: data.count
        )
    }

    static func remove(_ paths: [String], from bucket: StorageBucket) async throws {
        guard !paths.isEmpty else { return }
        _ = try await supabase.storage.from(bucket.rawValue).remove(paths: paths)
    }

    static func publicURL(_ path: String, in bucket: StorageBucket) throws -> URL {
        try supabase.storage.from(bucket.rawValue).getPublicURL(path: path)
    }
}
