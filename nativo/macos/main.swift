// FalaAi — auxiliar nativo do macOS.
//
// O app Electron inicia este binário como processo filho e conversa por JSON,
// uma mensagem por linha (stdin = comandos, stdout = respostas e eventos).
// Protocolo v4 (v3 + html no colar, copiar_selecao, contexto ampliado, dispositivos_audio,
// teclados e botões do mouse como atalho): veja docs/design/PROTOCOLO_AUXILIAR.md e nativo/macos/README.md.
//
// Regras importantes:
//  - Nada além de JSON pode ir para o stdout. Logs de depuração vão para stderr.
//  - Todo o estado mutável é tocado só na thread principal (main queue).
//  - A leitura do stdin roda numa thread de background e despacha para a main.
//  - O callback do tap de teclado roda na main e NUNCA pode bloquear: só mexe em
//    memória e enfileira a escrita no stdout (fila serial própria).
//  - Consultas de Acessibilidade lentas (contexto, ler_campo) rodam numa fila de
//    background, para não atrasar o teclado do usuário. O conjunto `axTratados` (apps em que
//    já ligamos a acessibilidade) é tocado só nessa fila.
//  - `copiar_selecao` nunca dorme: acompanha a cópia com `asyncAfter` na main.

import Cocoa
import ApplicationServices
import Carbon.HIToolbox
import CoreAudio
import IOKit
import IOKit.hid

// MARK: - Saída (stdout)

/// Fila serial de escrita: garante ordem das linhas e que quem emite (inclusive o
/// callback do teclado) nunca espera o pipe do stdout.
private let filaSaida = DispatchQueue(label: "falaai.saida")

/// Serializa o dicionário em uma linha JSON e grava no stdout (de forma assíncrona).
func emitir(_ dict: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(dict),
          let dados = try? JSONSerialization.data(withJSONObject: dict, options: [.withoutEscapingSlashes])
    else {
        log("emitir: objeto não serializável")
        return
    }
    var linha = dados
    linha.append(0x0A) // "\n"
    filaSaida.async {
        // try? evita exceção se o pipe fechou (o app morreu).
        try? FileHandle.standardOutput.write(contentsOf: linha)
    }
}

/// Espera (no máximo 1 s) a fila de saída esvaziar. Usado antes de encerrar.
func descarregarSaida() {
    let s = DispatchSemaphore(value: 0)
    filaSaida.async { s.signal() }
    _ = s.wait(timeout: .now() + 1)
}

/// Log de depuração: sempre no stderr.
func log(_ msg: String) {
    if let d = ("[auxiliar] " + msg + "\n").data(using: .utf8) {
        try? FileHandle.standardError.write(contentsOf: d)
    }
}

/// Resposta de sucesso a um comando.
func responderOk(_ id: Any, _ extra: [String: Any] = [:]) {
    var r: [String: Any] = ["id": id, "ok": true]
    for (k, v) in extra { r[k] = v }
    emitir(r)
}

/// Resposta de erro a um comando.
func responderErro(_ id: Any, _ erro: String) {
    emitir(["id": id, "ok": false, "erro": erro])
}

// MARK: - Acessibilidade (contexto / ler_campo)

/// Fila de background das consultas de Acessibilidade (não bloqueia a main nem o tap).
let filaAX = DispatchQueue(label: "falaai.ax", qos: .userInitiated)

let prazoContexto: TimeInterval = 0.3    // orçamento total do comando `contexto`
let timeoutAX: Float = 0.25              // por chamada de AX, para app que não responde
let maxAntes = 800
let maxDepois = 300
let maxCampo = 20_000

let navegadores: Set<String> = [
    "com.apple.Safari", "com.apple.SafariTechnologyPreview",
    "com.google.Chrome", "com.google.Chrome.beta", "com.google.Chrome.dev", "com.google.Chrome.canary",
    "org.chromium.Chromium", "com.microsoft.edgemac", "com.microsoft.edgemac.Beta",
    "com.microsoft.edgemac.Dev", "com.microsoft.edgemac.Canary",
    "com.brave.Browser", "com.brave.Browser.beta", "com.brave.Browser.nightly",
    "company.thebrowser.Browser", "company.thebrowser.dia",
    "org.mozilla.firefox", "org.mozilla.firefoxdeveloperedition", "org.mozilla.nightly",
    "com.operasoftware.Opera", "com.operasoftware.OperaGX", "com.vivaldi.Vivaldi",
    "app.zen-browser.zen", "com.kagi.kagimacOS",
    "com.openai.atlas", "ai.perplexity.comet", "com.duckduckgo.macos.browser",
]
let papeisDeTexto: Set<String> = ["AXTextField", "AXTextArea", "AXComboBox", "AXSearchField", "AXWebArea"]

func ou(_ s: String?) -> Any { s ?? NSNull() }

func axAttr(_ el: AXUIElement, _ nome: String) -> CFTypeRef? {
    var v: CFTypeRef?
    return AXUIElementCopyAttributeValue(el, nome as CFString, &v) == .success ? v : nil
}
func axTexto(_ el: AXUIElement, _ nome: String) -> String? {
    axAttr(el, nome) as? String
}
func axElemento(_ el: AXUIElement, _ nome: String) -> AXUIElement? {
    guard let v = axAttr(el, nome), CFGetTypeID(v) == AXUIElementGetTypeID() else { return nil }
    return (v as! AXUIElement)
}
func axIntervalo(_ el: AXUIElement, _ nome: String) -> CFRange? {
    guard let v = axAttr(el, nome), CFGetTypeID(v) == AXValueGetTypeID() else { return nil }
    var r = CFRange()
    return AXValueGetValue(v as! AXValue, .cfRange, &r) ? r : nil
}

/// Recorta [ini, fim) de um NSString (unidades UTF-16) sem partir pares substitutos
/// nem sequências compostas: o recorte encolhe para dentro, nunca passa do pedido.
func recortar(_ ns: NSString, _ ini: Int, _ fim: Int) -> String {
    var i = max(0, min(ini, ns.length))
    var f = max(i, min(fim, ns.length))
    if i > 0 && i < ns.length {
        let r = ns.rangeOfComposedCharacterSequence(at: i)
        if r.location < i { i = r.location + r.length }
    }
    if f > 0 && f < ns.length {
        let r = ns.rangeOfComposedCharacterSequence(at: f)
        if r.location < f { f = r.location }
    }
    if f < i { return "" }
    return ns.substring(with: NSRange(location: i, length: f - i))
}

func ehSenha(_ el: AXUIElement) -> Bool {
    axTexto(el, kAXRoleAttribute) == "AXSecureTextField"
        || axTexto(el, kAXSubroleAttribute) == "AXSecureTextField"
}

/// Elemento em foco. Sem `pid`: systemWide primeiro, cai para o app em foco.
/// Com `pid` (diagnóstico): SÓ o elemento em foco daquele app (o systemWide é do app da frente).
func campoEmFoco(_ axApp: AXUIElement?, soDoApp: Bool = false) -> AXUIElement? {
    if !soDoApp {
        let sistema = AXUIElementCreateSystemWide()
        AXUIElementSetMessagingTimeout(sistema, timeoutAX)
        if let e = axElemento(sistema, kAXFocusedUIElementAttribute) { return e }
    }
    if let a = axApp { return axElemento(a, kAXFocusedUIElementAttribute) }
    return nil
}

/// O valor do elemento pode ser gravado? (campo editável mesmo com papel incomum)
func axGravavel(_ el: AXUIElement, _ nome: String) -> Bool {
    var b: DarwinBoolean = false
    return AXUIElementIsAttributeSettable(el, nome as CFString, &b) == .success && b.boolValue
}

/// Lê vários atributos numa ida só. Atributos com erro vêm como `nil`.
func axVarios(_ el: AXUIElement, _ nomes: [String]) -> [CFTypeRef?] {
    var saida: CFArray?
    let r = AXUIElementCopyMultipleAttributeValues(el, nomes as CFArray, AXCopyMultipleAttributeOptions(rawValue: 0), &saida)
    guard r == .success, let arr = saida as? [CFTypeRef], arr.count == nomes.count else {
        return Array(repeating: nil, count: nomes.count)
    }
    // Um AXValue do tipo "erro" no lugar do atributo = não deu para ler.
    return arr.map { v in
        if CFGetTypeID(v) == AXValueGetTypeID(), AXValueGetType(v as! AXValue) == .axError { return nil }
        return v
    }
}

// MARK: Texto por marcador (campos web: Gmail, Notion, ChatGPT)

/// Intervalo do documento inteiro do elemento (parametrizado AXTextMarkerRangeForUIElement).
func axIntervaloDoDocumento(_ el: AXUIElement) -> AXTextMarkerRange? {
    var saida: CFTypeRef?
    guard AXUIElementCopyParameterizedAttributeValue(el, "AXTextMarkerRangeForUIElement" as CFString, el, &saida) == .success,
          let v = saida, CFGetTypeID(v) == AXTextMarkerRangeGetTypeID() else { return nil }
    return (v as! AXTextMarkerRange)
}

func axTextoDoIntervalo(_ el: AXUIElement, _ r: AXTextMarkerRange) -> String? {
    var saida: CFTypeRef?
    guard AXUIElementCopyParameterizedAttributeValue(el, "AXStringForTextMarkerRange" as CFString, r, &saida) == .success
    else { return nil }
    return saida as? String
}

/// Texto antes/depois do cursor e selecionado, lido por marcadores. nil = não deu (segue como antes).
func textoPorMarcador(_ el: AXUIElement, antes: Int, depois: Int) -> (antes: String, depois: String, selecionado: String)? {
    guard let selV = axAttr(el, "AXSelectedTextMarkerRange"), CFGetTypeID(selV) == AXTextMarkerRangeGetTypeID(),
          let doc = axIntervaloDoDocumento(el) else { return nil }
    let sel = selV as! AXTextMarkerRange
    let iniDoc = AXTextMarkerRangeCopyStartMarker(doc)
    let fimDoc = AXTextMarkerRangeCopyEndMarker(doc)
    let iniSel = AXTextMarkerRangeCopyStartMarker(sel)
    let fimSel = AXTextMarkerRangeCopyEndMarker(sel)
    let rAntes = AXTextMarkerRangeCreate(kCFAllocatorDefault, iniDoc, iniSel)
    let rDepois = AXTextMarkerRangeCreate(kCFAllocatorDefault, fimSel, fimDoc)
    guard let tAntes = axTextoDoIntervalo(el, rAntes), let tDepois = axTextoDoIntervalo(el, rDepois) else { return nil }
    let nsA = tAntes as NSString, nsD = tDepois as NSString
    var selecionado = axTextoDoIntervalo(el, sel) ?? ""
    let nsS = selecionado as NSString
    if nsS.length > maxCampo { selecionado = recortar(nsS, 0, maxCampo) }
    return (recortar(nsA, nsA.length - antes, nsA.length), recortar(nsD, 0, depois), selecionado)
}

