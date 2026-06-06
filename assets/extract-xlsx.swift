import Foundation

func extractXlsxText(from path: String) -> String {
    let tmpDir = FileManager.default.temporaryDirectory
        .appendingPathComponent(UUID().uuidString)

    do {
        try FileManager.default.createDirectory(at: tmpDir,
            withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tmpDir) }

        // Unzip shared strings
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/unzip")
        process.arguments = ["-o", path, "xl/sharedStrings.xml", "-d", tmpDir.path]
        try process.run()
        process.waitUntilExit()

        let xmlURL = tmpDir.appendingPathComponent("xl/sharedStrings.xml")

        guard FileManager.default.fileExists(atPath: xmlURL.path) else {
            return "" // No strings file = numbers-only spreadsheet
        }

        let xmlData = try Data(contentsOf: xmlURL)
        let xmlString = String(data: xmlData, encoding: .utf8) ?? ""

        var result = ""
        var inTag = false

        for char in xmlString {
            if char == "<" { inTag = true; continue }
            if char == ">" { inTag = false; result += " "; continue }
            if !inTag { result += String(char) }
        }

        let cleaned = result
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")

        return cleaned

    } catch {
        return ""
    }
}

if CommandLine.arguments.count > 1 {
    let path = CommandLine.arguments[1]
    let text = extractXlsxText(from: path)
    print(text)
}