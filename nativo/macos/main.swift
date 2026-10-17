// FalaAi — auxiliar nativo do macOS.
//
// O app Electron inicia este binário como processo filho e conversa por JSON,
// uma mensagem por linha (stdin = comandos, stdout = respostas e eventos).
// Veja nativo/macos/README.md para o protocolo completo.
//
// Regras importantes:
//  - Nada além de JSON pode ir para o stdout. Logs de depuração vão para stderr.
//  - Todo o estado mutável é tocado só na thread principal (main queue).
//  - A leitura do stdin roda numa thread de background e despacha para a main.

import Cocoa
import ApplicationServices
import Carbon.HIToolbox

// MARK: - Saída (stdout)

/// Trava para que duas linhas JSON nunca se misturem.
private let travaSaida = NSLock()

/// Serializa o dicionário em uma linha JSON e grava no stdout.
func emitir(_ dict: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(dict),
          let dados = try? JSONSerialization.data(withJSONObject: dict, options: [.withoutEscapingSlashes])
    else {
        log("emitir: objeto não serializável")
        return
    }
    var linha = dados
    linha.append(0x0A) // "\n"
    travaSaida.lock()
    defer { travaSaida.unlock() }
    // try? evita exceção se o pipe fechou (o app morreu).
    try? FileHandle.standardOutput.write(contentsOf: linha)
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

// MARK: - Teclado (CGEventTap)

private let kVKFunction: Int64 = 63   // kVK_Function
private let kVKEscape: Int64 = 53     // kVK_Escape
private let kVKV: Int64 = 9           // kVK_ANSI_V

/// Estado do tap (somente main thread).
var tap: CFMachPort? = nil
var fonteDoTap: CFRunLoopSource? = nil
var fnPressionada = false
var fnCombinadoEmitido = false

/// Callback do tap. Roda na main (o source está no run loop principal).
let callbackTeclado: CGEventTapCallBack = { _, tipo, evento, _ in
    switch tipo {
    case .tapDisabledByTimeout, .tapDisabledByUserInput:
        // O sistema desligou o tap: reativa.
        if let t = tap { CGEvent.tapEnable(tap: t, enable: true) }
        log("tap reativado")

    case .flagsChanged:
        // Só a tecla Function (keycode 63) conta; outros eventos também
        // carregam o flag SecondaryFn (setas, teclas F) e seriam falsos positivos.
        let codigo = evento.getIntegerValueField(.keyboardEventKeycode)
        if codigo == kVKFunction {
            let agora = evento.flags.contains(.maskSecondaryFn)
            if agora != fnPressionada {
                fnPressionada = agora
                if agora { fnCombinadoEmitido = false }
                emitir(["evento": "fn", "estado": agora ? "desce" : "sobe"])
            }
        }

    case .keyDown:
        let codigo = evento.getIntegerValueField(.keyboardEventKeycode)
        let repeticao = evento.getIntegerValueField(.keyboardEventAutorepeat) != 0

        // Fn usada como modificador (Fn+Delete, Fn+F5...). Uma vez por pressionamento.
        if fnPressionada && !fnCombinadoEmitido {
            fnCombinadoEmitido = true
            emitir(["evento": "fn_combinado"])
        }

        if !repeticao {
            if codigo == kVKEscape {
                emitir(["evento": "esc"])
            } else if codigo == kVKV {
                let f = evento.flags
                if f.contains(.maskControl) && f.contains(.maskCommand)
                    && !f.contains(.maskAlternate) && !f.contains(.maskShift) {
                    emitir(["evento": "colar_ultima"])
                }
            }
        }

    default:
        break
    }
    // Tap listenOnly: o evento segue inalterado.
    return Unmanaged.passUnretained(evento)
}

/// Cria o tap. Retorna false se falhar (sem permissão).
func iniciarTeclado() -> Bool {
    if tap != nil { return true } // idempotente
    let mascara: CGEventMask = (1 << CGEventType.flagsChanged.rawValue)
                             | (1 << CGEventType.keyDown.rawValue)
    guard let novo = CGEvent.tapCreate(
        tap: .cgSessionEventTap,
        place: .headInsertEventTap,
        options: .listenOnly,
        eventsOfInterest: mascara,
        callback: callbackTeclado,
        userInfo: nil
    ) else { return false }
    let fonte = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, novo, 0)
    CFRunLoopAddSource(CFRunLoopGetMain(), fonte, .commonModes)
    CGEvent.tapEnable(tap: novo, enable: true)
    tap = novo
    fonteDoTap = fonte
    fnPressionada = false
    fnCombinadoEmitido = false
    return true
}

func pararTeclado() {
    if let t = tap {
        CGEvent.tapEnable(tap: t, enable: false)
        CFMachPortInvalidate(t)
    }
    if let f = fonteDoTap { CFRunLoopRemoveSource(CFRunLoopGetMain(), f, .commonModes) }
    tap = nil
    fonteDoTap = nil
    fnPressionada = false
    fnCombinadoEmitido = false
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
/// (senão a área de transferência do usuário ficaria com o texto colado).
func encerrar() -> Never {
    restaurarPendente()
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

    case "colar":
        guard let texto = msg["texto"] as? String else {
            responderErro(id, "Campo 'texto' ausente.")
            return
        }
        colar(id: id, texto: texto)

    case "sair":
        responderOk(id)
        encerrar()

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

emitir(["evento": "pronto", "versao": 1])

// Leitura do stdin em background; cada comando é tratado na main queue.
let threadStdin = Thread {
    while let linha = readLine(strippingNewline: true) {
        let limpa = linha.trimmingCharacters(in: .whitespaces)
        if limpa.isEmpty { continue }
        DispatchQueue.main.async { tratarLinha(limpa) }
    }
    // EOF: o app morreu. Encerra (via main, depois dos comandos já enfileirados).
    DispatchQueue.main.async { encerrar() }
}
threadStdin.start()

app.run()
