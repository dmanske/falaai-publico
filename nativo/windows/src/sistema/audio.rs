// Silenciar a saída de som padrão (IAudioEndpointVolume). Só desfaz se foi o auxiliar que silenciou.

use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
use windows::Win32::Media::Audio::*;
use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_ALL};

#[derive(Default)]
pub struct Som {
    /// Dispositivo que NÓS silenciamos (None = não silenciamos nada).
    silenciado: Option<IAudioEndpointVolume>,
}

fn endpoint_padrao() -> Result<IAudioEndpointVolume, String> {
    let achar = || -> windows::core::Result<IAudioEndpointVolume> {
        unsafe {
            let enumerador: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
            let dispositivo = enumerador.GetDefaultAudioEndpoint(eRender, eConsole)?;
            dispositivo.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None)
        }
    };
    achar().map_err(|_| "Não foi possível achar o dispositivo de som padrão.".to_string())
}

/// Silencia a saída. Devolve `jaEstavaMudo`.
pub fn mutar(som: &mut Som) -> Result<bool, String> {
    if som.silenciado.is_some() {
        // Já silenciamos antes: continua valendo; para o app, o estado original era "não mudo".
        return Ok(false);
    }
    let ep = endpoint_padrao()?;
    let ja_mudo = unsafe { ep.GetMute() }
        .map(|b| b.as_bool())
        .map_err(|_| "Este dispositivo de som não pode ser silenciado.".to_string())?;
    if ja_mudo {
        return Ok(true); // não fomos nós: não desfazemos depois
    }
    unsafe { ep.SetMute(true, std::ptr::null()) }
        .map_err(|_| "Este dispositivo de som não pode ser silenciado.".to_string())?;
    som.silenciado = Some(ep);
    Ok(false)
}

/// Desfaz o mute só se foi o auxiliar que silenciou.
pub fn desfazer(som: &mut Som) {
    if let Some(ep) = som.silenciado.take() {
        unsafe {
            let _ = ep.SetMute(false, std::ptr::null());
        }
    }
}
