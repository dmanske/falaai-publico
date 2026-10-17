// Camada do sistema (só compila no Windows): loop de mensagens, comandos do stdin e estado.
//
// Regra de ouro (igual ao auxiliar do Mac): TODO o estado mutável (teclado, área de transferência,
// som) é tocado só na thread principal. A thread do stdin apenas enfileira as linhas e acorda a
// principal com uma mensagem própria; o hook de teclado roda nessa mesma thread (via GetMessageW).
// As consultas lentas (UI Automation) rodam em threads de trabalho, com prazo.

mod area;
mod audio;
mod contexto;
mod teclado;

use crate::maquina::{Maquina, Saida};
use crate::protocolo::*;
use crate::saida::{descarregar, emitir, log};
use serde_json::{json, Value};
use std::cell::RefCell;
use std::collections::VecDeque;
use std::io::BufRead;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::channel;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use windows::core::w;
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::Threading::GetCurrentThreadId;
use windows::Win32::UI::WindowsAndMessaging::*;

/// Identificador do temporizador da captura de atalho (WM_TIMER na janela invisível).
const ID_TEMPORIZADOR_CAPTURA: usize = 0xFA1B;
/// "Nenhum prazo programado" em `PRAZO_PROGRAMADO`.
const SEM_PRAZO: u64 = u64::MAX;

/// Mensagem própria: "há linhas novas do stdin na fila".
const WM_COMANDOS: u32 = WM_APP + 1;
/// Prazo do comando `contexto` (o protocolo pede ~300 ms).
const PRAZO_CONTEXTO: Duration = Duration::from_millis(300);
/// Prazo do comando `ler_campo`.
const PRAZO_LER_CAMPO: Duration = Duration::from_millis(1500);

enum Entrada {
    Linha(String),
    Eof,
}

/// Fila entre a thread do stdin e a principal.
static FILA: Mutex<VecDeque<Entrada>> = Mutex::new(VecDeque::new());

/// Estado da thread principal.
pub(crate) struct Estado {
    pub maquina: Maquina,
    pub hook: Option<teclado::Gancho>,
    pub area: area::Area,
    pub som: audio::Som,
    /// Janela invisível (só de mensagens): dona da área de transferência.
    pub janela: HWND,
}

/// `id` do comando `capturar_atalho` em andamento (a resposta sai quando a captura termina). Fica fora
/// do `ESTADO` para poder ser lido enquanto o `ESTADO` está emprestado.
static CAPTURA_ID: Mutex<Option<Value>> = Mutex::new(None);

/// Último prazo (em `agora_ms`) programado no temporizador: evita chamar o sistema à toa.
static PRAZO_PROGRAMADO: AtomicU64 = AtomicU64::new(SEM_PRAZO);

static INICIO: OnceLock<Instant> = OnceLock::new();

/// Relógio monotônico em milissegundos, injetado na máquina de atalhos (a lógica pura não tem relógio).
pub(crate) fn agora_ms() -> u64 {
    INICIO.get_or_init(Instant::now).elapsed().as_millis() as u64
}

/// Programa (ou cancela) o temporizador da captura conforme o prazo que a máquina pede.
///
/// Como funciona: a máquina diz quando precisa ser "acordada" (`proximo_prazo`: fim dos 10 s sem
/// tecla, ou fim dos 400 ms de espera pelo 2º toque). Usamos `SetTimer` na janela invisível — o WM_TIMER
/// chega no loop de mensagens da thread principal, a mesma do hook, então não há corrida com o teclado.
/// Chamar depois de qualquer coisa que possa mudar a captura (comando, tecla, WM_TIMER).
pub(crate) fn reprogramar_prazo() {
    let pedido = ESTADO
        .try_with(|e| e.try_borrow().ok().map(|e| (e.maquina.proximo_prazo(), e.janela)))
        .ok()
        .flatten();
    let Some((prazo, janela)) = pedido else { return };
    let novo = prazo.unwrap_or(SEM_PRAZO);
    if PRAZO_PROGRAMADO.swap(novo, Ordering::Relaxed) == novo {
        return;
    }
    unsafe {
        match prazo {
            Some(p) => {
                let espera = p.saturating_sub(agora_ms()).clamp(1, u32::MAX as u64) as u32;
                // Com janela válida o id é respeitado (com janela nula o Windows inventaria outro id).
                SetTimer(Some(janela), ID_TEMPORIZADOR_CAPTURA, espera, None);
            }
            None => {
                let _ = KillTimer(Some(janela), ID_TEMPORIZADOR_CAPTURA);
            }
        }
    }
}

