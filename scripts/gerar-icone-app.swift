// Gera o ícone do FalaAi (desenho próprio; referência de ESTILO: ícone do Typeless — fundo claro e
// símbolo preto brilhante com profundidade — sem copiar o desenho dele).
// Símbolo: balão de fala preto brilhante com as barras da onda da pílula dentro (a do meio no azul
// do FalaAi). Uso: swift scripts/gerar-icone-app.swift <pasta-build> <pasta-resources>
// Saídas: <build>/icon.png (1024, empacotamento), <resources>/icone-app.png (512, Dock em dev),
//         <resources>/iconeBandejaTemplate.png e @2x (barra de menus, monocromático).
import AppKit

let args = CommandLine.arguments
let pastaBuild = args.count > 1 ? args[1] : "build"
let pastaRecursos = args.count > 2 ? args[2] : "resources"
let azul = NSColor(srgbRed: 0x1F / 255, green: 0x5D / 255, blue: 0xF2 / 255, alpha: 1)

/// Balão de fala (coordenadas num quadro 1024, origem embaixo à esquerda).
func caminhoBalao(escala k: CGFloat, deslocamento d: CGPoint = .zero) -> NSBezierPath {
    let corpo = NSRect(x: 232 * k + d.x, y: 338 * k + d.y, width: 560 * k, height: 400 * k)
    let p = NSBezierPath(roundedRect: corpo, xRadius: 190 * k, yRadius: 190 * k)
    // Rabicho embaixo à esquerda, com curvas suaves.
    let rabicho = NSBezierPath()
    rabicho.move(to: NSPoint(x: 340 * k + d.x, y: 372 * k + d.y))
    rabicho.curve(to: NSPoint(x: 262 * k + d.x, y: 238 * k + d.y),
                  controlPoint1: NSPoint(x: 320 * k + d.x, y: 310 * k + d.y),
                  controlPoint2: NSPoint(x: 292 * k + d.x, y: 262 * k + d.y))
    rabicho.curve(to: NSPoint(x: 470 * k + d.x, y: 352 * k + d.y),
                  controlPoint1: NSPoint(x: 350 * k + d.x, y: 262 * k + d.y),
                  controlPoint2: NSPoint(x: 420 * k + d.x, y: 300 * k + d.y))
    rabicho.close()
    p.append(rabicho)
    return p
}

/// As 5 barras da onda (simétricas, mais altas no meio), centradas no corpo do balão.
func barras(escala k: CGFloat, deslocamento d: CGPoint = .zero) -> [(NSBezierPath, Bool)] {
    let alturas: [CGFloat] = [96, 176, 248, 176, 96]
    let largura: CGFloat = 46, vao: CGFloat = 34
    let total = CGFloat(alturas.count) * largura + CGFloat(alturas.count - 1) * vao
    let x0 = 512 - total / 2, centroY: CGFloat = 538
    return alturas.enumerated().map { i, h in
        let r = NSRect(x: (x0 + CGFloat(i) * (largura + vao)) * k + d.x, y: (centroY - h / 2) * k + d.y,
                       width: largura * k, height: h * k)
        return (NSBezierPath(roundedRect: r, xRadius: largura / 2 * k, yRadius: largura / 2 * k), i == 2)
    }
}

func desenhar(tamanho: Int, _ corpo: (CGFloat) -> Void) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: tamanho, pixelsHigh: tamanho, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                               bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current?.imageInterpolation = .high
    corpo(CGFloat(tamanho) / 1024)
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

