// Gera os ícones do FalaAi a partir da marca do Daniel (arquivos em build/marca/).
// Uso: swift scripts/gerar-icone-app.swift <pasta-build> <pasta-resources>
// Entradas: build/marca/icone.png (ícone do macOS com o F, com sombra) e build/marca/logo.png (F + FalaAi).
// Saídas: <build>/icon.png (1024, empacotamento Mac e Windows), <resources>/icone-app.png (512, Dock em
//         dev e janela), <resources>/iconeBandejaTemplate.png e @2x (barra de menus: só o F, preto).
import AppKit

let args = CommandLine.arguments
let pastaBuild = args.count > 1 ? args[1] : "build"
let pastaRecursos = args.count > 2 ? args[2] : "resources"

func abrir(_ caminho: String) -> NSBitmapImageRep {
    NSBitmapImageRep(data: try! Data(contentsOf: URL(fileURLWithPath: caminho)))!
}

/// Caixa dos pixels com alfa ≥ limite, em coordenadas de pixel (origem em cima à esquerda).
func caixaOpaca(_ rep: NSBitmapImageRep, limite: CGFloat, ateX: Int? = nil) -> NSRect {
    let w = min(rep.pixelsWide, ateX ?? rep.pixelsWide), h = rep.pixelsHigh
    var x0 = w, y0 = h, x1 = 0, y1 = 0
    for y in 0..<h { for x in 0..<w where rep.colorAt(x: x, y: y)!.alphaComponent >= limite {
        x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y)
    }}
    return NSRect(x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1)
}

func desenhar(tamanho: Int, _ corpo: (CGFloat) -> Void) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: tamanho, pixelsHigh: tamanho, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                               bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current?.imageInterpolation = .high
    corpo(CGFloat(tamanho))
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

/// Ícone do app: o quadrado branco do arquivo do Daniel reenquadrado na grade do macOS
/// (824 de 1024, centrado), para ficar do mesmo tamanho dos outros ícones do Dock. A sombra vem junto.
func iconeApp(_ fonte: NSBitmapImageRep, tamanho: Int) -> Data {
    let quadrado = caixaOpaca(fonte, limite: 0.98)
    let w = CGFloat(fonte.pixelsWide), h = CGFloat(fonte.pixelsHigh)
    return desenhar(tamanho: tamanho) { t in
        let escala = t * 824 / 1024 / quadrado.width
        // Centro do quadrado, convertido para origem embaixo (AppKit).
        let cx = quadrado.midX, cy = h - quadrado.midY
        let destino = NSRect(x: t / 2 - cx * escala, y: t / 2 - cy * escala, width: w * escala, height: h * escala)
        fonte.draw(in: destino, from: .zero, operation: .sourceOver, fraction: 1, respectFlipped: false, hints: nil)
    }
}

/// Barra de menus: só o F (recortado do logo), preto sobre transparente — o macOS pinta conforme o tema.
func iconeBandeja(_ logo: NSBitmapImageRep, tamanho: Int) -> Data {
    // O F fica no primeiro terço do logo; o texto "FalaAi" começa depois.
    let f = caixaOpaca(logo, limite: 0.5, ateX: logo.pixelsWide / 3)
    let h = CGFloat(logo.pixelsHigh)
    let origem = NSRect(x: f.minX, y: h - f.maxY, width: f.width, height: f.height)
    return desenhar(tamanho: tamanho) { t in
        let margem = t / 18
        let lado = t - 2 * margem
        let escala = lado / max(f.width, f.height)
        let destino = NSRect(x: (t - f.width * escala) / 2, y: (t - f.height * escala) / 2,
                             width: f.width * escala, height: f.height * escala)
        logo.draw(in: destino, from: origem, operation: .sourceOver, fraction: 1, respectFlipped: false, hints: nil)
        NSColor.black.setFill()
        NSRect(x: 0, y: 0, width: t, height: t).fill(using: .sourceIn)
    }
}

func gravar(_ dados: Data, _ caminho: String) {
    try! dados.write(to: URL(fileURLWithPath: caminho))
    print("OK: \(caminho)")
}

let icone = abrir("\(pastaBuild)/marca/icone.png")
let logo = abrir("\(pastaBuild)/marca/logo.png")
gravar(iconeApp(icone, tamanho: 1024), "\(pastaBuild)/icon.png")
gravar(iconeApp(icone, tamanho: 512), "\(pastaRecursos)/icone-app.png")
gravar(iconeBandeja(logo, tamanho: 18), "\(pastaRecursos)/iconeBandejaTemplate.png")
gravar(iconeBandeja(logo, tamanho: 36), "\(pastaRecursos)/iconeBandejaTemplate@2x.png")