/// O WM_TIMER da captura disparou: avisa a máquina que o tempo passou.
fn tempo_captura() {
    // SetTimer repete sozinho: desliga e deixa `reprogramar_prazo` armar de novo se ainda precisar.
    if let Ok(janela) = ESTADO.try_with(|e| e.try_borrow().map(|e| e.janela).unwrap_or_default()) {
        unsafe {
            let _ = KillTimer(Some(janela), ID_TEMPORIZADOR_CAPTURA);
        }
    }
    PRAZO_PROGRAMADO.store(SEM_PRAZO, Ordering::Relaxed);
    let saidas = ESTADO
        .try_with(|e| e.try_borrow_mut().ok().map(|mut e| e.maquina.tempo(agora_ms())))
        .ok()
        .flatten()
        .unwrap_or_default();
    emitir_saidas(saidas);
    reprogramar_prazo();
}

thread_local! {
    pub(crate) static ESTADO: RefCell<Estado> = RefCell::new(Estado {
        maquina: Maquina::novo(),
        hook: None,
        area: area::Area::default(),
        som: audio::Som::default(),
        janela: HWND::default(),
    });
}

/// Emite as saídas da máquina de estados como eventos do protocolo.
pub(crate) fn emitir_saidas(saidas: Vec<Saida>) {
    for s in saidas {
        match s {
            Saida::Atalho { id, desce } => emitir(&evento_atalho(&id, desce)),
            Saida::Combinado => emitir(&json!({ "evento": "combinado" })),
            Saida::Esc => emitir(&json!({ "evento": "esc" })),
            // Fim da captura: responde ao `capturar_atalho` pendente, com o mesmo `id`.
            Saida::Captura(resultado) => {
                let id = CAPTURA_ID.lock().ok().and_then(|mut i| i.take());
                if let Some(id) = id {
                    match resultado {
                        Ok(teclas) => emitir(&resposta_ok(&id, json!({ "teclas": teclas }))),
                        Err(erro) => emitir(&resposta_erro(&id, &erro)),
                    }
                }
            }
        }
    }
}

unsafe extern "system" fn proc_janela(hwnd: HWND, msg: u32, w: WPARAM, l: LPARAM) -> LRESULT {
    DefWindowProcW(hwnd, msg, w, l)
}

/// Cria a janela invisível que serve de dona da área de transferência
/// (com dono nulo, o SetClipboardData falha depois do EmptyClipboard).
fn criar_janela() -> HWND {
    unsafe {
        let hinst = GetModuleHandleW(None).map(|h| h.into()).unwrap_or_default();
        let classe = WNDCLASSW {
            lpfnWndProc: Some(proc_janela),
            hInstance: hinst,
            lpszClassName: w!("FalaAiAuxiliar"),
            ..Default::default()
        };
        RegisterClassW(&classe);
        CreateWindowExW(
            WINDOW_EX_STYLE(0),
            w!("FalaAiAuxiliar"),
            w!("FalaAi auxiliar"),
            WINDOW_STYLE(0),
            0,
            0,
            0,
            0,
            Some(HWND_MESSAGE),
            None,
            Some(hinst),
            None,
        )
        .unwrap_or_default()
    }
}

