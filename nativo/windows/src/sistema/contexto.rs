// Contexto do app em foco: janela/processo (Win32) e campo de texto (UI Automation).

use crate::protocolo::{nome_amigavel, primeiros_caracteres, ultimos_caracteres};
use serde_json::{json, Value};
use windows::core::PWSTR;
use windows::Win32::Foundation::{CloseHandle, HWND};
use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_INPROC_SERVER};
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::Accessibility::*;
use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId,
};

const MAX_ANTES: usize = 800;
const MAX_DEPOIS: usize = 300;
const MAX_CAMPO: usize = 20_000;

pub struct AppEmFoco {
    pub nome: String,
    /// Nome do executável (ex.: "slack.exe").
    pub app_id: String,
    pub janela: Option<String>,
}

impl AppEmFoco {
    pub fn como_json(&self) -> Value {
        json!({ "nome": self.nome, "appId": self.app_id, "janela": self.janela })
    }
}

fn titulo_da_janela(hwnd: HWND) -> Option<String> {
    unsafe {
        let n = GetWindowTextLengthW(hwnd);
        if n <= 0 {
            return None;
        }
        let mut buf = vec![0u16; n as usize + 1];
        let lidos = GetWindowTextW(hwnd, &mut buf);
        if lidos <= 0 {
            return None;
        }
        Some(String::from_utf16_lossy(&buf[..lidos as usize]))
    }
}

fn caminho_do_exe(pid: u32) -> Option<String> {
    unsafe {
        let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buf = vec![0u16; 1024];
        let mut tam = buf.len() as u32;
        let r = QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut tam);
        let _ = CloseHandle(h);
        r.ok()?;
        Some(String::from_utf16_lossy(&buf[..tam as usize]))
    }
}

/// App em primeiro plano (None = nenhuma janela em foco, ou o processo não pôde ser lido).
pub fn app_em_foco() -> Option<AppEmFoco> {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        let caminho = caminho_do_exe(pid)?;
        let exe = caminho.rsplit(['\\', '/']).next().unwrap_or(&caminho).to_string();
        Some(AppEmFoco {
            nome: nome_amigavel(&exe),
            app_id: exe,
            janela: titulo_da_janela(hwnd),
        })
    }
}

// ---- UI Automation ----

fn automacao() -> Option<IUIAutomation> {
    unsafe { CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).ok() }
}

#[allow(non_upper_case_globals)]
fn papel(tipo: UIA_CONTROLTYPE_ID) -> String {
    match tipo {
        UIA_EditControlTypeId => "Edit".into(),
        UIA_DocumentControlTypeId => "Document".into(),
        UIA_ComboBoxControlTypeId => "ComboBox".into(),
        outro => format!("ControlType{}", outro.0),
    }
}

fn texto_do_intervalo(r: &IUIAutomationTextRange, max: usize) -> String {
    unsafe { r.GetText(max as i32) }.map(|b| b.to_string()).unwrap_or_default()
}

/// Antes/depois do cursor e texto selecionado, via TextPattern.
fn por_text_pattern(tp: &IUIAutomationTextPattern) -> Option<(String, String, String)> {
    unsafe {
        let selecoes = tp.GetSelection().ok()?;
        if selecoes.Length().ok()? < 1 {
            return None;
        }
        let sel = selecoes.GetElement(0).ok()?;
        let selecionado = primeiros_caracteres(&texto_do_intervalo(&sel, MAX_CAMPO), MAX_CAMPO);

        // Antes: intervalo vazio no início da seleção, esticado até 800 caracteres para trás.
        let antes_r = sel.Clone().ok()?;
        antes_r
            .MoveEndpointByRange(TextPatternRangeEndpoint_End, &sel, TextPatternRangeEndpoint_Start)
            .ok()?;
        let _ = antes_r.MoveEndpointByUnit(TextPatternRangeEndpoint_Start, TextUnit_Character, -(MAX_ANTES as i32));
        let antes = ultimos_caracteres(&texto_do_intervalo(&antes_r, MAX_ANTES), MAX_ANTES);

        // Depois: intervalo vazio no fim da seleção, esticado até 300 caracteres para frente.
        let depois_r = sel.Clone().ok()?;
        depois_r
            .MoveEndpointByRange(TextPatternRangeEndpoint_Start, &sel, TextPatternRangeEndpoint_End)
            .ok()?;
        let _ = depois_r.MoveEndpointByUnit(TextPatternRangeEndpoint_End, TextUnit_Character, MAX_DEPOIS as i32);
        let depois = primeiros_caracteres(&texto_do_intervalo(&depois_r, MAX_DEPOIS), MAX_DEPOIS);

        Some((antes, depois, selecionado))
    }
}