// MARK: Ligar a acessibilidade de apps que a deixam desligada

/// pids em que já ligamos a acessibilidade. Somente na `filaAX`.
var axTratados = Set<pid_t>()

let prefixosChromium = [
    "com.google.Chrome", "org.chromium.Chromium", "com.microsoft.edgemac", "com.brave.Browser",
    "company.thebrowser.Browser", "company.thebrowser.dia", "com.vivaldi.Vivaldi", "com.operasoftware.Opera",
    "com.openai.atlas", "ai.perplexity.comet",
]
func ehChromium(_ appId: String?) -> Bool {
    guard let id = appId else { return false }
    return prefixosChromium.contains { id.hasPrefix($0) }
}
func ehElectron(_ app: NSRunningApplication) -> Bool {
    guard let url = app.bundleURL else { return false }
    let caminho = url.appendingPathComponent("Contents/Frameworks/Electron Framework.framework").path
    return FileManager.default.fileExists(atPath: caminho)
}

// MARK: Extras do `contexto` (v4)

let limiteExtras = 20_000

struct ExtrasContexto {
    var antes = maxAntes
    var depois = maxDepois
    var conversa = 0
    var tela = 0
    var ligar = false
    var naoLigarEm = Set<String>()

    init() {}
    /// Lê o objeto `extras` do pedido. Ausente ou inválido = padrão da v3.
    init(_ bruto: Any?) {
        guard let d = bruto as? [String: Any] else { return }
        func numero(_ k: String, _ padrao: Int) -> Int {
            guard let n = d[k] as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID() else { return padrao }
            return max(0, min(n.intValue, limiteExtras))
        }
        antes = numero("antes", maxAntes)
        depois = numero("depois", maxDepois)
        conversa = numero("conversa", 0)
        tela = numero("tela", 0)
        ligar = (d["ligarAcessibilidade"] as? Bool) ?? false
        if let l = d["naoLigarEm"] as? [Any] { naoLigarEm = Set(l.compactMap { $0 as? String }) }
    }
}

// MARK: Percorrer texto (conversa e tela)

/// Orçamento de uma varredura: elementos, profundidade e prazo.
final class Orcamento {
    var visitados = 0
    let maxVisitados: Int
    let maxProfundidade: Int
    let limite: Date
    init(maxVisitados: Int, maxProfundidade: Int, prazo: TimeInterval) {
        self.maxVisitados = maxVisitados
        self.maxProfundidade = maxProfundidade
        self.limite = Date().addingTimeInterval(prazo)
    }
    var esgotado: Bool { visitados >= maxVisitados || Date() >= limite }
}

/// Junta os pedaços de texto: entre `AXStaticText` seguidos um espaço; nos demais, quebra de linha.
struct Acumulador {
    var texto = ""
    var comprimento = 0            // unidades UTF-16
    var ultimoEstatico = false
    let maximo: Int                // 0 = sem limite
    init(maximo: Int = 0) { self.maximo = maximo }
    var cheio: Bool { maximo > 0 && comprimento >= maximo }
    mutating func juntar(_ pedaco: String, estatico: Bool) {
        if texto.isEmpty {
            texto = pedaco
        } else if estatico && ultimoEstatico {
            if let u = texto.unicodeScalars.last, CharacterSet.whitespacesAndNewlines.contains(u) {
                texto += pedaco
            } else {
                texto += " " + pedaco
            }
        } else {
            texto += "\n" + pedaco
        }
        ultimoEstatico = estatico
        comprimento = (texto as NSString).length
    }
}

let papeisLeituraTexto: Set<String> = ["AXStaticText", "AXTextField", "AXTextArea", "AXSearchField", "AXComboBox"]