/// Thread que lê o stdin: enfileira cada linha e acorda a thread principal.
fn ler_stdin(thread_principal: u32) {
    let mut entrada = std::io::stdin().lock();
    let mut buf = Vec::new();
    loop {
        buf.clear();
        match entrada.read_until(b'\n', &mut buf) {
            Ok(0) | Err(_) => break,
            Ok(_) => {
                let linha = String::from_utf8_lossy(&buf).trim().to_string();
                if linha.is_empty() {
                    continue;
                }
                if let Ok(mut f) = FILA.lock() {
                    f.push_back(Entrada::Linha(linha));
                }
                acordar(thread_principal);
            }
        }
    }
    if let Ok(mut f) = FILA.lock() {
        f.push_back(Entrada::Eof);
    }
    acordar(thread_principal);
}

fn acordar(thread_principal: u32) {
    unsafe {
        let _ = PostThreadMessageW(thread_principal, WM_COMANDOS, WPARAM(0), LPARAM(0));
    }
}

/// Encerra o processo executando antes as restaurações pendentes (área de transferência e som).
fn encerrar() -> ! {
    ESTADO.with(|e| {
        let mut e = e.borrow_mut();
        let saidas = e.maquina.soltar_ativos();
        emitir_saidas(saidas);
        teclado::desinstalar(&mut e);
        area::restaurar_pendente(&mut e);
        audio::desfazer(&mut e.som);
    });
    descarregar();
    std::process::exit(0);
}

pub fn executar() {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }
    let janela = criar_janela();
    ESTADO.with(|e| e.borrow_mut().janela = janela);

    // Cria a fila de mensagens da thread antes de a thread do stdin tentar postar nela.
    let mut msg = MSG::default();
    unsafe {
        let _ = PeekMessageW(&mut msg, None, WM_USER, WM_USER, PM_NOREMOVE);
    }
    let tid = unsafe { GetCurrentThreadId() };

    emitir(&evento_pronto());
    std::thread::spawn(move || ler_stdin(tid));

    loop {
        let r = unsafe { GetMessageW(&mut msg, None, 0, 0) };
        if r.0 <= 0 {
            break; // WM_QUIT ou erro
        }
        if msg.message == WM_COMANDOS {
            processar_fila();
        } else if msg.message == WM_TIMER && msg.wParam.0 == area::ID_TEMPORIZADOR {
            area::tempo_esgotado();
        } else if msg.message == WM_TIMER && msg.wParam.0 == ID_TEMPORIZADOR_CAPTURA {
            tempo_captura();
        } else {
            unsafe {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        }
    }
    encerrar();
}

fn processar_fila() {
    loop {
        let item = FILA.lock().ok().and_then(|mut f| f.pop_front());
        match item {
            None => return,
            // O app morreu (ou fechou o stdin): restaura pendências e encerra.
            Some(Entrada::Eof) => encerrar(),
            Some(Entrada::Linha(l)) => tratar_linha(&l),
        }
    }
}

fn responder_ok(id: &Value, extra: Value) {
    emitir(&resposta_ok(id, extra));
}

fn responder_erro(id: &Value, erro: &str) {
    emitir(&resposta_erro(id, erro));
}

