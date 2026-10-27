// Diagnóstico da janela da pílula do FalaAi pelo WindowServer: está na tela? Em qual mesa (Space)?
// Uso: swift scripts/diagnostico/pilula-mesas.swift            (uma leitura)
//      swift scripts/diagnostico/pilula-mesas.swift 60         (vigia 60 s e imprime cada mudança)
// Só lê: usa as funções privadas do SkyLight (SLSCopySpacesForWindows…) e a Acessibilidade.
// Desde a 1.1.2 a pílula fica sempre na tela (1×1 px sem ditado): saudável = naTela=true e a mesa ativa em "mesas".
// Na 1.1.1 ela era escondida entre ditados; o defeito era aparecer com orderedIn=1 e mesas=[]
// (docs/correcoes/CORRECAO_PILULA_SEM_MESA_2026-10-27.md).
import ApplicationServices
import CoreGraphics
import Foundation

let sl = dlopen("/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight", RTLD_NOW)
typealias FConexao = @convention(c) () -> Int32
typealias FMesas = @convention(c) (Int32, Int32, CFArray) -> Unmanaged<CFArray>?
typealias FNaFrente = @convention(c) (Int32, UInt32, UnsafeMutablePointer<UInt8>) -> Int32
typealias FMesaAtiva = @convention(c) (Int32) -> UInt64
let conexao = unsafeBitCast(dlsym(sl, "SLSMainConnectionID"), to: FConexao.self)()
let mesasDaJanela = unsafeBitCast(dlsym(sl, "SLSCopySpacesForWindows"), to: FMesas.self)
let ordenadaNaTela = dlsym(sl, "SLSWindowIsOrderedIn").map { unsafeBitCast($0, to: FNaFrente.self) }
let mesaAtiva = unsafeBitCast(dlsym(sl, "SLSGetActiveSpace"), to: FMesaAtiva.self)

func agora() -> String {
  let f = DateFormatter()
  f.dateFormat = "HH:mm:ss.SSS"
  return f.string(from: Date())
}

/** Janela "Pílula" do FalaAi (a lista inclui as escondidas). */
func acharPilula() -> [String: Any]? {
  let todas = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] ?? []
  return todas.first { ($0[kCGWindowOwnerName as String] as? String) == "FalaAi" && ($0[kCGWindowName as String] as? String) == "Pílula" }
}

func leitura() -> String {
  guard let p = acharPilula() else { return "FalaAi aberto? janela \"Pílula\" não encontrada" }
  let id = UInt32(p[kCGWindowNumber as String] as? Int ?? 0)
  let pid = Int32(p[kCGWindowOwnerPID as String] as? Int ?? 0)
  let naTela = p[kCGWindowIsOnscreen as String] as? Bool ?? false
  let b = CGRect(dictionaryRepresentation: p[kCGWindowBounds as String] as! CFDictionary) ?? .zero
  var ordenada: UInt8 = 9
  _ = ordenadaNaTela?(conexao, id, &ordenada)
  let mesas = mesasDaJanela(conexao, 7, [id] as CFArray)?.takeRetainedValue() as? [UInt64] ?? []
  let ativa = mesaAtiva(conexao)
  // Acessibilidade: o macOS só lista as janelas que considera visíveis.
  var v: CFTypeRef?
  AXUIElementCopyAttributeValue(AXUIElementCreateApplication(pid), kAXWindowsAttribute as CFString, &v)
  let ax = ((v as? [AXUIElement]) ?? []).map { j -> String in
    var t: CFTypeRef?
    AXUIElementCopyAttributeValue(j, kAXTitleAttribute as CFString, &t)
    return t as? String ?? "?"
  }
  let saude = naTela && mesas.contains(ativa) ? "OK" : "PROBLEMA"
  return "\(saude) id=\(id) naTela=\(naTela) orderedIn=\(ordenada) mesas=\(mesas) mesaAtiva=\(ativa) AX=\(ax) "
    + "janela=\(Int(b.minX)),\(Int(b.minY)) \(Int(b.width))x\(Int(b.height))"
}

let segundos = CommandLine.arguments.count > 1 ? Double(CommandLine.arguments[1]) ?? 0 : 0
var ultima = leitura()
print("\(agora()) \(ultima)")
let fim = Date().addingTimeInterval(segundos)
while Date() < fim {
  usleep(30_000)
  let l = leitura()
  if l != ultima {
    print("\(agora()) \(l)")
    fflush(stdout)
    ultima = l
  }
}
