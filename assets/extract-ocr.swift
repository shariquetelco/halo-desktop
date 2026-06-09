#!/usr/bin/env swift

import Vision
import Foundation
import AppKit

guard CommandLine.arguments.count > 1 else {
    fputs("Usage: extract-ocr.swift <file-path>\n", stderr)
    exit(1)
}

let filePath = CommandLine.arguments[1]
let fileURL  = URL(fileURLWithPath: filePath)
let ext      = fileURL.pathExtension.lowercased()

// ── PDF: extract page by page, return text if found ──
if ext == "pdf" {
    guard let pdf = CGPDFDocument(fileURL as CFURL) else {
        exit(1)
    }

    var allText = ""
    let pageCount = pdf.numberOfPages

    for i in 1...max(1, pageCount) {
        guard let page = pdf.page(at: i) else { continue }

        // Render PDF page to image
        let rect    = page.getBoxRect(.mediaBox)
        let scale: CGFloat = 2.0
        let width   = Int(rect.width  * scale)
        let height  = Int(rect.height * scale)

        guard width > 0, height > 0 else { continue }

        let colorSpace = CGColorSpaceCreateDeviceRGB()
        guard let context = CGContext(
            data: nil,
            width: width, height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else { continue }

        context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
        context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        context.scaleBy(x: scale, y: scale)
        context.drawPDFPage(page)

        guard let cgImage = context.makeImage() else { continue }

        let semaphore = DispatchSemaphore(value: 0)
        let request   = VNRecognizeTextRequest { req, _ in
            let obs = req.results as? [VNRecognizedTextObservation] ?? []
            let pageText = obs.compactMap { $0.topCandidates(1).first?.string }.joined(separator: " ")
            allText += pageText + " "
            semaphore.signal()
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
        semaphore.wait()

        // Stop after first 5 pages for performance
        if i >= 5 { break }
    }

    let result = allText.trimmingCharacters(in: .whitespacesAndNewlines)
    if result.isEmpty { exit(1) }
    print(result)
    exit(0)
}

// ── Images: PNG, JPG, JPEG, HEIC, TIFF ──
guard let nsImage = NSImage(contentsOf: fileURL),
      let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
    exit(1)
}

let semaphore = DispatchSemaphore(value: 0)
var extracted = ""

let request = VNRecognizeTextRequest { req, _ in
    let obs = req.results as? [VNRecognizedTextObservation] ?? []
    extracted = obs.compactMap { $0.topCandidates(1).first?.string }.joined(separator: " ")
    semaphore.signal()
}
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try? handler.perform([request])
semaphore.wait()

let result = extracted.trimmingCharacters(in: .whitespacesAndNewlines)
if result.isEmpty { exit(1) }
print(result)
exit(0)