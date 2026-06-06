import Cocoa

// ─────────────────────────────────────────
// HALO — generate-icon.swift
// Version E: Two-tone folder + white circle + centered emoji
//
// Usage:
//   swift generate-icon.swift <emoji> <hex_color> <output_icns_path>
// ─────────────────────────────────────────

let args = CommandLine.arguments

guard args.count == 4 else {
    print("ERROR: Usage: generate-icon.swift <emoji> <hex_color> <output_path>")
    exit(1)
}

let emoji      = args[1]
let hexColor   = args[2].trimmingCharacters(in: CharacterSet(charactersIn: "#"))
let outputPath = args[3]

// ── Parse hex color ──
func hexToNSColor(_ hex: String) -> NSColor {
    var h = hex
    if h.count == 3 { h = h.map { "\($0)\($0)" }.joined() }
    var rgb: UInt64 = 0
    Scanner(string: h).scanHexInt64(&rgb)
    return NSColor(
        red:   CGFloat((rgb >> 16) & 0xFF) / 255,
        green: CGFloat((rgb >> 8)  & 0xFF) / 255,
        blue:  CGFloat( rgb        & 0xFF) / 255,
        alpha: 1.0
    )
}

// ── Darken a color for the tab ──
func darken(_ color: NSColor, by factor: CGFloat = 0.6) -> NSColor {
    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
    color.getRed(&r, green: &g, blue: &b, alpha: &a)
    return NSColor(red: r*factor, green: g*factor, blue: b*factor, alpha: a)
}

// ── Lighten a color for the body ──
func lighten(_ color: NSColor, by factor: CGFloat = 1.8) -> NSColor {
    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
    color.getRed(&r, green: &g, blue: &b, alpha: &a)
    return NSColor(
        red:   min(r * factor, 1.0),
        green: min(g * factor, 1.0),
        blue:  min(b * factor, 1.0),
        alpha: a
    )
}

let baseColor  = hexToNSColor(hexColor)
let tabColor   = darken(baseColor, by: 0.65)
let bodyColor  = lighten(baseColor, by: 1.7)

// ── Draw one size ──
func drawIcon(size: CGFloat) -> NSImage {
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()

    guard let ctx = NSGraphicsContext.current?.cgContext else {
        image.unlockFocus()
        return image
    }

    let w = size
    let h = size
    let pad: CGFloat     = w * 0.06
    let cornerR: CGFloat = w * 0.08
    let tabW: CGFloat    = w * 0.42
    let tabH: CGFloat    = h * 0.12
    let bodyH: CGFloat   = h * 0.70

    // ── Tab ──
    let tabPath = CGMutablePath()
    tabPath.move(to: CGPoint(x: pad, y: h * 0.72))
    tabPath.addLine(to: CGPoint(x: pad + tabW * 0.75, y: h * 0.72))
    tabPath.addQuadCurve(
        to:      CGPoint(x: pad + tabW, y: h * 0.72 + tabH),
        control: CGPoint(x: pad + tabW, y: h * 0.72))
    tabPath.addLine(to: CGPoint(x: pad, y: h * 0.72 + tabH))
    tabPath.closeSubpath()
    ctx.setFillColor(tabColor.cgColor)
    ctx.addPath(tabPath)
    ctx.fillPath()

    // ── Body ──
    let bodyPath = CGMutablePath()
    bodyPath.addRoundedRect(
        in: CGRect(x: pad, y: pad, width: w - pad*2, height: bodyH),
        cornerWidth: cornerR, cornerHeight: cornerR)
    ctx.setFillColor(bodyColor.cgColor)
    ctx.addPath(bodyPath)
    ctx.fillPath()

    // ── White circle centered in body ──
    let bodyCenterX: CGFloat = w / 2
    let bodyCenterY: CGFloat = pad + bodyH / 2
    let radius: CGFloat      = size * 0.30

    ctx.setFillColor(NSColor(white: 1.0, alpha: 0.80).cgColor)
    ctx.fillEllipse(in: CGRect(
        x: bodyCenterX - radius,
        y: bodyCenterY - radius,
        width:  radius * 2,
        height: radius * 2
    ))

    // ── Emoji centered on circle ──
    let emojiSize: CGFloat   = size * 0.36
    let font = NSFont.systemFont(ofSize: emojiSize)
    let str  = NSAttributedString(string: emoji, attributes: [.font: font])
    let sz   = str.size()
    str.draw(at: NSPoint(
        x: bodyCenterX - sz.width  / 2,
        y: bodyCenterY - sz.height / 2
    ))

    image.unlockFocus()
    return image
}

// ── Save PNG ──
func savePNG(_ image: NSImage, path: String) {
    guard let tiff   = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiff),
          let png    = bitmap.representation(using: .png, properties: [:])
    else { return }
    try? png.write(to: URL(fileURLWithPath: path))
}

// ── Create iconset ──
let iconsetPath = outputPath.replacingOccurrences(of: ".icns", with: ".iconset")
let fm = FileManager.default

do {
    try fm.createDirectory(atPath: iconsetPath, withIntermediateDirectories: true)
} catch {
    print("ERROR: Could not create iconset: \(error)")
    exit(1)
}

// ── Generate all sizes ──
let sizes: [(Int, String)] = [
    (16,   "icon_16x16"),
    (32,   "icon_16x16@2x"),
    (32,   "icon_32x32"),
    (64,   "icon_32x32@2x"),
    (128,  "icon_128x128"),
    (256,  "icon_128x128@2x"),
    (256,  "icon_256x256"),
    (512,  "icon_256x256@2x"),
    (512,  "icon_512x512"),
    (1024, "icon_512x512@2x"),
]

for (px, name) in sizes {
    let img  = drawIcon(size: CGFloat(px))
    let path = "\(iconsetPath)/\(name).png"
    savePNG(img, path: path)
}

// ── Run iconutil ──
let iconutil = Process()
iconutil.executableURL = URL(fileURLWithPath: "/usr/bin/iconutil")
iconutil.arguments     = ["-c", "icns", iconsetPath, "-o", outputPath]

do {
    try iconutil.run()
    iconutil.waitUntilExit()
} catch {
    print("ERROR: iconutil failed: \(error)")
    exit(1)
}

if iconutil.terminationStatus == 0 {
    try? fm.removeItem(atPath: iconsetPath)
    print("SUCCESS: \(outputPath)")
} else {
    print("ERROR: iconutil exit \(iconutil.terminationStatus)")
    exit(1)
}