// Gera o ícone da barra de menus a partir do símbolo "mic.fill" do SF Symbols.
// Uso: swift scripts/gerar-icone-bandeja.swift resources
// Saída: iconeBandejaTemplate.png (16 pt) e iconeBandejaTemplate@2x.png (32 px), pretos com
// transparência — o "Template" no nome faz o macOS pintar conforme o tema.
import AppKit

let pasta = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "."

func gerar(tamanho: CGFloat, arquivo: String) {
    let config = NSImage.SymbolConfiguration(pointSize: tamanho * 0.8, weight: .regular)
    guard let simbolo = NSImage(systemSymbolName: "mic.fill", accessibilityDescription: nil)?
        .withSymbolConfiguration(config) else { fatalError("símbolo não encontrado") }
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(tamanho), pixelsHigh: Int(tamanho),
                               bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let s = simbolo.size
    let destino = NSRect(x: (tamanho - s.width) / 2, y: (tamanho - s.height) / 2, width: s.width, height: s.height)
    simbolo.draw(in: destino)
    NSColor.black.set()
    destino.fill(using: .sourceAtop)
    NSGraphicsContext.restoreGraphicsState()
    let png = rep.representation(using: .png, properties: [:])!
    try! png.write(to: URL(fileURLWithPath: "\(pasta)/\(arquivo)"))
    print("OK: \(pasta)/\(arquivo)")
}

gerar(tamanho: 16, arquivo: "iconeBandejaTemplate.png")
gerar(tamanho: 32, arquivo: "iconeBandejaTemplate@2x.png")