/// Busca em profundidade juntando o texto dos elementos. Nunca lê senha; pula `pular` (o campo em foco).
func coletarTextos(_ el: AXUIElement, _ prof: Int, _ orc: Orcamento, _ acc: inout Acumulador, pular: AXUIElement?) {
    if orc.esgotado || acc.cheio || prof > orc.maxProfundidade { return }
    orc.visitados += 1
    if let p = pular, CFEqual(el, p) { return }
    AXUIElementSetMessagingTimeout(el, timeoutAX)
    let v = axVarios(el, [kAXRoleAttribute, kAXSubroleAttribute, kAXValueAttribute, kAXTitleAttribute, kAXChildrenAttribute])
    let papel = v[0] as? String
    if papel == "AXSecureTextField" || (v[1] as? String) == "AXSecureTextField" { return }
    if let papel = papel, papeisLeituraTexto.contains(papel) {
        var t = (v[2] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if t.isEmpty { t = (v[3] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "" }
        if !t.isEmpty { acc.juntar(t, estatico: papel == "AXStaticText") }
        if papel != "AXStaticText" { return }   // o valor do campo já é o texto dele
    }
    if let filhos = v[4] as? [AXUIElement] {
        for f in filhos {
            if orc.esgotado || acc.cheio { return }
            coletarTextos(f, prof + 1, orc, &acc, pular: pular)
        }
    }
}

func axPapel(_ el: AXUIElement) -> String? { axTexto(el, kAXRoleAttribute) }
func axFilhos(_ el: AXUIElement) -> [AXUIElement]? { axAttr(el, kAXChildrenAttribute) as? [AXUIElement] }

/// Texto de conversa ao redor de um campo (porte do Typeless, getFocusedElementRelatedContent).
/// nil = o campo não está num recipiente de conversa reconhecível.
func lerConversa(_ campo: AXUIElement, papel: String?, maximo: Int) -> [String: Any]? {
    guard papel == "AXTextArea",
          let pai = axElemento(campo, kAXParentAttribute), axPapel(pai) == "AXScrollArea",
          let irmaos = axFilhos(pai), irmaos.count == 1, CFEqual(irmaos[0], campo) else { return nil }
    var recipiente = pai
    while let p = axElemento(recipiente, kAXParentAttribute),
          let papelP = axPapel(p), papelP == "AXGroup" || papelP == "AXSplitGroup",
          let fs = axFilhos(p), fs.count == 1 {
        recipiente = p
    }
    let orc = Orcamento(maxVisitados: 400, maxProfundidade: 50, prazo: 0.5)

    func textoDe(_ el: AXUIElement) -> String {
        var acc = Acumulador()
        coletarTextos(el, 0, orc, &acc, pular: campo)
        return acc.texto
    }
    // Sobe até 10 níveis, sem passar de AXWindow; `anterior` = irmãos antes do recipiente, senão depois.
    func varrer(anterior: Bool) -> String {
        var rec = recipiente
        var partes: [String] = []
        var total = 0
        for _ in 0..<10 {
            if orc.esgotado || total >= maximo { break }
            if axPapel(rec) == "AXWindow" { break }
            guard let p = axElemento(rec, kAXParentAttribute) else { break }
            AXUIElementSetMessagingTimeout(p, timeoutAX)
            if let fs = axFilhos(p), let idx = fs.firstIndex(where: { CFEqual($0, rec) }) {
                let ordem: [Int] = anterior ? Array((0..<idx).reversed()) : Array((idx + 1)..<fs.count)
                for i in ordem {
                    if orc.esgotado || total >= maximo { break }
                    let t = textoDe(fs[i])
                    if t.isEmpty { continue }
                    if anterior { partes.insert(t, at: 0) } else { partes.append(t) }
                    total += (t as NSString).length
                }
            }
            rec = p
        }
        let junto = partes.joined(separator: "\n") as NSString
        return anterior ? recortar(junto, junto.length - maximo, junto.length) : recortar(junto, 0, maximo)
    }
    let antes = varrer(anterior: true)
    let depois = varrer(anterior: false)
    return ["antes": antes, "depois": depois]
}

/// Procura (em largura, com limites) um AXWebArea na janela e devolve (url, título, elemento).
func acharWebArea(_ janela: AXUIElement, ate limite: Date) -> (url: String?, titulo: String?, elemento: AXUIElement)? {
    var fila: [(AXUIElement, Int)] = [(janela, 0)]
    var i = 0
    var visitados = 0
    while i < fila.count && visitados < 250 && Date() < limite {
        let (el, prof) = fila[i]
        i += 1
        visitados += 1
        AXUIElementSetMessagingTimeout(el, timeoutAX)
        if axTexto(el, kAXRoleAttribute) == "AXWebArea" {
            var url: String? = nil
            if let v = axAttr(el, "AXURL") {
                if CFGetTypeID(v) == CFURLGetTypeID() { url = (v as! CFURL as URL).absoluteString }
                else { url = v as? String }
            }
            if url != nil { return (url, axTexto(el, kAXTitleAttribute), el) }
        }
        if prof < 8, let filhos = axAttr(el, kAXChildrenAttribute) as? [AXUIElement] {
            for f in filhos.prefix(60) { fila.append((f, prof + 1)) }
        }
    }
    return nil
}

/// Texto visível da janela (ou do AXWebArea), até `maximo` caracteres.
func lerTela(_ raiz: AXUIElement, maximo: Int, pular: AXUIElement?) -> String? {
    let orc = Orcamento(maxVisitados: 1500, maxProfundidade: 50, prazo: 0.5)
    var acc = Acumulador(maximo: maximo)
    coletarTextos(raiz, 0, orc, &acc, pular: pular)
    if acc.texto.isEmpty { return nil }
    let ns = acc.texto as NSString
    return ns.length > maximo ? recortar(ns, 0, maximo) : acc.texto
}

let papeisEditaveis: Set<String> = ["AXTextField", "AXTextArea", "AXComboBox", "AXSearchField"]

/// Lê o campo em foco. nil = sem campo de texto em foco (ou não deu para ler).
func lerCampoEmFoco(_ axApp: AXUIElement, soDoApp: Bool, extras: ExtrasContexto) -> (campo: [String: Any], elemento: AXUIElement, papel: String?)? {
    guard let el = campoEmFoco(axApp, soDoApp: soDoApp) else { return nil }
    AXUIElementSetMessagingTimeout(el, timeoutAX)
    let papel = axTexto(el, kAXRoleAttribute)
    let editavelPorPapel = papel.map { papeisEditaveis.contains($0) } ?? false
    if ehSenha(el) {
        let c: [String: Any] = ["papel": ou(papel), "placeholder": NSNull(), "antes": "", "depois": "", "selecionado": "",
                                "editavel": true, "leitura": "nenhuma"]
        return (c, el, papel)
    }
    let valor = axAttr(el, kAXValueAttribute) as? String
    let intervalo = axIntervalo(el, kAXSelectedTextRangeAttribute)
    let ehTexto = (papel.map { papeisDeTexto.contains($0) } ?? false) || (valor != nil && intervalo != nil)
    guard ehTexto else { return nil }
    let editavel = editavelPorPapel || axGravavel(el, kAXValueAttribute)
    var antes = "", depois = "", selecionado = axTexto(el, kAXSelectedTextAttribute) ?? ""
    var leitura = "nenhuma"
    if let v = valor, intervalo != nil {
        leitura = "valor"
        let ns = v as NSString
        let loc = max(0, min(intervalo!.location, ns.length))
        let tam = max(0, min(intervalo!.length, ns.length - loc))
        antes = recortar(ns, loc - extras.antes, loc)
        depois = recortar(ns, loc + tam, loc + tam + extras.depois)
        if selecionado.isEmpty && tam > 0 { selecionado = recortar(ns, loc, loc + min(tam, maxCampo)) }
    } else if let m = textoPorMarcador(el, antes: extras.antes, depois: extras.depois) {
        leitura = "marcador"
        antes = m.antes; depois = m.depois
        if selecionado.isEmpty { selecionado = m.selecionado }
    } else if let v = valor {
        // Sem intervalo e sem marcador: como na v3, o cursor é tratado como estando no fim.
        leitura = "valor"
        let ns = v as NSString
        antes = recortar(ns, ns.length - extras.antes, ns.length)
    }
    let c: [String: Any] = ["papel": ou(papel), "placeholder": ou(axTexto(el, kAXPlaceholderValueAttribute)),
                            "antes": antes, "depois": depois, "selecionado": selecionado,
                            "editavel": editavel, "leitura": leitura]
    return (c, el, papel)
}

func montarContexto(pid: pid_t?, extras: ExtrasContexto) -> [String: Any] {
    let inicio = Date()
    var limite = inicio.addingTimeInterval(prazoContexto)
    let confiavel = AXIsProcessTrusted()
    var navegador: Any = NSNull()
    var campo: Any = NSNull()
    var conversa: Any = NSNull()
    var tela: Any = NSNull()
    var ligou = false

    func resposta(_ app: Any) -> [String: Any] {
        ["app": app, "navegador": navegador, "campo": campo, "conversa": conversa, "tela": tela,
         "acessibilidadeLigada": ligou]
    }

    let alvo: NSRunningApplication? = pid != nil ? NSRunningApplication(processIdentifier: pid!)
                                                : NSWorkspace.shared.frontmostApplication
    guard let front = alvo else { return resposta(NSNull()) }
    let appId = front.bundleIdentifier
    var janelaTitulo: String? = nil
    var appInfo: [String: Any] = ["nome": ou(front.localizedName), "appId": ou(appId), "janela": NSNull()]
    let soDoApp = pid != nil

    if confiavel {
        let axApp = AXUIElementCreateApplication(front.processIdentifier)
        AXUIElementSetMessagingTimeout(axApp, timeoutAX)
        let permitido = extras.ligar && !(appId.map { extras.naoLigarEm.contains($0) } ?? false)
        let jaTratado = axTratados.contains(front.processIdentifier)

        // Apps Electron: liga a acessibilidade antes de ler o campo (uma vez por pid).
        if permitido && !jaTratado && ehElectron(front) {
            axTratados.insert(front.processIdentifier)
            AXUIElementSetAttributeValue(axApp, "AXManualAccessibility" as CFString, kCFBooleanTrue)
            ligou = true
        }

        // Campo em foco.
        var lido: (campo: [String: Any], elemento: AXUIElement, papel: String?)? = nil
        if Date() < limite { lido = lerCampoEmFoco(axApp, soDoApp: soDoApp, extras: extras) }

        // Navegador Chromium: só se o campo não pôde ser lido, liga a interface melhorada.
        if lido == nil && permitido && !jaTratado && !ligou && ehChromium(appId) {
            axTratados.insert(front.processIdentifier)
            AXUIElementSetAttributeValue(axApp, "AXEnhancedUserInterface" as CFString, kCFBooleanTrue)
            ligou = true
        }
        // Ligou agora: o app leva um instante para montar a árvore. Espera e tenta de novo.
        if ligou && lido == nil {
            limite = max(limite, inicio.addingTimeInterval(0.5))
            usleep(100_000)   // estamos na filaAX; nunca na main
            if Date() < limite { lido = lerCampoEmFoco(axApp, soDoApp: soDoApp, extras: extras) }
        }
        if let l = lido { campo = l.campo }

        // Janela em foco e URL do navegador.
        var raizTela: AXUIElement? = nil
        if Date() < limite, let janela = axElemento(axApp, kAXFocusedWindowAttribute) {
            AXUIElementSetMessagingTimeout(janela, timeoutAX)
            raizTela = janela
            if let t = axTexto(janela, kAXTitleAttribute), !t.isEmpty { janelaTitulo = t }
            if let id = appId, navegadores.contains(id), let w = acharWebArea(janela, ate: limite) {
                let t = (w.titulo?.isEmpty == false) ? w.titulo : janelaTitulo
                navegador = ["url": ou(w.url), "titulo": ou(t)] as [String: Any]
                raizTela = w.elemento
            }
        }

        // Conversa ao redor do campo (prazo próprio).
        if extras.conversa > 0, let l = lido, !ehSenha(l.elemento),
           let c = lerConversa(l.elemento, papel: l.papel, maximo: extras.conversa) {
            conversa = c
        }
        // Texto da janela (prazo próprio).
        if extras.tela > 0, let raiz = raizTela {
            if let t = lerTela(raiz, maximo: extras.tela, pular: lido?.elemento) { tela = t }
        }
    }
    appInfo["janela"] = ou(janelaTitulo)
    return resposta(appInfo)
}

func montarLerCampo() -> [String: Any] {
    let appId = NSWorkspace.shared.frontmostApplication?.bundleIdentifier
    var texto: String? = nil
    if AXIsProcessTrusted() {
        var axApp: AXUIElement? = nil
        if let f = NSWorkspace.shared.frontmostApplication {
            axApp = AXUIElementCreateApplication(f.processIdentifier)
            AXUIElementSetMessagingTimeout(axApp!, timeoutAX)
        }
        if let el = campoEmFoco(axApp), !ehSenha(el) {
            AXUIElementSetMessagingTimeout(el, timeoutAX)
            if let v = axAttr(el, kAXValueAttribute) as? String {
                let ns = v as NSString
                texto = ns.length > maxCampo ? recortar(ns, 0, maxCampo) : v
            } else if let doc = axIntervaloDoDocumento(el), let v = axTextoDoIntervalo(el, doc) {
                // Campo web sem AXValue: texto inteiro pelos marcadores.
                let ns = v as NSString
                texto = ns.length > maxCampo ? recortar(ns, 0, maxCampo) : v
            }
        }
    }
    return ["texto": ou(texto), "appId": ou(appId)]
}

// MARK: - Silenciar a saída de som (CoreAudio)

/// Se fomos nós que silenciamos: dispositivo e elementos (canais) alterados. Somente main thread.
var silenciadoPorNos: (dispositivo: AudioDeviceID, elementos: [UInt32])? = nil

func enderecoMute(_ elemento: UInt32) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyMute,
                               mScope: kAudioDevicePropertyScopeOutput,
                               mElement: elemento)
}

func dispositivoSaidaPadrao() -> AudioDeviceID? {
    var dev = AudioDeviceID(0)
    var tam = UInt32(MemoryLayout<AudioDeviceID>.size)
    var end = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDefaultOutputDevice,
                                         mScope: kAudioObjectPropertyScopeGlobal,
                                         mElement: kAudioObjectPropertyElementMain)
    let st = AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &end, 0, nil, &tam, &dev)
    return (st == noErr && dev != kAudioObjectUnknown) ? dev : nil
}

/// Elementos com mute gravável: o principal (0) ou, se não houver, os canais 1 e 2.
func elementosSilenciaveis(_ dev: AudioDeviceID) -> [UInt32] {
    func ok(_ el: UInt32) -> Bool {
        var end = enderecoMute(el)
        guard AudioObjectHasProperty(dev, &end) else { return false }
        var gravavel: DarwinBoolean = false
        return AudioObjectIsPropertySettable(dev, &end, &gravavel) == noErr && gravavel.boolValue
    }
    if ok(0) { return [0] }
    return [1, 2].filter(ok)
}

func lerMute(_ dev: AudioDeviceID, _ el: UInt32) -> Bool? {
    var end = enderecoMute(el)
    var v: UInt32 = 0
    var tam = UInt32(MemoryLayout<UInt32>.size)
    return AudioObjectGetPropertyData(dev, &end, 0, nil, &tam, &v) == noErr ? (v != 0) : nil
}

@discardableResult
func gravarMute(_ dev: AudioDeviceID, _ el: UInt32, _ mudo: Bool) -> Bool {
    var end = enderecoMute(el)
    var v: UInt32 = mudo ? 1 : 0
    return AudioObjectSetPropertyData(dev, &end, 0, nil, UInt32(MemoryLayout<UInt32>.size), &v) == noErr
}

func mutarSaida(id: Any) {
    if silenciadoPorNos != nil {
        // Já silenciamos antes: continua valendo; para o app, o estado original era "não mudo".
        responderOk(id, ["jaEstavaMudo": false])
        return
    }
    guard let dev = dispositivoSaidaPadrao() else {
        responderErro(id, "Não foi possível achar o dispositivo de som padrão.")
        return
    }
    let elementos = elementosSilenciaveis(dev)
    if elementos.isEmpty {
        responderErro(id, "Este dispositivo de som não pode ser silenciado.")
        return
    }
    let jaMudo = elementos.allSatisfy { lerMute(dev, $0) == true }
    if jaMudo {
        responderOk(id, ["jaEstavaMudo": true])   // não fomos nós: não desfazemos depois
        return
    }
    var gravou = false
    for el in elementos where gravarMute(dev, el, true) { gravou = true }
    if !gravou {
        responderErro(id, "Este dispositivo de som não pode ser silenciado.")
        return
    }
    silenciadoPorNos = (dev, elementos)
    responderOk(id, ["jaEstavaMudo": false])
}

