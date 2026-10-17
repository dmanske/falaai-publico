// FalaAi — auxiliar nativo do macOS.
//
// O app Electron inicia este binário como processo filho e conversa por JSON,
// uma mensagem por linha (stdin = comandos, stdout = respostas e eventos).
// Protocolo v3: veja docs/design/PROTOCOLO_AUXILIAR.md e nativo/macos/README.md.
//
// Regras importantes:
//  - Nada além de JSON pode ir para o stdout. Logs de depuração vão para stderr.
//  - Todo o estado mutável é tocado só na thread principal (main queue).
//  - A leitura do stdin roda numa thread de background e despacha para a main.
//  - O callback do tap de teclado roda na main e NUNCA pode bloquear: só mexe em
//    memória e enfileira a escrita no stdout (fila serial própria).
//  - Consultas de Acessibilidade lentas (contexto, ler_campo) rodam numa fila de
//    background, para não atrasar o teclado do usuário.

import Cocoa
import ApplicationServices
import Carbon.HIToolbox
import CoreAudio

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

/// Elemento em foco (systemWide primeiro; cai para o app em foco).
func campoEmFoco(_ axApp: AXUIElement?) -> AXUIElement? {
    let sistema = AXUIElementCreateSystemWide()
    AXUIElementSetMessagingTimeout(sistema, timeoutAX)
    if let e = axElemento(sistema, kAXFocusedUIElementAttribute) { return e }
    if let a = axApp { return axElemento(a, kAXFocusedUIElementAttribute) }
    return nil
}

/// Procura (em largura, com limites) um AXWebArea na janela e devolve (url, título).
func acharWebArea(_ janela: AXUIElement, ate limite: Date) -> (url: String?, titulo: String?)? {
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
            if url != nil { return (url, axTexto(el, kAXTitleAttribute)) }
        }
        if prof < 8, let filhos = axAttr(el, kAXChildrenAttribute) as? [AXUIElement] {
            for f in filhos.prefix(60) { fila.append((f, prof + 1)) }
        }
    }
    return nil
}

func montarContexto() -> [String: Any] {
    let limite = Date().addingTimeInterval(prazoContexto)
    let confiavel = AXIsProcessTrusted()
    var app: Any = NSNull()
    var navegador: Any = NSNull()
    var campo: Any = NSNull()

    guard let front = NSWorkspace.shared.frontmostApplication else {
        return ["app": app, "navegador": navegador, "campo": campo]
    }
    let appId = front.bundleIdentifier
    var janelaTitulo: String? = nil
    var appInfo: [String: Any] = ["nome": ou(front.localizedName), "appId": ou(appId), "janela": NSNull()]

    if confiavel {
        let axApp = AXUIElementCreateApplication(front.processIdentifier)
        AXUIElementSetMessagingTimeout(axApp, timeoutAX)

        // Campo em foco.
        if Date() < limite, let el = campoEmFoco(axApp) {
            AXUIElementSetMessagingTimeout(el, timeoutAX)
            let papel = axTexto(el, kAXRoleAttribute)
            if ehSenha(el) {
                campo = ["papel": ou(papel), "placeholder": NSNull(), "antes": "", "depois": "", "selecionado": ""] as [String: Any]
            } else {
                let valor = axAttr(el, kAXValueAttribute) as? String
                let intervalo = axIntervalo(el, kAXSelectedTextRangeAttribute)
                let ehTexto = (papel.map { papeisDeTexto.contains($0) } ?? false) || (valor != nil && intervalo != nil)
                if ehTexto {
                    var antes = "", depois = "", selecionado = axTexto(el, kAXSelectedTextAttribute) ?? ""
                    if let v = valor {
                        let ns = v as NSString
                        let loc = max(0, min(intervalo?.location ?? ns.length, ns.length))
                        let tam = max(0, min(intervalo?.length ?? 0, ns.length - loc))
                        antes = recortar(ns, loc - maxAntes, loc)
                        depois = recortar(ns, loc + tam, loc + tam + maxDepois)
                        if selecionado.isEmpty && tam > 0 { selecionado = recortar(ns, loc, loc + min(tam, maxCampo)) }
                    }
                    campo = ["papel": ou(papel), "placeholder": ou(axTexto(el, kAXPlaceholderValueAttribute)),
                             "antes": antes, "depois": depois, "selecionado": selecionado] as [String: Any]
                }
            }
        }

        // Janela em foco e URL do navegador.
        if Date() < limite, let janela = axElemento(axApp, kAXFocusedWindowAttribute) {
            AXUIElementSetMessagingTimeout(janela, timeoutAX)
            if let t = axTexto(janela, kAXTitleAttribute), !t.isEmpty { janelaTitulo = t }
            if let id = appId, navegadores.contains(id), let w = acharWebArea(janela, ate: limite) {
                let t = (w.titulo?.isEmpty == false) ? w.titulo : janelaTitulo
                navegador = ["url": ou(w.url), "titulo": ou(t)] as [String: Any]
            }
        }
    }
    appInfo["janela"] = ou(janelaTitulo)
    app = appInfo
    return ["app": app, "navegador": navegador, "campo": campo]
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
    return m
}()
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
        if tecla != nil && mods.isEmpty && !ehTeclaF(tecla!) {
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
private let kVKV: Int64 = 9           // kVK_ANSI_V (usado em simularCmdV)

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
    let repeticao = evento.getIntegerValueField(.keyboardEventAutorepeat) != 0

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
    cap.engolidas.insert(codigo)
    if evento.getIntegerValueField(.keyboardEventAutorepeat) != 0 { return true }
    if nomeDoCodigo(codigo) != nil { capturaApertou(cap, codigo) }   // teclas sem nome são engolidas e ignoradas
    return true
}

