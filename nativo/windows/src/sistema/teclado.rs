// Hook global de teclado (WH_KEYBOARD_LL) e injeção de teclas (SendInput).

use super::{agora_ms, emitir_saidas, reprogramar_prazo, Estado, ESTADO};
use crate::teclas::{ctrl_falso_altgr, MODIFICADORES};
use crate::teclas::{VK_LWIN, VK_RCONTROL, VK_RMENU, VK_RWIN};
use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_EXTENDEDKEY,
    KEYEVENTF_KEYUP, VIRTUAL_KEY,
};
use windows::Win32::UI::WindowsAndMessaging::*;

/// Marca (dwExtraInfo) nas teclas que NÓS injetamos: o hook as ignora.
pub const MARCA: usize = 0x4641_4C41; // "FALA"

/// Tecla "neutra" (não atribuída): digitada entre o Alt/Win descer e subir, cancela a barra de menu
/// / o menu Iniciar.
const VK_NEUTRA: u16 = 0xE8;

/// VK_BACK.
const VK_BACKSPACE: u32 = 0x08;
/// VK_RETURN.
const VK_ENTER: u32 = 0x0D;

pub struct Gancho(HHOOK);

pub fn instalar(e: &mut Estado) -> Result<(), String> {
    if e.hook.is_some() {
        return Ok(()); // idempotente
    }
    let hinst = unsafe { GetModuleHandleW(None) }.map_err(|x| format!("Não foi possível iniciar o teclado: {x}"))?;
    let h = unsafe { SetWindowsHookExW(WH_KEYBOARD_LL, Some(proc_hook), Some(hinst.into()), 0) }
        .map_err(|x| format!("Não foi possível instalar o gancho de teclado: {x}"))?;
    e.maquina.reiniciar_teclas();
    e.hook = Some(Gancho(h));
    Ok(())
}

pub fn desinstalar(e: &mut Estado) {
    if let Some(Gancho(h)) = e.hook.take() {
        unsafe {
            let _ = UnhookWindowsHookEx(h);
        }
    }
    e.maquina.reiniciar_teclas();
}

unsafe extern "system" fn proc_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code == HC_ACTION as i32 && lparam.0 != 0 {
        let kb = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
        if kb.dwExtraInfo != MARCA && !ctrl_falso_altgr(kb.vkCode, kb.scanCode) {
            let msg = wparam.0 as u32;
            let desce = msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN;
            let sobe = msg == WM_KEYUP || msg == WM_SYSKEYUP;
            if desce || sobe {
                // try_with/try_borrow_mut: nunca derruba o hook por reentrância.
                let resp = ESTADO
                    .try_with(|e| {
                        e.try_borrow_mut().ok().map(|mut e| {
                            // O relógio é lido aqui e injetado: a máquina não tem relógio próprio.
                            let agora = agora_ms();
                            if desce {
                                e.maquina.tecla_desce(kb.vkCode, agora)
                            } else {
                                e.maquina.tecla_sobe(kb.vkCode, agora)
                            }
                        })
                    })
                    .ok()
                    .flatten();
                if let Some(r) = resp {
                    emitir_saidas(r.saidas);
                    reprogramar_prazo(); // captura: pode ter começado/terminado uma espera
                    if r.neutralizar {
                        injetar_tecla_neutra();
                    }
                    if r.apagar_anterior {
                        injetar_backspace();
                    }
                    if r.engolir {
                        return LRESULT(1);
                    }
                }
            }
        }
    }
    CallNextHookEx(None, code, wparam, lparam)
}

fn eh_estendida(vk: u32) -> bool {
    matches!(vk, VK_RMENU | VK_RCONTROL | VK_LWIN | VK_RWIN)
}

fn entrada(vk: u32, sobe: bool) -> INPUT {
    let mut flags = KEYBD_EVENT_FLAGS(0);
    if sobe {
        flags |= KEYEVENTF_KEYUP;
    }
    if eh_estendida(vk) {
        flags |= KEYEVENTF_EXTENDEDKEY;
    }
    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(vk as u16),
                wScan: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: MARCA,
            },
        },
    }
}

/// Envia uma sequência de (tecla, soltando?) marcada como nossa.
pub fn enviar_teclas(teclas: &[(u32, bool)]) {
    let entradas: Vec<INPUT> = teclas.iter().map(|&(vk, sobe)| entrada(vk, sobe)).collect();
    if entradas.is_empty() {
        return;
    }
    unsafe {
        SendInput(&entradas, std::mem::size_of::<INPUT>() as i32);
    }
}

/// Aperta e solta a tecla neutra. Chamada logo antes de liberar um Alt/Win que foi usado em atalho:
/// sem isso o Windows entenderia "Alt apertado e solto sozinho" e ativaria a barra de menu do app
/// em foco (ou o menu Iniciar, no caso do Win).
pub fn injetar_tecla_neutra() {
    enviar_teclas(&[(VK_NEUTRA as u32, false), (VK_NEUTRA as u32, true)]);
}

/// Toque duplo de tecla que digita: apaga o caractere que o 1º toque escreveu. Marcado em
/// `dwExtraInfo` como todo evento nosso, então o hook o ignora (não conta como "outra tecla").
pub fn injetar_backspace() {
    enviar_teclas(&[(VK_BACKSPACE, false), (VK_BACKSPACE, true)]);
}

/// Modificadores que estão fisicamente pressionados agora.
pub fn modificadores_pressionados() -> Vec<u32> {
    MODIFICADORES
        .iter()
        .copied()
        .filter(|&vk| unsafe { GetAsyncKeyState(vk as i32) } as u16 & 0x8000 != 0)
        .collect()
}

/// Aperta Enter no app em foco (envio automático depois de colar). Marcado como todo evento nosso:
/// o hook o ignora.
pub fn apertar_enter() {
    enviar_teclas(&[(VK_ENTER, false), (VK_ENTER, true)]);
}