/// Desfaz o mute só se foi o auxiliar que silenciou.
func desfazerMute() {
    guard let s = silenciadoPorNos else { return }
    silenciadoPorNos = nil
    for el in s.elementos { gravarMute(s.dispositivo, el, false) }
}

// MARK: - Dispositivos de entrada de áudio e teclados (v4)

func enderecoAudio(_ seletor: AudioObjectPropertySelector, _ escopo: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress(mSelector: seletor, mScope: escopo, mElement: kAudioObjectPropertyElementMain)
}

func audioTexto(_ dev: AudioObjectID, _ seletor: AudioObjectPropertySelector) -> String? {
    var end = enderecoAudio(seletor)
    var cf: Unmanaged<CFString>? = nil
    var tam = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    guard AudioObjectGetPropertyData(dev, &end, 0, nil, &tam, &cf) == noErr, let c = cf else { return nil }
    return c.takeRetainedValue() as String
}

func audioNumero(_ dev: AudioObjectID, _ seletor: AudioObjectPropertySelector) -> UInt32? {
    var end = enderecoAudio(seletor)
    var v: UInt32 = 0
    var tam = UInt32(MemoryLayout<UInt32>.size)
    return AudioObjectGetPropertyData(dev, &end, 0, nil, &tam, &v) == noErr ? v : nil
}

func nomeDoTransporte(_ t: UInt32?) -> String {
    switch t {
    case kAudioDeviceTransportTypeBuiltIn?: return "embutido"
    case kAudioDeviceTransportTypeBluetooth?, kAudioDeviceTransportTypeBluetoothLE?: return "bluetooth"
    case kAudioDeviceTransportTypeUSB?: return "usb"
    case kAudioDeviceTransportTypeAirPlay?: return "airplay"
    case kAudioDeviceTransportTypeThunderbolt?: return "thunderbolt"
    case kAudioDeviceTransportTypeVirtual?: return "virtual"
    case kAudioDeviceTransportTypePCI?: return "pci"
    case kAudioDeviceTransportTypeFireWire?: return "firewire"
    case kAudioDeviceTransportTypeHDMI?: return "hdmi"
    case kAudioDeviceTransportTypeDisplayPort?: return "displayport"
    case kAudioDeviceTransportTypeAggregate?: return "agregado"
    // Microfone do iPhone pela Continuidade ('ccwd' com fio, 'ccwl' sem fio; macOS 13+).
    case 0x6363_7764?, 0x6363_776C?: return "iphone"
    default: return "desconhecido"
    }
}

/// Tampa do notebook fechada? (IOPMrootDomain/AppleClamshellState). nil = Mac sem tampa.
func tampaFechada() -> Bool? {
    let servico = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("IOPMrootDomain"))
    guard servico != 0 else { return nil }
    defer { IOObjectRelease(servico) }
    guard let v = IORegistryEntryCreateCFProperty(servico, "AppleClamshellState" as CFString, kCFAllocatorDefault, 0)
    else { return nil }
    return (v.takeRetainedValue() as? NSNumber)?.boolValue
}

func montarDispositivosAudio() -> [String: Any] {
    var end = enderecoAudio(kAudioHardwarePropertyDevices)
    var tam: UInt32 = 0
    let sistema = AudioObjectID(kAudioObjectSystemObject)
    var entradas: [[String: Any]] = []
    if AudioObjectGetPropertyDataSize(sistema, &end, 0, nil, &tam) == noErr, tam > 0 {
        var ids = [AudioObjectID](repeating: 0, count: Int(tam) / MemoryLayout<AudioObjectID>.size)
        if AudioObjectGetPropertyData(sistema, &end, 0, nil, &tam, &ids) == noErr {
            var padrao = AudioObjectID(kAudioObjectUnknown)
            var endPadrao = enderecoAudio(kAudioHardwarePropertyDefaultInputDevice)
            var tamP = UInt32(MemoryLayout<AudioObjectID>.size)
            _ = AudioObjectGetPropertyData(sistema, &endPadrao, 0, nil, &tamP, &padrao)
            for dev in ids {
                // Só quem tem fluxos de ENTRADA.
                var endFluxos = enderecoAudio(kAudioDevicePropertyStreams, kAudioObjectPropertyScopeInput)
                var tamF: UInt32 = 0
                guard AudioObjectGetPropertyDataSize(dev, &endFluxos, 0, nil, &tamF) == noErr, tamF > 0 else { continue }
                entradas.append([
                    "nome": audioTexto(dev, kAudioObjectPropertyName) ?? "Dispositivo sem nome",
                    "uid": audioTexto(dev, kAudioDevicePropertyDeviceUID) ?? "",
                    "transporte": nomeDoTransporte(audioNumero(dev, kAudioDevicePropertyTransportType)),
                    "padrao": dev == padrao,
                    "vivo": (audioNumero(dev, kAudioDevicePropertyDeviceIsAlive) ?? 1) != 0,
                ])
            }
        }
    }
    let tampa: Any = tampaFechada().map { $0 as Any } ?? NSNull()
    return ["entradas": entradas, "tampaFechada": tampa]
}