func capturaTeclaSobe(_ cap: Captura, _ evento: CGEvent) -> Bool {
    var codigo = evento.getIntegerValueField(.keyboardEventKeycode)
    if codigo == kVKKeypadEnter { codigo = kVKReturn }
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

func restaurarAreaDeTransferencia(_ pb: NSPasteboard, _ salvos: [ItemSalvo]) {
    pb.clearContents()
    if salvos.isEmpty { return }
    let itens: [NSPasteboardItem] = salvos.map { tipos in
        let novo = NSPasteboardItem()
        for (tipo, dados) in tipos { novo.setData(dados, forType: tipo) }
        return novo
    }
    pb.writeObjects(itens)
}

/// Simula Cmd+V (somente Command; não herda Fn nem outros modificadores).
func simularCmdV() {
    let fonte = CGEventSource(stateID: .combinedSessionState)
    let tecla = CGKeyCode(kVKV)
    for descendo in [true, false] {
        guard let e = CGEvent(keyboardEventSource: fonte, virtualKey: tecla, keyDown: descendo) else { continue }
        e.flags = .maskCommand
        e.post(tap: .cghidEventTap)
    }
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
    restaurarPendente()
    desfazerMute()
    descarregarSaida()
    exit(0)
}

func colar(id: Any, texto: String) {
    guard AXIsProcessTrusted() else {
        responderErro(id, "Sem permissão de Acessibilidade para colar.")
        return
    }
    let pb = NSPasteboard.general
    // Duas colagens seguidas (ex.: ditado e logo depois Ctrl+Cmd+V): se a anterior ainda não
    // restaurou e ninguém mexeu, o "original" continua sendo o do usuário, não o texto colado.
    let original: [ItemSalvo]
    if let p = colagemPendente, pb.changeCount == p.contagem {
        original = p.original
    } else {
        original = salvarAreaDeTransferencia(pb)
    }

    pb.clearContents()
    pb.setString(texto, forType: .string)
    // Marca como transitório para gerenciadores de área de transferência ignorarem.
    pb.setData(Data(), forType: NSPasteboard.PasteboardType("org.nspasteboard.TransientType"))
    let contagem = pb.changeCount
    colagemPendente = ColagemPendente(original: original, contagem: contagem)

    simularCmdV()
    responderOk(id)

    // Depois de ~450 ms restaura — só se esta ainda for a colagem mais recente.
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
        if colagemPendente?.contagem == contagem { restaurarPendente() }
    }
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
        filaAX.async { responderOk(id, montarContexto()) }

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
        colar(id: id, texto: texto)

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

emitir(["evento": "pronto", "versao": 3])

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
