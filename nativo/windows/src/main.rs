// FalaAi — auxiliar nativo do Windows (protocolo v3: docs/design/PROTOCOLO_AUXILIAR.md).
//
// O app Electron inicia este programa como processo filho e conversa por JSON, uma mensagem
// por linha (stdin = comandos; stdout = respostas e eventos; logs só no stderr).
//
// Organização:
//  - teclas.rs / maquina.rs / protocolo.rs / saida.rs: lógica PURA (roda e é testada em qualquer sistema);
//  - sistema/: a camada que fala com a API do Windows (só compila no Windows).
//
// Subsistema "windows" (sem console): o app não abre janela de terminal ao iniciar o auxiliar.
#![cfg_attr(windows, windows_subsystem = "windows")]
// Fora do Windows (testes no Mac) boa parte do código pronto para o sistema fica sem uso.
#![cfg_attr(not(windows), allow(dead_code))]

mod maquina;
mod protocolo;
mod saida;
#[cfg(windows)]
mod sistema;
mod teclas;

fn main() {
    #[cfg(windows)]
    sistema::executar();

    #[cfg(not(windows))]
    {
        eprintln!("[auxiliar] Este programa só funciona no Windows.");
        std::process::exit(1);
    }
}