/// Teclados conectados (IOHIDManager, página Genérico/Teclado). Só lista; não escuta nada.
func listarTeclados() -> [[String: Any]] {
    let gerente = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
    let criterio: [String: Any] = [kIOHIDDeviceUsagePageKey: 0x01, kIOHIDDeviceUsageKey: 0x06]
    IOHIDManagerSetDeviceMatching(gerente, criterio as CFDictionary)
    guard let conjunto = IOHIDManagerCopyDevices(gerente) as? Set<IOHIDDevice> else { return [] }
    var vistos = Set<String>()
    var lista: [[String: Any]] = []
    for d in conjunto {
        let nome = (IOHIDDeviceGetProperty(d, kIOHIDProductKey as CFString) as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if nome.isEmpty || nome.localizedCaseInsensitiveContains("Karabiner") { continue }
        let transporte = IOHIDDeviceGetProperty(d, kIOHIDTransportKey as CFString) as? String
        let embutido = (IOHIDDeviceGetProperty(d, kIOHIDBuiltInKey as CFString) as? NSNumber)?.boolValue == true
            || transporte == "FIFO" || transporte == "SPI"
        if vistos.insert("\(nome)|\(embutido)").inserted {
            lista.append(["nome": nome, "embutido": embutido])
        }
    }
    return lista
}

// MARK: - Atalhos configuráveis (modelo)

enum Familia: Int, CaseIterable { case fn, ctrl, option, cmd, shift }
enum Lado { case qualquer, esq, dir }

/// Dados fixos de cada família de modificador.
struct InfoFamilia {
    let esq: Int64?      // keycode do lado esquerdo (Fn: só `esq`)
    let dir: Int64?
    let mascara: CGEventFlags
}
let infoFamilia: [Familia: InfoFamilia] = [
    .fn:     InfoFamilia(esq: 63, dir: nil, mascara: .maskSecondaryFn),
    .ctrl:   InfoFamilia(esq: 59, dir: 62,  mascara: .maskControl),
    .option: InfoFamilia(esq: 58, dir: 61,  mascara: .maskAlternate),
    .cmd:    InfoFamilia(esq: 55, dir: 54,  mascara: .maskCommand),
    .shift:  InfoFamilia(esq: 56, dir: 60,  mascara: .maskShift),
]
/// keycode de modificador -> família.
let familiaDoCodigo: [Int64: Familia] = {
    var m: [Int64: Familia] = [:]
    for (f, i) in infoFamilia {
        if let e = i.esq { m[e] = f }
        if let d = i.dir { m[d] = f }
    }
    return m
}()

/// Nomes de modificadores aceitos (src/shared/atalhos.ts).
let nomesModificadores: [String: (Familia, Lado)] = [
    "Fn": (.fn, .qualquer),
    "Ctrl": (.ctrl, .qualquer), "CtrlLeft": (.ctrl, .esq), "CtrlRight": (.ctrl, .dir),
    "Option": (.option, .qualquer), "OptionLeft": (.option, .esq), "OptionRight": (.option, .dir),
    "Cmd": (.cmd, .qualquer), "CmdLeft": (.cmd, .esq), "CmdRight": (.cmd, .dir),
    "Shift": (.shift, .qualquer), "ShiftLeft": (.shift, .esq), "ShiftRight": (.shift, .dir),
]

/// Nomes de teclas comuns -> keycode ANSI (kVK_*).
let nomesTeclas: [String: Int64] = {
    var m: [String: Int64] = [
        "A": 0, "S": 1, "D": 2, "F": 3, "H": 4, "G": 5, "Z": 6, "X": 7, "C": 8, "V": 9,
        "B": 11, "Q": 12, "W": 13, "E": 14, "R": 15, "Y": 16, "T": 17,
        "1": 18, "2": 19, "3": 20, "4": 21, "6": 22, "5": 23, "9": 25, "7": 26, "8": 28, "0": 29,
        "O": 31, "U": 32, "I": 34, "P": 35, "L": 37, "J": 38, "K": 40, "N": 45, "M": 46,
        "Enter": 36, "Tab": 48, "Space": 49, "Esc": 53,
    ]
    let fs: [Int64] = [122, 120, 99, 118, 96, 97, 98, 100, 101, 109, 103, 111,   // F1–F12
                       105, 107, 113, 106, 64, 79, 80, 90]                        // F13–F20
    for (i, c) in fs.enumerated() { m["F\(i + 1)"] = c }
    // Botões do mouse (v4): códigos sintéticos fora da faixa de keycodes (0–127).
    m["Mouse3"] = 1002; m["Mouse4"] = 1003; m["Mouse5"] = 1004
    return m
}()
/// Códigos sintéticos dos botões do mouse: 1000 + buttonNumber (2 = meio, 3 = Mouse4, 4 = Mouse5).
let codigosMouse: Set<Int64> = [1002, 1003, 1004]
let ehTeclaF: (Int64) -> Bool = { c in [122, 120, 99, 118, 96, 97, 98, 100, 101, 109, 103, 111,
                                         105, 107, 113, 106, 64, 79, 80, 90].contains(c) }

/// Um atalho configurado. Estado mutável: só na main thread.
final class AtalhoCfg {
    let id: String
    let mods: [Familia: Lado]
    let tecla: Int64?        // nil = atalho só de modificadores
    let duplo: Bool          // toque duplo (v3): `mods` tem 1 modificador OU `tecla` é a tecla tocada
    var ativo = false        // já emitimos "desce" e ainda não "sobe"
    init(id: String, mods: [Familia: Lado], tecla: Int64?, duplo: Bool = false) {
        self.id = id; self.mods = mods; self.tecla = tecla; self.duplo = duplo
    }
}

/// Converte a lista `atalhos` do comando. Devolve o erro (em português) ou a lista pronta.
func interpretarAtalhos(_ bruto: Any?) -> (lista: [AtalhoCfg], erro: String?) {
    guard let itens = bruto as? [Any] else { return ([], "Campo 'atalhos' ausente ou inválido.") }
    var lista: [AtalhoCfg] = []
    var ids = Set<String>()
    for item in itens {
        guard let d = item as? [String: Any], let id = d["id"] as? String, !id.isEmpty else {
            return ([], "Atalho sem 'id'.")
        }
        guard let teclas = d["teclas"] as? [Any], !teclas.isEmpty else {
            return ([], "Atalho '\(id)' sem teclas.")
        }
        if !ids.insert(id).inserted { return ([], "Atalho '\(id)' repetido.") }
        // Toque duplo (v3): ["Duplo", X], X = uma tecla (modificadora ou comum).
        if teclas.contains(where: { ($0 as? String) == "Duplo" }) {
            guard teclas.count == 2, (teclas[0] as? String) == "Duplo", let nome = teclas[1] as? String else {
                return ([], "Atalho '\(id)': 'Duplo' deve vir primeiro, seguido de exatamente uma tecla.")
            }
            if let (f, lado) = nomesModificadores[nome] {
                lista.append(AtalhoCfg(id: id, mods: [f: lado], tecla: nil, duplo: true))
            } else if let c = nomesTeclas[nome] {
                lista.append(AtalhoCfg(id: id, mods: [:], tecla: c, duplo: true))
            } else {
                return ([], "Atalho '\(id)': tecla desconhecida (\(nome)).")
            }
            continue
        }
        var mods: [Familia: Lado] = [:]
        var tecla: Int64? = nil
        var nomeTecla = ""
        for t in teclas {
            guard let nome = t as? String else { return ([], "Atalho '\(id)': tecla inválida.") }
            if let (f, lado) = nomesModificadores[nome] {
                if mods[f] != nil { return ([], "Atalho '\(id)': modificador repetido (\(nome)).") }
                mods[f] = lado
            } else if let c = nomesTeclas[nome] {
                if tecla != nil {
                    return ([], "Atalho '\(id)': só pode ter uma tecla comum (\(nomeTecla) e \(nome)).")
                }
                tecla = c
                nomeTecla = nome
            } else {
                return ([], "Atalho '\(id)': tecla desconhecida (\(nome)).")
            }
        }
        // Tecla comum sozinha (ex.: só "A" ou só "Space") engoliria a digitação normal.
        if tecla != nil && mods.isEmpty && !ehTeclaF(tecla!) && !codigosMouse.contains(tecla!) {
            return ([], "Atalho '\(id)': a tecla \(nomeTecla) precisa de ao menos um modificador.")
        }
        lista.append(AtalhoCfg(id: id, mods: mods, tecla: tecla))
    }
    return (lista, nil)
}

// MARK: - Teclado (CGEventTap)

private let kVKEscape: Int64 = 53     // kVK_Escape
/// Tecla 🌐 "Globo": ao SOLTAR o Fn, o macOS manda também keyDown/keyUp com este código
/// (visto no Mac do Daniel em 17/10/2026). Não digita nada e não pode contar como "outra tecla"
/// — senão cancela o toque duplo do Fn e dispara "combinado". Ignorada em toda a lógica.
private let kVKGlobo: Int64 = 179
private let kVKKeypadEnter: Int64 = 76
private let kVKReturn: Int64 = 36
private let kVKV: Int64 = 9           // kVK_ANSI_V (padrão se o layout não tiver o V)
private let kVKC: Int64 = 8           // kVK_ANSI_C (idem, para copiar)

/// Estado do tap (somente main thread).
var tap: CFMachPort? = nil
var fonteDoTap: CFRunLoopSource? = nil
var atalhos: [AtalhoCfg] = []                 // atalhos segurados configurados (sem toque duplo)
var duplos: [AtalhoCfg] = []                  // atalhos de toque duplo (v3)
var modsSegurados = Set<Int64>()              // keycodes de modificadores seguros agora
var teclasEngolidas = Set<Int64>()            // teclas comuns cujo keyDown engolimos (engolir o keyUp também)
var combinadoEmitido = false                  // "combinado" já emitido neste pressionamento

func familiaPresente(_ f: Familia) -> Bool {
    guard let i = infoFamilia[f] else { return false }
    return (i.esq.map { modsSegurados.contains($0) } ?? false)
        || (i.dir.map { modsSegurados.contains($0) } ?? false)
}

/// Os modificadores seguros contêm todos os do atalho?
func contemMods(_ a: AtalhoCfg) -> Bool {
    for (f, lado) in a.mods {
        guard let i = infoFamilia[f] else { return false }
        switch lado {
        case .qualquer: if !familiaPresente(f) { return false }
        case .esq: if let c = i.esq, modsSegurados.contains(c) { continue } else { return false }
        case .dir: if let c = i.dir, modsSegurados.contains(c) { continue } else { return false }
        }
    }
    return true
}

/// Contém os do atalho e nenhum modificador a mais?
func modsExatos(_ a: AtalhoCfg) -> Bool {
    if !contemMods(a) { return false }
    for f in Familia.allCases where a.mods[f] == nil && familiaPresente(f) { return false }
    return true
}

func emitirAtalho(_ a: AtalhoCfg, _ desce: Bool) {
    emitir(["evento": "atalho", "id": a.id, "estado": desce ? "desce" : "sobe"])
}

/// Reavalia os atalhos depois de mudar os modificadores seguros.
func reavaliarAtalhos() {
    for a in atalhos {
        if a.tecla == nil {
            // Só modificadores: desce quando os modificadores são exatamente estes;
            // continua "descido" (mesmo com modificador extra) até algum deles soltar.
            if !a.ativo && modsExatos(a) {
                a.ativo = true
                emitirAtalho(a, true)
            } else if a.ativo && !contemMods(a) {
                a.ativo = false
                emitirAtalho(a, false)
            }
        } else if a.ativo && !contemMods(a) {
            a.ativo = false
            emitirAtalho(a, false)
        }
    }
    if !atalhos.contains(where: { $0.tecla == nil && $0.ativo }) { combinadoEmitido = false }
}

/// Solta tudo o que estiver "descido" (ao parar o tap, trocar atalhos ou perder eventos).
func soltarAtalhosAtivos() {
    for a in atalhos where a.ativo {
        a.ativo = false
        emitirAtalho(a, false)
    }
    for a in duplos where a.ativo {
        a.ativo = false
        emitirAtalho(a, false)
    }
    duploReiniciar()
    combinadoEmitido = false
}

func tratarFlags(_ evento: CGEvent) {
    let codigo = evento.getIntegerValueField(.keyboardEventKeycode)
    guard let f = familiaDoCodigo[codigo], let info = infoFamilia[f] else {
        if captura == nil { duploOutraTecla() }   // flagsChanged de algo que não é modificador de atalho (CapsLock...)
        return
    }
    let flags = evento.flags
    let presente = flags.contains(info.mascara)
    if f == .fn {
        // Fn só conta via flagsChanged do keycode 63 (outras teclas também carregam o flag).
        if presente { modsSegurados.insert(codigo) } else { modsSegurados.remove(codigo) }
    } else if presente {
        // Alterna o lado que mudou (o outro lado, se segurado, continua).
        if modsSegurados.contains(codigo) { modsSegurados.remove(codigo) } else { modsSegurados.insert(codigo) }
    } else {
        if let e = info.esq { modsSegurados.remove(e) }
        if let d = info.dir { modsSegurados.remove(d) }
    }
    // Reconcilia: qualquer outra família cujo flag sumiu perdeu o evento de soltar.
    for outra in Familia.allCases where outra != f && outra != .fn {
        if let io = infoFamilia[outra], !flags.contains(io.mascara) {
            if let e = io.esq { modsSegurados.remove(e) }
            if let d = io.dir { modsSegurados.remove(d) }
        }
    }
    let apertada = modsSegurados.contains(codigo)
    if let cap = captura {
        // Captura: só junta as teclas; nenhum atalho é emitido.
        if apertada { capturaApertou(cap, codigo) } else { capturaSoltou(cap, codigo) }
        return
    }
    if apertada { _ = duploTeclaDesce(codigo, modificador: true) } else { duploTeclaSobe(codigo) }
    reavaliarAtalhos()
}

/// Retorna true se o evento deve ser engolido.
func tratarKeyDown(_ evento: CGEvent) -> Bool {
    var codigo = evento.getIntegerValueField(.keyboardEventKeycode)
    if codigo == kVKKeypadEnter { codigo = kVKReturn }
    return tratarDesce(codigo, repeticao: evento.getIntegerValueField(.keyboardEventAutorepeat) != 0)
}

/// Tecla comum (ou botão do mouse, v4) desceu. Retorna true se deve ser engolida.
func tratarDesce(_ codigo: Int64, repeticao: Bool) -> Bool {
    if repeticao && teclasEngolidas.contains(codigo) { return true }   // auto-repetição de tecla engolida
    teclasEngolidas.remove(codigo)                                      // keyDown novo: keyUp anterior se perdeu

    if !repeticao {
        for a in atalhos where a.tecla == codigo && modsExatos(a) {
            a.ativo = true
            teclasEngolidas.insert(codigo)
            emitirAtalho(a, true)
            return true
        }
        if codigo == kVKEscape { emitir(["evento": "esc"]) }
        // Outra tecla com um atalho só de modificadores seguro: era atalho do sistema (Fn+Delete...).
        if !combinadoEmitido && atalhos.contains(where: { $0.tecla == nil && $0.ativo }) {
            combinadoEmitido = true
            emitir(["evento": "combinado"])
        }
        // Toque duplo de tecla comum: o 2º desce é engolido (e o caractere do 1º toque, apagado).
        if duploTeclaDesce(codigo, modificador: false) { return true }
    } else if dtFase == .primeiroDescido && codigo == dtCodigo {
        duploReiniciar()   // auto-repetição: a tecla foi segurada, não é um toque
    }
    return false
}

func tratarKeyUp(_ evento: CGEvent) -> Bool {
    var codigo = evento.getIntegerValueField(.keyboardEventKeycode)
    if codigo == kVKKeypadEnter { codigo = kVKReturn }
    return tratarSobe(codigo)
}

func tratarSobe(_ codigo: Int64) -> Bool {
    duploTeclaSobe(codigo)   // fim do 1º toque ou do 2º desce do toque duplo
    guard teclasEngolidas.remove(codigo) != nil else { return false }
    for a in atalhos where a.tecla == codigo && a.ativo {
        a.ativo = false
        emitirAtalho(a, false)
    }
    return true
}

/// Callback do tap (tap ativo). Roda na main (o source está no run loop principal).
/// Só mexe em memória; devolve nil APENAS para keyDown/keyUp da tecla comum de um atalho.
let callbackTeclado: CGEventTapCallBack = { _, tipo, evento, _ in
    switch tipo {
    case .tapDisabledByTimeout, .tapDisabledByUserInput:
        // O sistema desligou o tap: reativa e descarta o estado (podemos ter perdido eventos).
        if let t = tap { CGEvent.tapEnable(tap: t, enable: true) }
        modsSegurados.removeAll()
        teclasEngolidas.removeAll()
        capturaPerdeuEventos()
        soltarAtalhosAtivos()
        log("tap reativado")
    case .flagsChanged:
        tratarFlags(evento)
    case .keyDown:
        // Evento injetado por nós (Backspace do toque duplo): passa direto, fora de toda a lógica.
        if evento.getIntegerValueField(.eventSourceUserData) == marcaInjetada { break }
        if evento.getIntegerValueField(.keyboardEventKeycode) == kVKGlobo { break }
        if let cap = captura { return capturaTeclaDesce(cap, evento) ? nil : Unmanaged.passUnretained(evento) }
        if tratarKeyDown(evento) { return nil }
    case .keyUp:
        if evento.getIntegerValueField(.eventSourceUserData) == marcaInjetada { break }
        if evento.getIntegerValueField(.keyboardEventKeycode) == kVKGlobo { break }
        if let cap = captura { return capturaTeclaSobe(cap, evento) ? nil : Unmanaged.passUnretained(evento) }
        if tratarKeyUp(evento) { return nil }
    case .otherMouseDown, .otherMouseUp:
        // Botões extras do mouse como atalho (v4). Esquerdo/direito não chegam aqui.
        if evento.getIntegerValueField(.eventSourceUserData) == marcaInjetada { break }
        let botao = evento.getIntegerValueField(.mouseEventButtonNumber)
        guard botao >= 2 && botao <= 4 else { break }
        let codigo = 1000 + botao
        let desce = tipo == .otherMouseDown
        if let cap = captura {
            let engolir = desce ? capturaDesceCodigo(cap, codigo, repeticao: false) : capturaSobeCodigo(cap, codigo)
            return engolir ? nil : Unmanaged.passUnretained(evento)
        }
        // Nenhum atalho usa este botão: passa intacto, sem contar como "outra tecla".
        let usado = atalhos.contains { $0.tecla == codigo } || duplos.contains { $0.tecla == codigo }
        if !usado { break }
        if (desce ? tratarDesce(codigo, repeticao: false) : tratarSobe(codigo)) { return nil }
    default:
        break
    }
    return Unmanaged.passUnretained(evento)
}

/// Cria o tap. Retorna false se falhar (sem permissão).
func iniciarTeclado() -> Bool {
    if tap != nil { return true } // idempotente
    let mascara: CGEventMask = (1 << CGEventType.flagsChanged.rawValue)
                             | (1 << CGEventType.keyDown.rawValue)
                             | (1 << CGEventType.keyUp.rawValue)
                             | (1 << CGEventType.otherMouseDown.rawValue)
                             | (1 << CGEventType.otherMouseUp.rawValue)
    guard let novo = CGEvent.tapCreate(
        tap: .cgSessionEventTap,
        place: .headInsertEventTap,
        options: .defaultTap,          // ativo: precisa poder engolir a tecla comum dos atalhos
        eventsOfInterest: mascara,
        callback: callbackTeclado,
        userInfo: nil
    ) else { return false }
    let fonte = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, novo, 0)
    CFRunLoopAddSource(CFRunLoopGetMain(), fonte, .commonModes)
    CGEvent.tapEnable(tap: novo, enable: true)
    tap = novo
    fonteDoTap = fonte
    modsSegurados.removeAll()
    teclasEngolidas.removeAll()
    combinadoEmitido = false
    for a in atalhos { a.ativo = false }
    return true
}