func iconeApp(tamanho: Int) -> Data {
    desenhar(tamanho: tamanho) { k in
        // Fundo: quadrado arredondado claro (grade de ícones do macOS: 824 de 1024, margem 100).
        let fundo = NSBezierPath(roundedRect: NSRect(x: 100 * k, y: 100 * k, width: 824 * k, height: 824 * k),
                                 xRadius: 186 * k, yRadius: 186 * k)
        NSGraphicsContext.saveGraphicsState()
        let sombra = NSShadow()
        sombra.shadowColor = NSColor.black.withAlphaComponent(0.22)
        sombra.shadowOffset = NSSize(width: 0, height: -10 * k)
        sombra.shadowBlurRadius = 24 * k
        sombra.set()
        NSColor.white.setFill()
        fundo.fill()
        NSGraphicsContext.restoreGraphicsState()
        NSGradient(starting: NSColor(white: 1, alpha: 1), ending: NSColor(white: 0.915, alpha: 1))!.draw(in: fundo, angle: -90)
        NSColor.black.withAlphaComponent(0.07).setStroke()
        fundo.lineWidth = 2 * k
        fundo.stroke()

        // Balão preto brilhante, com sombra de profundidade.
        let balao = caminhoBalao(escala: k)
        NSGraphicsContext.saveGraphicsState()
        let sombraBalao = NSShadow()
        sombraBalao.shadowColor = NSColor.black.withAlphaComponent(0.32)
        sombraBalao.shadowOffset = NSSize(width: 0, height: -16 * k)
        sombraBalao.shadowBlurRadius = 30 * k
        sombraBalao.set()
        NSColor.black.setFill()
        balao.fill()
        NSGraphicsContext.restoreGraphicsState()
        NSGradient(colors: [NSColor(white: 0.24, alpha: 1), NSColor(white: 0.09, alpha: 1), NSColor(white: 0.02, alpha: 1)],
                   atLocations: [0, 0.55, 1], colorSpace: .deviceRGB)!.draw(in: balao, angle: -90)
        // Brilho no alto do balão (o "relevo").
        NSGraphicsContext.saveGraphicsState()
        balao.addClip()
        let brilho = NSBezierPath(ovalIn: NSRect(x: 250 * k, y: 600 * k, width: 524 * k, height: 260 * k))
        NSGradient(starting: NSColor.white.withAlphaComponent(0.20), ending: NSColor.white.withAlphaComponent(0))!
            .draw(in: brilho, angle: -90)
        NSGraphicsContext.restoreGraphicsState()

        // Barras da onda: brancas, a do meio azul.
        for (barra, meio) in barras(escala: k) {
            NSGraphicsContext.saveGraphicsState()
            let s = NSShadow()
            s.shadowColor = NSColor.black.withAlphaComponent(0.35)
            s.shadowOffset = NSSize(width: 0, height: -3 * k)
            s.shadowBlurRadius = 6 * k
            s.set()
            (meio ? azul : NSColor.white).setFill()
            barra.fill()
            NSGraphicsContext.restoreGraphicsState()
            if meio {
                NSGradient(starting: NSColor(srgbRed: 0.42, green: 0.6, blue: 1, alpha: 1), ending: azul)!.draw(in: barra, angle: -90)
            } else {
                NSGradient(starting: .white, ending: NSColor(white: 0.86, alpha: 1))!.draw(in: barra, angle: -90)
            }
        }
    }
}

/// Barra de menus: só a silhueta (balão com as barras vazadas), preta — o macOS pinta conforme o tema.
func iconeBandeja(tamanho: Int) -> Data {
    desenhar(tamanho: tamanho) { k in
        // Enquadra o balão (232…792 × 238…738) no quadro inteiro, com pequena margem.
        let escala = k * 1024 / 600
        let d = CGPoint(x: -212 * escala, y: -190 * escala)
        let balao = caminhoBalao(escala: escala, deslocamento: d)
        for (barra, _) in barras(escala: escala, deslocamento: d) { balao.append(barra.reversed) }
        NSColor.black.setFill()
        balao.windingRule = .evenOdd
        balao.fill()
    }
}

func gravar(_ dados: Data, _ caminho: String) {
    try! dados.write(to: URL(fileURLWithPath: caminho))
    print("OK: \(caminho)")
}

gravar(iconeApp(tamanho: 1024), "\(pastaBuild)/icon.png")
gravar(iconeApp(tamanho: 512), "\(pastaRecursos)/icone-app.png")
gravar(iconeBandeja(tamanho: 18), "\(pastaRecursos)/iconeBandejaTemplate.png")
gravar(iconeBandeja(tamanho: 36), "\(pastaRecursos)/iconeBandejaTemplate@2x.png")
