import Foundation
import PDFKit

// ─────────────────────────────────────────
// HALO — extract-pdf.swift
// Extracts text from PDF using PDFKit.
// Built into macOS — no dependencies.
//
// Usage:
//   swift extract-pdf.swift <pdf_path>
//
// Output:
//   Extracted text to stdout
// ─────────────────────────────────────────

let args = CommandLine.arguments

guard args.count == 2 else {
    fputs("ERROR: Usage: extract-pdf.swift <pdf_path>\n", stderr)
    exit(1)
}

let pdfPath = args[1]
let url     = URL(fileURLWithPath: pdfPath)

guard let pdf = PDFDocument(url: url) else {
    fputs("ERROR: Could not open PDF: \(pdfPath)\n", stderr)
    exit(1)
}

var text = ""

for i in 0..<pdf.pageCount {
    guard let page = pdf.page(at: i) else { continue }
    if let pageText = page.string {
        text += pageText + "\n"
    }
}

let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)

if trimmed.isEmpty {
    fputs("ERROR: No text extracted\n", stderr)
    exit(1)
}

print(trimmed)
exit(0)