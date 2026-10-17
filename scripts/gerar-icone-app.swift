// Gera o ícone do app FalaAi: quadrado arredondado azul (#3B5BFD) com um microfone branco.
// Uso: swift scripts/gerar-icone-app.swift [saida.png]   (padrão: build/icon.png, 1024x1024)
// O electron-builder converte esse PNG em .icns (Mac) e .ico (Windows).
import AppKit

let saida = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "build/icon.png"
let lado = 1024
let tamanho = CGFloat(lado)

// Padrão do macOS (Big Sur+): o quadrado ocupa 824 de 1024, com margem transparente em volta.
let miolo: CGFloat = 824
let margem = (tamanho - miolo) / 2
let raio: CGFloat = 185

guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: lado, pixelsHigh: lado, bitsPerSample: 8, samplesPerPixel: 4,
    hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
), let ctx = NSGraphicsContext(bitmapImageRep: rep) else {
    FileHandle.standardError.write(Data("Não foi possível criar a imagem.\n".utf8))
    exit(1)
}
rep.size = NSSize(width: tamanho, height: tamanho)

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = ctx

let quadrado = NSRect(x: margem, y: margem, width: miolo, height: miolo)
let caminho = NSBezierPath(roundedRect: quadrado, xRadius: raio, yRadius: raio)

// Sombra suave sob o quadrado.
let sombra = NSShadow()
sombra.shadowColor = NSColor(white: 0, alpha: 0.28)
sombra.shadowOffset = NSSize(width: 0, height: -10)
sombra.shadowBlurRadius = 22
NSGraphicsContext.saveGraphicsState()
sombra.set()
NSColor(srgbRed: 0x3B / 255, green: 0x5B / 255, blue: 0xFD / 255, alpha: 1).setFill()
caminho.fill()
NSGraphicsContext.restoreGraphicsState()

// Brilho sutil no topo (do mesmo azul, mais claro).
NSGraphicsContext.saveGraphicsState()
caminho.addClip()
let brilho = NSGradient(colors: [NSColor(white: 1, alpha: 0.18), NSColor(white: 1, alpha: 0)])
brilho?.draw(in: quadrado, angle: -90)
NSGraphicsContext.restoreGraphicsState()

// Microfone branco (SF Symbol mic.fill).
let config = NSImage.SymbolConfiguration(pointSize: 420, weight: .semibold)
guard let simbolo = NSImage(systemSymbolName: "mic.fill", accessibilityDescription: nil)?
    .withSymbolConfiguration(config) else {
    FileHandle.standardError.write(Data("SF Symbol mic.fill indisponível.\n".utf8))
    exit(1)
}
// Pinta o símbolo de branco.
let branco = NSImage(size: simbolo.size, flipped: false) { r in
    simbolo.draw(in: r)
    NSColor.white.setFill()
    r.fill(using: .sourceAtop)
    return true
}
let alvo = branco.size
let x = (tamanho - alvo.width) / 2
let y = (tamanho - alvo.height) / 2
branco.draw(in: NSRect(x: x, y: y, width: alvo.width, height: alvo.height))

NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write(Data("Falha ao gerar o PNG.\n".utf8))
    exit(1)
}
do {
    try FileManager.default.createDirectory(
        at: URL(fileURLWithPath: saida).deletingLastPathComponent(), withIntermediateDirectories: true)
    try png.write(to: URL(fileURLWithPath: saida))
    print("OK: \(saida) (\(lado)x\(lado))")
} catch {
    FileHandle.standardError.write(Data("Erro ao gravar \(saida): \(error)\n".utf8))
    exit(1)
}