func pararTeclado() {
    capturaTerminar(erro: "O teclado foi parado.")
    soltarAtalhosAtivos()
    if let t = tap {
        CGEvent.tapEnable(tap: t, enable: false)
        CFMachPortInvalidate(t)
    }
    if let f = fonteDoTap { CFRunLoopRemoveSource(CFRunLoopGetMain(), f, .commonModes) }
    tap = nil
    fonteDoTap = nil
    modsSegurados.removeAll()
    teclasEngolidas.removeAll()
}

/// Substitui a lista inteira de atalhos (já validada).
func trocarAtalhos(_ nova: [AtalhoCfg]) {
    soltarAtalhosAtivos()   // não deixa nada "descido" da configuração antiga
    atalhos = nova.filter { !$0.duplo }
    duplos = nova.filter { $0.duplo }
}

// MARK: - Toque duplo (v3)

/// Marca (eventSourceUserData) nos eventos que o próprio auxiliar injeta: o tap os ignora.
let marcaInjetada: Int64 = 0x46414C41   // "FALA"
private let kVKDelete: Int64 = 51        // kVK_Delete (Backspace)

/// Teclas que digitam algo ao serem tocadas (o 1º toque de um toque duplo precisa ser apagado).
let teclasQueDigitam: Set<Int64> = Set(nomesTeclas.filter { nome, _ in
    nome.count == 1 || nome == "Space" || nome == "Tab"
}.map { $0.value })

let limiteToque: UInt64 = 300_000_000        // tecla descida no máximo 300 ms
let limiteIntervalo: UInt64 = 350_000_000    // 2º desce até 350 ms depois do 1º subir

enum FaseDuplo { case ocioso, primeiroDescido, aguardando, segundoDescido }
var dtFase = FaseDuplo.ocioso
var dtCodigo: Int64 = -1                     // keycode da tecla em jogo
var dtMarca: UInt64 = 0                      // instante do desce (primeiroDescido) ou do sobe (aguardando)
var dtAtivos: [AtalhoCfg] = []               // atalhos que emitiram "desce" no 2º toque

func agora() -> UInt64 { DispatchTime.now().uptimeNanoseconds }

func duploReiniciar() {
    dtFase = .ocioso
    dtCodigo = -1
    dtAtivos = []
}

/// Outra tecla no meio: descarta o toque em andamento (menos se o 2º toque já está segurado).
func duploOutraTecla() {
    if dtFase != .segundoDescido { duploReiniciar() }
}

/// Esta tecla (keycode) é o gatilho do atalho de toque duplo?
func gatilhoCombina(_ a: AtalhoCfg, _ codigo: Int64) -> Bool {
    if let t = a.tecla { return t == codigo }
    guard let (f, lado) = a.mods.first, let i = infoFamilia[f] else { return false }
    switch lado {
    case .qualquer: return i.esq == codigo || i.dir == codigo
    case .esq: return i.esq == codigo
    case .dir: return i.dir == codigo
    }
}

/// Backspace injetado (marcado) para apagar o caractere do 1º toque. Fora do callback do tap.
func enviarBackspace() {
    let fonte = CGEventSource(stateID: .combinedSessionState)
    for descendo in [true, false] {
        guard let e = CGEvent(keyboardEventSource: fonte, virtualKey: CGKeyCode(kVKDelete), keyDown: descendo) else { continue }
        e.flags = []
        e.setIntegerValueField(.eventSourceUserData, value: marcaInjetada)
        e.post(tap: .cghidEventTap)
    }
}

/// Uma tecla desceu (sem ser auto-repetição). Devolve true se o evento deve ser engolido
/// (só o 2º desce de uma tecla comum).
func duploTeclaDesce(_ codigo: Int64, modificador: Bool) -> Bool {
    if duplos.isEmpty { return false }
    if dtFase == .segundoDescido {
        if codigo != dtCodigo { return false }   // outra tecla enquanto o 2º toque é segurado: ignora
        duploSoltarAtivos()                      // desceu de novo sem subir: o "sobe" se perdeu
    }
    let candidatos = duplos.filter { gatilhoCombina($0, codigo) }
    // Nenhum atalho para esta tecla, ou outro modificador segurado (Shift é tolerado em tecla comum).
    let outrosMods = modsSegurados.subtracting(modificador ? [codigo] : [56, 60])
    if candidatos.isEmpty || !outrosMods.isEmpty {
        duploReiniciar()
        return false
    }
    let t = agora()
    if dtFase == .aguardando && dtCodigo == codigo && t &- dtMarca <= limiteIntervalo {
        dtFase = .segundoDescido
        dtAtivos = candidatos
        for a in candidatos { a.ativo = true; emitirAtalho(a, true) }
        if modificador { return false }
        teclasEngolidas.insert(codigo)           // engole o 2º desce e o sobe
        if teclasQueDigitam.contains(codigo) {
            DispatchQueue.main.async { enviarBackspace() }
        }
        return true
    }
    dtFase = .primeiroDescido
    dtCodigo = codigo
    dtMarca = t
    dtAtivos = []
    return false
}

/// Uma tecla subiu (ou um modificador foi solto).
func duploTeclaSobe(_ codigo: Int64) {
    switch dtFase {
    case .primeiroDescido:
        guard codigo == dtCodigo else { return }   // soltar outra tecla não interfere
        let t = agora()
        if t &- dtMarca <= limiteToque {
            dtFase = .aguardando
            dtMarca = t
        } else {
            duploReiniciar()                       // segurou demais: não foi toque
        }
    case .segundoDescido:
        if codigo == dtCodigo { duploSoltarAtivos() }
    default:
        break
    }
}

/// Fim do 2º toque: emite "sobe" e volta ao repouso.
func duploSoltarAtivos() {
    for a in dtAtivos where a.ativo {
        a.ativo = false
        emitirAtalho(a, false)
    }
    duploReiniciar()
}

// MARK: - Captura de atalho (v3)

enum FaseCaptura { case coletando, aguardando, segundo }

/// Captura em andamento (somente main thread). Enquanto existir, o tap não emite atalhos.
final class Captura {
    let id: Any
    var fase = FaseCaptura.coletando
    var seguradas = Set<Int64>()    // teclas apertadas durante a captura e ainda seguras
    var acumulado = Set<Int64>()    // teclas do acorde atual
    var engolidas = Set<Int64>()    // teclas comuns cujo desce engolimos (engolir o sobe também)
    var primeiro: Int64? = nil      // tecla única do 1º acorde (esperando o 2º toque)
    var espera = 0                  // geração do timer de 400 ms
    var ultimo: UInt64 = agora()    // último evento de tecla
    init(id: Any) { self.id = id }
}
var captura: Captura? = nil

