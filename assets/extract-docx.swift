import Foundation

func extractDocxText(from path: String) -> String {
    let tmpDir = FileManager.default.temporaryDirectory
        .appendingPathComponent(UUID().uuidString)

    do {
        try FileManager.default.createDirectory(at: tmpDir,
            withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tmpDir) }

        // Unzip the .docx
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/unzip")
        process.arguments = ["-o", path, "word/document.xml", "-d", tmpDir.path]
        try process.run()
        process.waitUntilExit()

        let xmlURL = tmpDir.appendingPathComponent("word/document.xml")
        let xmlData = try Data(contentsOf: xmlURL)

        // Strip XML tags, keep text
        let xmlString = String(data: xmlData, encoding: .utf8) ?? ""
        var result = ""
        var inTag = false

        for char in xmlString {
            if char == "<" { inTag = true; continue }
            if char == ">" { inTag = false; result += " "; continue }
            if !inTag { result += String(char) }
        }

        // Clean up whitespace
        let cleaned = result
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")

        return cleaned

    } catch {
        return ""
    }
}

// Entry point — called with file path as argument
if CommandLine.arguments.count > 1 {
    let path = CommandLine.arguments[1]
    let text = extractDocxText(from: path)
    print(text)
}