fn tratar_linha(linha: &str) {
    let (id, comando) = match interpretar(linha) {
        Ok(v) => v,
        Err((id, erro)) => {
            responder_erro(&id, &erro);
            return;
        }
    };
    match comando {
        // No Windows não existe permissão de Acessibilidade para o hook de teclado.
        Comando::Permissoes { .. } => responder_ok(&id, json!({ "acessibilidade": true })),
        Comando::IniciarTeclado => {
            let r = ESTADO.with(|e| teclado::instalar(&mut e.borrow_mut()));
            match r {
                Ok(()) => responder_ok(&id, json!({})),
                Err(e) => responder_erro(&id, &e),
            }
        }
        Comando::PararTeclado => {
            let saidas = ESTADO.with(|e| {
                let mut e = e.borrow_mut();
                // Uma captura em andamento termina com erro (o teclado vai parar de ser lido).
                let mut saidas = e.maquina.soltar_ativos();
                saidas.extend(e.maquina.cancelar_captura());
                teclado::desinstalar(&mut e);
                saidas
            });
            emitir_saidas(saidas);
            reprogramar_prazo();
            responder_ok(&id, json!({}));
        }
        Comando::ConfigurarAtalhos(lista) => {
            ESTADO.with(|e| {
                let saidas = e.borrow_mut().maquina.trocar_atalhos(lista);
                emitir_saidas(saidas);
            });
            responder_ok(&id, json!({}));
        }
        Comando::Colar(texto) => {
            let r = ESTADO.with(|e| area::colar(&mut e.borrow_mut(), &texto));
            match r {
                Ok(()) => responder_ok(&id, json!({})),
                Err(e) => responder_erro(&id, &e),
            }
        }
        Comando::Contexto => {
            let app = contexto::app_em_foco();
            std::thread::spawn(move || {
                let campo = com_prazo(PRAZO_CONTEXTO, contexto::campo_em_foco).flatten();
                responder_ok(
                    &id,
                    json!({
                        "app": app.as_ref().map(|a| a.como_json()),
                        // URL do navegador: não implementado no Windows (ver README).
                        "navegador": Value::Null,
                        "campo": campo,
                    }),
                );
            });
        }
        Comando::LerCampo => {
            let app = contexto::app_em_foco();
            std::thread::spawn(move || {
                let texto = com_prazo(PRAZO_LER_CAMPO, contexto::ler_campo).flatten();
                responder_ok(
                    &id,
                    json!({
                        "texto": texto,
                        "appId": app.as_ref().map(|a| a.app_id.clone()),
                    }),
                );
            });
        }
        Comando::MutarSaida => {
            let r = ESTADO.with(|e| audio::mutar(&mut e.borrow_mut().som));
            match r {
                Ok(ja_estava_mudo) => responder_ok(&id, json!({ "jaEstavaMudo": ja_estava_mudo })),
                Err(e) => responder_erro(&id, &e),
            }
        }
        Comando::DesmutarSaida => {
            ESTADO.with(|e| audio::desfazer(&mut e.borrow_mut().som));
            responder_ok(&id, json!({}));
        }
        Comando::CapturarAtalho => {
            let r = ESTADO.with(|e| {
                let mut e = e.borrow_mut();
                if e.hook.is_none() {
                    return Err("O teclado não está ativo.".to_string());
                }
                e.maquina.iniciar_captura(agora_ms()).map_err(|m| m.to_string())
            });
            match r {
                Ok(saidas) => {
                    // Guarda o id ANTES de emitir: a resposta sai quando a captura terminar.
                    if let Ok(mut i) = CAPTURA_ID.lock() {
                        *i = Some(id);
                    }
                    emitir_saidas(saidas);
                    reprogramar_prazo();
                }
                Err(e) => responder_erro(&id, &e),
            }
        }
        Comando::CancelarCaptura => {
            let saidas = ESTADO.with(|e| e.borrow_mut().maquina.cancelar_captura());
            emitir_saidas(saidas); // a resposta da captura (ok:false) sai antes da deste comando
            reprogramar_prazo();
            responder_ok(&id, json!({}));
        }
        Comando::Sair => {
            responder_ok(&id, json!({}));
            encerrar();
        }
    }
}

/// Roda `f` numa thread própria (com COM iniciado) e espera no máximo `prazo`.
/// Estourou o prazo: devolve None e a thread termina sozinha depois.
fn com_prazo<T: Send + 'static>(prazo: Duration, f: fn() -> T) -> Option<T> {
    let (tx, rx) = channel();
    std::thread::spawn(move || {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
        let _ = tx.send(f());
    });
    match rx.recv_timeout(prazo) {
        Ok(v) => Some(v),
        Err(_) => {
            log("consulta de acessibilidade estourou o prazo");
            None
        }
    }
}