let nomesModCodigo: [Int64: String] = [
    63: "Fn", 59: "CtrlLeft", 62: "CtrlRight", 58: "OptionLeft", 61: "OptionRight",
    55: "CmdLeft", 54: "CmdRight", 56: "ShiftLeft", 60: "ShiftRight",
]
/// Ordem na resposta: Fn, Ctrl, Option, Cmd, Shift (esquerdo antes do direito).
let ordemModCodigos: [Int64] = [63, 59, 62, 58, 61, 55, 54, 56, 60]
let nomesTeclaCodigo: [Int64: String] = {
    var m: [Int64: String] = [:]
    for (n, c) in nomesTeclas { m[c] = n }
    return m
}()

func nomeDoCodigo(_ c: Int64) -> String? { nomesModCodigo[c] ?? nomesTeclaCodigo[c] }

let esperaSegundoToque = 0.4
let prazoCaptura = 10.0

func iniciarCaptura(id: Any) {
    if captura != nil {
        responderErro(id, "Já há uma captura em andamento.")
        return
    }
    if tap == nil {
        responderErro(id, "O teclado não está ativo (permissão de Acessibilidade).")
        return
    }
    soltarAtalhosAtivos()   // nada fica "descido" enquanto captura (também zera o toque duplo)
    let cap = Captura(id: id)
    captura = cap
    agendarPrazo(cap, em: prazoCaptura)
}

/// 10 s sem nenhuma tecla: erro (se houver tecla "presa" sem soltar, encerra com o que juntou).
func agendarPrazo(_ cap: Captura, em segundos: Double) {
    DispatchQueue.main.asyncAfter(deadline: .now() + segundos) {
        guard captura === cap else { return }
        let decorrido = Double(agora() &- cap.ultimo) / 1e9
        if decorrido < prazoCaptura - 0.01 {
            agendarPrazo(cap, em: prazoCaptura - decorrido)
        } else if cap.fase == .aguardando {
            return   // o timer de 400 ms resolve
        } else if cap.acumulado.isEmpty {
            capturaTerminar(erro: "Nenhuma tecla apertada.")
        } else {
            cap.seguradas.removeAll()
            capturaAcordeConcluido(cap)
        }
    }
}

/// Encerra a captura (se houver) com erro e responde ao `capturar_atalho`.
func capturaTerminar(erro: String) {
    guard let cap = captura else { return }
    captura = nil
    cap.espera += 1
    responderErro(cap.id, erro)
}

func capturaTerminarOk(_ cap: Captura, _ teclas: [String]) {
    guard captura === cap else { return }
    captura = nil
    cap.espera += 1
    responderOk(cap.id, ["teclas": teclas])
}

/// O tap foi desligado pelo sistema: perdemos eventos, então descarta o acorde em andamento.
func capturaPerdeuEventos() {
    guard let cap = captura else { return }
    cap.seguradas.removeAll()
    cap.acumulado.removeAll()
    cap.engolidas.removeAll()
    cap.primeiro = nil
    cap.fase = .coletando
    cap.espera += 1
}

func capturaApertou(_ cap: Captura, _ codigo: Int64) {
    cap.ultimo = agora()
    if cap.fase == .aguardando {
        cap.espera += 1   // cancela o timer de 400 ms
        if codigo == cap.primeiro && cap.seguradas.isEmpty {
            cap.fase = .segundo
        } else {
            cap.fase = .coletando   // outra tecla: começa um acorde novo
            cap.primeiro = nil
        }
        cap.acumulado.removeAll()
    }
    cap.seguradas.insert(codigo)
    cap.acumulado.insert(codigo)
}

func capturaSoltou(_ cap: Captura, _ codigo: Int64) {
    guard cap.seguradas.remove(codigo) != nil else { return }   // soltar tecla que já vinha segura: ignora
    cap.ultimo = agora()
    if cap.seguradas.isEmpty && !cap.acumulado.isEmpty { capturaAcordeConcluido(cap) }
}

/// Todas as teclas do acorde foram soltas.
func capturaAcordeConcluido(_ cap: Captura) {
    let ac = cap.acumulado
    if cap.fase == .segundo, let p = cap.primeiro, ac == [p], let nome = nomeDoCodigo(p) {
        capturaTerminarOk(cap, ["Duplo", nome])
        return
    }
    if ac.count == 1, let k = ac.first {
        // Tecla só: espera 400 ms por um 2º toque.
        cap.fase = .aguardando
        cap.primeiro = k
        cap.acumulado.removeAll()
        cap.espera += 1
        let geracao = cap.espera
        DispatchQueue.main.asyncAfter(deadline: .now() + esperaSegundoToque) {
            guard captura === cap, cap.fase == .aguardando, cap.espera == geracao else { return }
            if k == kVKEscape {
                capturaTerminar(erro: "Captura cancelada.")
            } else if let nome = nomeDoCodigo(k) {
                capturaTerminarOk(cap, [nome])
            }
        }
        return
    }
    // Combinação: modificadores (Fn, Ctrl, Option, Cmd, Shift), tecla comum por último.
    let comuns = ac.filter { nomesModCodigo[$0] == nil }
    if comuns.count > 1 {
        capturaTerminar(erro: "Só pode haver uma tecla comum no atalho.")
        return
    }
    var nomes = ordemModCodigos.filter { ac.contains($0) }.compactMap { nomesModCodigo[$0] }
    if let c = comuns.first, let n = nomesTeclaCodigo[c] { nomes.append(n) }
    capturaTerminarOk(cap, nomes)
}

/// keyDown em modo de captura. Sempre engole (nada é digitado nem dispara).
func capturaTeclaDesce(_ cap: Captura, _ evento: CGEvent) -> Bool {
    var codigo = evento.getIntegerValueField(.keyboardEventKeycode)
    if codigo == kVKKeypadEnter { codigo = kVKReturn }
    return capturaDesceCodigo(cap, codigo, repeticao: evento.getIntegerValueField(.keyboardEventAutorepeat) != 0)
}

func capturaDesceCodigo(_ cap: Captura, _ codigo: Int64, repeticao: Bool) -> Bool {
    cap.engolidas.insert(codigo)
    if repeticao { return true }
    if nomeDoCodigo(codigo) != nil { capturaApertou(cap, codigo) }   // teclas sem nome são engolidas e ignoradas
    return true
}

func capturaTeclaSobe(_ cap: Captura, _ evento: CGEvent) -> Bool {
    var codigo = evento.getIntegerValueField(.keyboardEventKeycode)
    if codigo == kVKKeypadEnter { codigo = kVKReturn }
    return capturaSobeCodigo(cap, codigo)
}

func capturaSobeCodigo(_ cap: Captura, _ codigo: Int64) -> Bool {
    guard cap.engolidas.remove(codigo) != nil else { return false }
    capturaSoltou(cap, codigo)
    return true
}

// MARK: - Colar

/// Cópia de um item da área de transferência: lista de (tipo, dados).
typealias ItemSalvo = [(NSPasteboard.PasteboardType, Data)]

func salvarAreaDeTransferencia(_ pb: NSPasteboard) -> [ItemSalvo] {
    var salvos: [ItemSalvo] = []
    for item in pb.pasteboardItems ?? [] {
        var tipos: ItemSalvo = []
        for tipo in item.types {
            if let d = item.data(forType: tipo) { tipos.append((tipo, d)) }
        }
        salvos.append(tipos)
    }
    return salvos
}

/// Devolve o conteúdo guardado. `.currentHostOnly`: nada vai pela Área de Transferência Universal
/// (Handoff) para os outros aparelhos do usuário.
func restaurarAreaDeTransferencia(_ pb: NSPasteboard, _ salvos: [ItemSalvo]) {
    _ = pb.prepareForNewContents(with: .currentHostOnly)
    if salvos.isEmpty { return }
    let itens: [NSPasteboardItem] = salvos.map { tipos in
        let novo = NSPasteboardItem()
        for (tipo, dados) in tipos { novo.setData(dados, forType: tipo) }
        return novo
    }
    pb.writeObjects(itens)
}

/// Keycode da tecla que produz `caractere` (minúsculo) no layout de teclado ATUAL, com Command
/// segurado: em layouts como "Dvorak - QWERTY ⌘" o Cmd usa a posição QWERTY, e é essa que o app lê.
/// Devolve o menor keycode que serve. nil se o layout não tem dados Unicode (ex.: método de entrada).
/// Main thread (as funções TIS exigem). O layout muda em tempo de execução: não guarde o resultado.
func codigoDaTecla(_ caractere: String) -> CGKeyCode? {
    guard let fonte = TISCopyCurrentKeyboardLayoutInputSource()?.takeRetainedValue(),
          let ptr = TISGetInputSourceProperty(fonte, kTISPropertyUnicodeKeyLayoutData) else { return nil }
    let dados = Unmanaged<CFData>.fromOpaque(ptr).takeUnretainedValue()   // pertence à fonte (não é nosso)
    guard let bytes = CFDataGetBytePtr(dados) else { return nil }
    let layout = UnsafeRawPointer(bytes).assumingMemoryBound(to: UCKeyboardLayout.self)
    let tipoTeclado = UInt32(LMGetKbdType())
    let comCommand = UInt32((cmdKey >> 8) & 0xFF)   // estado de modificadores no formato do UCKeyTranslate
    for codigo in 0..<128 {
        var mortas: UInt32 = 0
        var tamanho = 0
        var letras = [UniChar](repeating: 0, count: 4)
        let st = UCKeyTranslate(layout, UInt16(codigo), UInt16(kUCKeyActionDown), comCommand, tipoTeclado,
                                OptionBits(kUCKeyTranslateNoDeadKeysBit), &mortas, letras.count, &tamanho, &letras)
        if st == noErr, tamanho > 0, String(utf16CodeUnits: letras, count: tamanho).lowercased() == caractere {
            return CGKeyCode(codigo)
        }
    }
    return nil
}

/// Posta Cmd + `tecla` (somente Command; não herda Fn nem outros modificadores).
func simularCmd(_ tecla: CGKeyCode, marcar: Bool = false) {
    let fonte = CGEventSource(stateID: .combinedSessionState)
    for descendo in [true, false] {
        guard let e = CGEvent(keyboardEventSource: fonte, virtualKey: tecla, keyDown: descendo) else { continue }
        e.flags = .maskCommand
        if marcar { e.setIntegerValueField(.eventSourceUserData, value: marcaInjetada) }
        e.post(tap: .cghidEventTap)
    }
}

