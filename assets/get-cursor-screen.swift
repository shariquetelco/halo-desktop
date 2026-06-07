import AppKit

let mouseLocation = NSEvent.mouseLocation
let screens = NSScreen.screens

for screen in screens {
    if screen.frame.contains(mouseLocation) {
        let f = screen.frame
        // Convert from AppKit (bottom-left origin) to top-left origin
        let allScreensHeight = screens.reduce(0.0) { max($0, $1.frame.maxY) }
        let topY = allScreensHeight - f.maxY
        print("\(Int(f.origin.x)),\(Int(topY)),\(Int(f.width)),\(Int(f.height))")
        exit(0)
    }
}

// Fallback to main screen
let f = NSScreen.main!.frame
let allScreensHeight = screens.reduce(0.0) { max($0, $1.frame.maxY) }
let topY = allScreensHeight - f.maxY
print("\(Int(f.origin.x)),\(Int(topY)),\(Int(f.width)),\(Int(f.height))")