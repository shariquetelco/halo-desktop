import Foundation

func extractPptxText(from path: String) -> String {
    let tmpDir = FileManager.default.temporaryDirectory
        .appendingPathComponent(UUID().uuidString)

    do {
        try FileManager.default.createDirectory(at: tmpDir,
            withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tmpDir) }

        // Unzip the .pptx
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/unzip")
        process.arguments = ["-o", path, "ppt/slides/*.xml", "-d", tmpDir.path]
        try process.run()
        process.waitUntilExit()

        let slidesDir = tmpDir.appendingPathComponent("ppt/slides")
        let files = try FileManager.default.contentsOfDirectory(
            at: slidesDir,
            includingPropertiesForKeys: nil
        ).filter { $0.pathExtension == "xml" }

        var allText = ""

        for file in files.sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) {
            let xmlData = try Data(contentsOf: file)
            let xmlString = String(data: xmlData, encoding: .utf8) ?? ""
            var inTag = false

            for char in xmlString {
                if char == "<" { inTag = true; continue }
                if char == ">" { inTag = false; allText += " "; continue }
                if !inTag { allText += String(char) }
            }
            allText += " "
        }

        let cleaned = allText
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
    let text = extractPptxText(from: path)
    print(text)
}