/// Simula Cmd+V na tecla que o layout atual usa para o "v" (padrão: ANSI).
func simularCmdV() {
    simularCmd(codigoDaTecla("v") ?? CGKeyCode(kVKV))
}

/// Aperta Enter no app em foco (envio automático depois de colar). Evento marcado: o tap o ignora,
/// para não contar como "outra tecla" no toque duplo nem disparar atalhos.
func apertarEnter() {
    let fonte = CGEventSource(stateID: .combinedSessionState)
    for descendo in [true, false] {
        guard let e = CGEvent(keyboardEventSource: fonte, virtualKey: CGKeyCode(kVKReturn), keyDown: descendo) else { continue }
        e.flags = []
        e.setIntegerValueField(.eventSourceUserData, value: marcaInjetada)
        e.post(tap: .cghidEventTap)
    }
}

/// Colagem cuja restauração ainda não rodou (somente main thread).
/// `original` é o que o USUÁRIO tinha na área de transferência; `contagem` é o changeCount
/// logo depois de gravarmos o nosso texto.
struct ColagemPendente {
    let original: [ItemSalvo]
    let contagem: Int
}
var colagemPendente: ColagemPendente? = nil

/// Devolve a área de transferência do usuário, se ninguém mexeu nela depois da colagem.
func restaurarPendente() {
    guard let p = colagemPendente else { return }
    colagemPendente = nil
    let pb = NSPasteboard.general
    if pb.changeCount == p.contagem {
        restaurarAreaDeTransferencia(pb, p.original)
    }
}

/// Encerra o processo, executando antes qualquer restauração pendente
/// (senão a área de transferência do usuário ficaria com o texto colado, ou o som mudo).
func encerrar() -> Never {
    capturaTerminar(erro: "Auxiliar encerrando.")
    encerrarCopia()
    restaurarPendente()
    desfazerMute()
    descarregarSaida()
    exit(0)
}

func colar(id: Any, texto: String, html: String? = nil) {
    guard AXIsProcessTrusted() else {
        responderErro(id, "Sem permissão de Acessibilidade para colar.")
        return
    }
    encerrarCopia()   // uma cópia em andamento termina (restaura e responde null) antes de colar
    let pb = NSPasteboard.general
    // Duas colagens seguidas (ex.: ditado e logo depois Ctrl+Cmd+V): se a anterior ainda não
    // restaurou e ninguém mexeu, o "original" continua sendo o do usuário, não o texto colado.
    let original: [ItemSalvo]
    if let p = colagemPendente, pb.changeCount == p.contagem {
        original = p.original
    } else {
        original = salvarAreaDeTransferencia(pb)
    }

    // Um item só: texto, html (se vier) e a marca de transitório (gerenciadores de área de
    // transferência a ignoram). `.currentHostOnly`: não sai por Handoff para outros aparelhos.
    let item = NSPasteboardItem()
    item.setString(texto, forType: .string)
    if let h = html { item.setString(h, forType: .html) }
    item.setData(Data(), forType: NSPasteboard.PasteboardType("org.nspasteboard.TransientType"))
    _ = pb.prepareForNewContents(with: .currentHostOnly)
    pb.writeObjects([item])
    let contagem = pb.changeCount
    colagemPendente = ColagemPendente(original: original, contagem: contagem)

    simularCmdV()
    responderOk(id)

    // Depois de ~450 ms restaura — só se esta ainda for a colagem mais recente.
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
        if colagemPendente?.contagem == contagem { restaurarPendente() }
    }
}

// MARK: - Copiar a seleção (v4)

/// Cópia em andamento (somente main thread). Só uma por vez.
final class CopiaEmAndamento {
    let id: Any
    let original: [ItemSalvo]
    let c0: Int                  // changeCount logo depois de limparmos (antes do Cmd+C)
    var ultima: Int              // último changeCount visto (a cópia do app)
    let limite: DispatchTime
    init(id: Any, original: [ItemSalvo], c0: Int, limite: DispatchTime) {
        self.id = id; self.original = original; self.c0 = c0; self.ultima = c0; self.limite = limite
    }
}
var copiaAtual: CopiaEmAndamento? = nil

func copiarSelecao(id: Any, prazoMs: Int) {
    guard AXIsProcessTrusted() else {
        responderErro(id, "Sem permissão de Acessibilidade para copiar a seleção.")
        return
    }
    if copiaAtual != nil {
        responderErro(id, "Já há uma cópia em andamento.")
        return
    }
    restaurarPendente()   // colagem anterior ainda pendente: devolve a área do usuário primeiro
    let pb = NSPasteboard.general
    let original = salvarAreaDeTransferencia(pb)
    _ = pb.prepareForNewContents(with: .currentHostOnly)
    let c0 = pb.changeCount
    let cop = CopiaEmAndamento(id: id, original: original, c0: c0,
                               limite: .now() + .milliseconds(max(50, min(prazoMs, 1000))))
    copiaAtual = cop
    simularCmd(codigoDaTecla("c") ?? CGKeyCode(kVKC), marcar: true)
    verificarCopia(cop)
}

/// A cada 15 ms olha se o app copiou; sem dormir (a main segue livre).
func verificarCopia(_ cop: CopiaEmAndamento) {
    guard copiaAtual === cop else { return }
    let pb = NSPasteboard.general
    var texto: String? = nil
    if pb.changeCount != cop.c0 {
        cop.ultima = pb.changeCount
        texto = pb.string(forType: .string)
    }
    if texto != nil || DispatchTime.now() >= cop.limite {
        finalizarCopia(cop, texto)
        return
    }
    // Mudou mas ainda sem texto (o app limpou e vai gravar): continua olhando até o prazo.
    DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(15)) { verificarCopia(cop) }
}

/// Devolve a área do usuário (se ninguém mexeu depois) e responde ao `copiar_selecao`.
func finalizarCopia(_ cop: CopiaEmAndamento, _ texto: String?) {
    guard copiaAtual === cop else { return }
    copiaAtual = nil
    let pb = NSPasteboard.general
    // Se o usuário copiou outra coisa no meio, não pisa nela.
    if pb.changeCount == cop.c0 || pb.changeCount == cop.ultima {
        restaurarAreaDeTransferencia(pb, cop.original)
    }
    let vazio = texto?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true
    responderOk(cop.id, ["texto": vazio ? NSNull() : (texto as Any)])
}

/// Termina uma cópia em andamento sem texto (chegou um `colar`, ou o auxiliar vai sair).
func encerrarCopia() {
    if let cop = copiaAtual { finalizarCopia(cop, nil) }
}

// MARK: - Comandos

func tratarLinha(_ linha: String) {
    guard let dados = linha.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: dados),
          let msg = obj as? [String: Any]
    else {
        emitir(["id": NSNull(), "ok": false, "erro": "JSON inválido."])
        return
    }
    let id: Any = msg["id"] ?? NSNull()
    guard let cmd = msg["cmd"] as? String else {
        responderErro(id, "Comando ausente.")
        return
    }

    switch cmd {
    case "permissoes":
        let pedir = (msg["pedir"] as? Bool) ?? false
        let confiavel: Bool
        if pedir {
            let chave = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
            confiavel = AXIsProcessTrustedWithOptions([chave: true] as CFDictionary)
        } else {
            confiavel = AXIsProcessTrustedWithOptions(nil)
        }
        responderOk(id, ["acessibilidade": confiavel])

    case "iniciar_teclado":
        if iniciarTeclado() {
            responderOk(id)
        } else {
            responderErro(id, "Sem permissão de Acessibilidade para ler o teclado.")
        }

    case "parar_teclado":
        pararTeclado()
        responderOk(id)

    case "configurar_atalhos":
        let (lista, erro) = interpretarAtalhos(msg["atalhos"])
        if let erro = erro {
            responderErro(id, erro)
        } else {
            trocarAtalhos(lista)
            responderOk(id)
        }

    case "capturar_atalho":
        iniciarCaptura(id: id)

    case "cancelar_captura":
        capturaTerminar(erro: "Captura cancelada.")
        responderOk(id)

    case "contexto":
        let pid = (msg["pid"] as? NSNumber).map { pid_t($0.int32Value) }
        let extras = ExtrasContexto(msg["extras"])
        filaAX.async { responderOk(id, montarContexto(pid: pid, extras: extras)) }

    case "dispositivos_audio":
        filaAX.async { responderOk(id, montarDispositivosAudio()) }

    case "teclados":
        filaAX.async { responderOk(id, ["teclados": listarTeclados()]) }

    case "copiar_selecao":
        let ms = (msg["prazoMs"] as? NSNumber)?.intValue ?? 300
        copiarSelecao(id: id, prazoMs: ms)

    case "ler_campo":
        filaAX.async { responderOk(id, montarLerCampo()) }

    case "mutar_saida":
        mutarSaida(id: id)

    case "desmutar_saida":
        desfazerMute()
        responderOk(id)

    case "colar":
        guard let texto = msg["texto"] as? String else {
            responderErro(id, "Campo 'texto' ausente.")
            return
        }
        colar(id: id, texto: texto, html: msg["html"] as? String)

    case "apertar_enter":
        guard AXIsProcessTrusted() else {
            responderErro(id, "Sem permissão de Acessibilidade para apertar Enter.")
            return
        }
        apertarEnter()
        responderOk(id)

    case "sair":
        // Deixa terminar consultas de Acessibilidade já em andamento (respondem antes de sair).
        filaAX.async { DispatchQueue.main.async { responderOk(id); encerrar() } }

    default:
        responderErro(id, "Comando desconhecido: \(cmd)")
    }
}

// MARK: - Início

// Sem isso, escrever num pipe fechado derrubaria o processo com SIGPIPE.
signal(SIGPIPE, SIG_IGN)

// Sem ícone no Dock e sem roubar foco.
let app = NSApplication.shared
app.setActivationPolicy(.prohibited)

emitir(["evento": "pronto", "versao": 4])

// Leitura do stdin em background; cada comando é tratado na main queue.
let threadStdin = Thread {
    while let linha = readLine(strippingNewline: true) {
        let limpa = linha.trimmingCharacters(in: .whitespaces)
        if limpa.isEmpty { continue }
        DispatchQueue.main.async { tratarLinha(limpa) }
    }
    // EOF: o app morreu. Encerra (via main, depois dos comandos já enfileirados).
    // (main -> filaAX -> main: passa depois dos comandos já enfileirados e das consultas AX pendentes.)
    DispatchQueue.main.async { filaAX.async { DispatchQueue.main.async { encerrar() } } }
}
threadStdin.start()

app.run()