/// Valor inteiro do campo (ValuePattern).
fn valor_do_campo(el: &IUIAutomationElement) -> Option<String> {
    unsafe {
        let vp: IUIAutomationValuePattern = el.GetCurrentPatternAs(UIA_ValuePatternId).ok()?;
        Some(vp.CurrentValue().ok()?.to_string())
    }
}

fn elemento_em_foco() -> Option<(IUIAutomation, IUIAutomationElement)> {
    let ua = automacao()?;
    let el = unsafe { ua.GetFocusedElement() }.ok()?;
    Some((ua, el))
}

fn eh_senha(el: &IUIAutomationElement) -> bool {
    unsafe { el.CurrentIsPassword() }.map(|b| b.as_bool()).unwrap_or(false)
}

/// Campo de texto em foco, no formato do protocolo. None = sem campo de texto (ou não deu para ler).
#[allow(non_upper_case_globals)]
pub fn campo_em_foco() -> Option<Value> {
    let (_ua, el) = elemento_em_foco()?;
    let tipo = unsafe { el.CurrentControlType() }.ok()?;
    let nome_papel = papel(tipo);

    if eh_senha(&el) {
        // Nunca lê o texto de uma senha.
        return Some(json!({ "papel": nome_papel, "placeholder": Value::Null, "antes": "", "depois": "", "selecionado": "" }));
    }

    // Placeholder: o Windows não tem um atributo próprio; usa o texto de ajuda e, na falta dele,
    // o nome (rótulo) do campo.
    let ajuda = unsafe { el.CurrentHelpText() }.map(|b| b.to_string()).unwrap_or_default();
    let nome = unsafe { el.CurrentName() }.map(|b| b.to_string()).unwrap_or_default();
    let placeholder = [ajuda, nome].into_iter().find(|s| !s.is_empty());

    let texto_pattern: Option<IUIAutomationTextPattern> = unsafe { el.GetCurrentPatternAs(UIA_TextPatternId) }.ok();
    let eh_texto = matches!(tipo, UIA_EditControlTypeId | UIA_DocumentControlTypeId | UIA_ComboBoxControlTypeId)
        || texto_pattern.is_some();
    if !eh_texto {
        return None;
    }

    let (antes, depois, selecionado) = if let Some((a, d, s)) = texto_pattern.as_ref().and_then(por_text_pattern) {
        (a, d, s)
    } else if let Some(v) = valor_do_campo(&el) {
        // Só o valor: sem posição do cursor, tudo conta como "antes".
        (ultimos_caracteres(&v, MAX_ANTES), String::new(), String::new())
    } else {
        (String::new(), String::new(), String::new())
    };

    Some(json!({
        "papel": nome_papel,
        "placeholder": placeholder,
        "antes": antes,
        "depois": depois,
        "selecionado": selecionado,
    }))
}

/// Valor inteiro do campo em foco (até 20.000 caracteres). None para senha, sem campo ou sem leitura.
pub fn ler_campo() -> Option<String> {
    let (_ua, el) = elemento_em_foco()?;
    if eh_senha(&el) {
        return None;
    }
    let texto = if let Some(tp) = unsafe { el.GetCurrentPatternAs::<IUIAutomationTextPattern>(UIA_TextPatternId) }.ok() {
        let doc = unsafe { tp.DocumentRange() }.ok()?;
        Some(texto_do_intervalo(&doc, MAX_CAMPO))
    } else {
        valor_do_campo(&el)
    }?;
    Some(primeiros_caracteres(&texto, MAX_CAMPO))
}
