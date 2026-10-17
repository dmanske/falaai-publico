// Área de transferência + colar (Ctrl+V via SendInput), com restauração do conteúdo do usuário.

use super::teclado::{enviar_teclas, injetar_tecla_neutra, modificadores_pressionados};
use super::{Estado, ESTADO};
use crate::teclas::*;
use std::time::Duration;
use windows::core::w;
use windows::Win32::Foundation::{GlobalFree, HANDLE, HGLOBAL, HWND};
use windows::Win32::System::DataExchange::*;
use windows::Win32::System::Memory::*;
use windows::Win32::UI::WindowsAndMessaging::{KillTimer, SetTimer};

/// Identificador do temporizador de restauração (WM_TIMER na thread principal).
pub const ID_TEMPORIZADOR: usize = 0xFA1A;
const ESPERA_RESTAURAR_MS: u32 = 450;
const CF_UNICODETEXT: u32 = 13;
/// Limites ao copiar o conteúdo original: acima disso o formato é ignorado (e a restauração perde-o).
const MAX_BYTES_POR_FORMATO: usize = 64 * 1024 * 1024;
const MAX_BYTES_TOTAL: usize = 192 * 1024 * 1024;

#[derive(Clone)]
struct Item {
    formato: u32,
    dados: Vec<u8>,
}

struct Pendente {
    /// O que o USUÁRIO tinha na área de transferência.
    original: Vec<Item>,
    /// GetClipboardSequenceNumber logo depois de gravarmos o nosso texto.
    contagem: u32,
}

#[derive(Default)]
pub struct Area {
    pendente: Option<Pendente>,
}

/// Abre a área de transferência (tenta por ~200 ms: outro programa pode estar com ela aberta).
fn abrir(dono: HWND) -> Result<(), String> {
    for _ in 0..20 {
        if unsafe { OpenClipboard(Some(dono)) }.is_ok() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(10));
    }
    Err("Não foi possível acessar a área de transferência (outro programa está usando).".into())
}

fn fechar() {
    unsafe {
        let _ = CloseClipboard();
    }
}

/// Formatos cujo dado é um HGLOBAL comum e podem ser copiados byte a byte. Ficam de fora os que são
/// alças de GDI (bitmap, paleta, metafile — o Windows gera de novo a partir do DIB) e os de uso
/// privado/exibição.
fn formato_copiavel(f: u32) -> bool {
    !matches!(f, 2 | 3 | 9 | 14) && !(0x80..=0x8E).contains(&f) && !(0x200..=0x3FF).contains(&f)
}

/// Lê os bytes de um HGLOBAL.
unsafe fn ler_global(h: HGLOBAL) -> Option<Vec<u8>> {
    let tam = GlobalSize(h);
    if tam == 0 || tam > MAX_BYTES_POR_FORMATO {
        return None;
    }
    let p = GlobalLock(h) as *const u8;
    if p.is_null() {
        return None;
    }
    let dados = std::slice::from_raw_parts(p, tam).to_vec();
    let _ = GlobalUnlock(h);
    Some(dados)
}

/// Cria um HGLOBAL com os bytes dados.
unsafe fn criar_global(dados: &[u8]) -> Option<HGLOBAL> {
    let h = GlobalAlloc(GMEM_MOVEABLE, dados.len().max(1)).ok()?;
    let p = GlobalLock(h) as *mut u8;
    if p.is_null() {
        let _ = GlobalFree(Some(h));
        return None;
    }
    std::ptr::copy_nonoverlapping(dados.as_ptr(), p, dados.len());
    let _ = GlobalUnlock(h);
    Some(h)
}

/// Grava um formato (a área de transferência precisa estar aberta). O Windows assume o HGLOBAL.
unsafe fn gravar_formato(formato: u32, dados: &[u8]) -> bool {
    let Some(h) = criar_global(dados) else { return false };
    if SetClipboardData(formato, Some(HANDLE(h.0))).is_err() {
        let _ = GlobalFree(Some(h));
        return false;
    }
    true
}

/// Copia todos os formatos copiáveis (área de transferência aberta).
fn salvar_tudo() -> Vec<Item> {
    let mut itens = Vec::new();
    let mut total = 0usize;
    let mut f = 0u32;
    loop {
        f = unsafe { EnumClipboardFormats(f) };
        if f == 0 {
            break;
        }
        if !formato_copiavel(f) {
            continue;
        }
        let Ok(h) = (unsafe { GetClipboardData(f) }) else { continue };
        if let Some(dados) = unsafe { ler_global(HGLOBAL(h.0)) } {
            total += dados.len();
            if total > MAX_BYTES_TOTAL {
                break;
            }
            itens.push(Item { formato: f, dados });
        }
    }
    itens
}

