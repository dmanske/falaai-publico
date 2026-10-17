// Saída (stdout): uma linha JSON por mensagem, escrita por uma thread própria.
// Quem emite (inclusive o hook do teclado) nunca espera o pipe do stdout: só enfileira.

use serde_json::Value;
use std::io::Write;
use std::sync::mpsc::{channel, Sender};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

enum Item {
    Linha(String),
    /// Avisa quando tudo o que veio antes já foi escrito.
    Descarregar(Sender<()>),
}

static CANAL: OnceLock<Mutex<Sender<Item>>> = OnceLock::new();

fn canal() -> &'static Mutex<Sender<Item>> {
    CANAL.get_or_init(|| {
        let (tx, rx) = channel::<Item>();
        std::thread::spawn(move || {
            let mut out = std::io::stdout();
            for item in rx {
                match item {
                    Item::Linha(l) => {
                        // Se o pipe fechou (o app morreu), ignora o erro.
                        let _ = out.write_all(l.as_bytes());
                        let _ = out.write_all(b"\n");
                        let _ = out.flush();
                    }
                    Item::Descarregar(ack) => {
                        let _ = ack.send(());
                    }
                }
            }
        });
        Mutex::new(tx)
    })
}

/// Serializa e enfileira uma mensagem no stdout.
pub fn emitir(valor: &Value) {
    if let Ok(tx) = canal().lock() {
        let _ = tx.send(Item::Linha(valor.to_string()));
    }
}

/// Espera (no máximo 1 s) a fila de saída esvaziar. Usado antes de encerrar.
pub fn descarregar() {
    let (ack_tx, ack_rx) = channel();
    if let Ok(tx) = canal().lock() {
        if tx.send(Item::Descarregar(ack_tx)).is_err() {
            return;
        }
    }
    let _ = ack_rx.recv_timeout(Duration::from_secs(1));
}

/// Log de depuração: sempre no stderr.
pub fn log(msg: &str) {
    eprintln!("[auxiliar] {msg}");
}