/// Marca o conteúdo como "não indexar": o histórico do Windows (Win+V), a nuvem e gerenciadores
/// de área de transferência ignoram o nosso texto temporário.
unsafe fn marcar_como_transitorio() {
    let excluir = RegisterClipboardFormatW(w!("ExcludeClipboardContentFromMonitorProcessing"));
    let historico = RegisterClipboardFormatW(w!("CanIncludeInClipboardHistory"));
    let nuvem = RegisterClipboardFormatW(w!("CanUploadToCloudClipboard"));
    if excluir != 0 {
        gravar_formato(excluir, &[0]);
    }
    if historico != 0 {
        gravar_formato(historico, &0u32.to_le_bytes());
    }
    if nuvem != 0 {
        gravar_formato(nuvem, &0u32.to_le_bytes());
    }
}

/// Texto -> UTF-16 com fim de linha do Windows (CRLF) e terminador nulo, em bytes.
fn texto_para_bytes(texto: &str) -> Vec<u8> {
    let normal = texto.replace("\r\n", "\n").replace('\n', "\r\n");
    let mut bytes = Vec::with_capacity(normal.len() * 2 + 2);
    for u in normal.encode_utf16() {
        bytes.extend_from_slice(&u.to_le_bytes());
    }
    bytes.extend_from_slice(&[0, 0]);
    bytes
}

pub fn colar(e: &mut Estado, texto: &str) -> Result<(), String> {
    let dono = e.janela;
    abrir(dono)?;

    // Duas colagens seguidas: se a anterior ainda não restaurou e ninguém mexeu, o "original"
    // continua sendo o do usuário, não o texto colado.
    let original = match e.area.pendente.take() {
        Some(p) if unsafe { GetClipboardSequenceNumber() } == p.contagem => p.original,
        _ => salvar_tudo(),
    };

    let gravou = unsafe {
        let _ = EmptyClipboard();
        let ok = gravar_formato(CF_UNICODETEXT, &texto_para_bytes(texto));
        if ok {
            marcar_como_transitorio();
        }
        ok
    };
    fechar();
    if !gravou {
        // Não conseguimos gravar o texto: devolve o que o usuário tinha.
        if abrir(dono).is_ok() {
            restaurar_itens(&original);
            fechar();
        }
        return Err("Não foi possível gravar o texto na área de transferência.".into());
    }

    let contagem = unsafe { GetClipboardSequenceNumber() };
    e.area.pendente = Some(Pendente { original, contagem });

    apertar_ctrl_v();

    // Depois de ~450 ms restaura (o tempo de o app colar). O temporizador reinicia a cada colagem.
    unsafe {
        SetTimer(None, ID_TEMPORIZADOR, ESPERA_RESTAURAR_MS, None);
    }
    Ok(())
}

/// Solta os modificadores que o usuário ainda segura (senão viraria Ctrl+Alt+V etc.) e envia Ctrl+V.
fn apertar_ctrl_v() {
    let presos = modificadores_pressionados();
    if presos
        .iter()
        .any(|&vk| familia_do_codigo(vk).is_some_and(|f| f.abre_menu()))
    {
        // Soltar Alt/Win "sozinho" abriria o menu: neutraliza antes.
        injetar_tecla_neutra();
    }
    let mut seq: Vec<(u32, bool)> = presos.iter().map(|&vk| (vk, true)).collect();
    seq.extend([(VK_LCONTROL, false), (0x56, false), (0x56, true), (VK_LCONTROL, true)]);
    enviar_teclas(&seq);
}

fn restaurar_itens(itens: &[Item]) {
    unsafe {
        let _ = EmptyClipboard();
        for i in itens {
            gravar_formato(i.formato, &i.dados);
        }
    }
}

/// Devolve a área de transferência do usuário, se ninguém mexeu nela depois da colagem.
pub fn restaurar_pendente(e: &mut Estado) {
    let Some(p) = e.area.pendente.take() else { return };
    unsafe {
        let _ = KillTimer(None, ID_TEMPORIZADOR);
    }
    if unsafe { GetClipboardSequenceNumber() } != p.contagem {
        return; // o usuário (ou outro programa) copiou algo novo: não mexe
    }
    if abrir(e.janela).is_ok() {
        restaurar_itens(&p.original);
        fechar();
    }
}

/// O temporizador de 450 ms disparou.
pub fn tempo_esgotado() {
    ESTADO.with(|e| {
        if let Ok(mut e) = e.try_borrow_mut() {
            restaurar_pendente(&mut e);
        }
    });
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn fim_de_linha_vira_crlf_e_termina_com_nulo() {
        let b = texto_para_bytes("a\nb\r\nc");
        let u: Vec<u16> = b.chunks(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
        assert_eq!(String::from_utf16_lossy(&u[..u.len() - 1]), "a\r\nb\r\nc");
        assert_eq!(*u.last().unwrap(), 0);
    }
}
