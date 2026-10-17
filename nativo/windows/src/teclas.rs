// Nomes de teclas (src/shared/atalhos.ts) -> códigos de tecla virtual do Windows (VK_*).
// Lógica pura: não usa nenhuma API do sistema.

/// Família de modificador. `Fn` não existe no Windows.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Familia {
    Ctrl,
    Alt,
    Win,
    Shift,
}

pub const TODAS_FAMILIAS: [Familia; 4] = [Familia::Ctrl, Familia::Alt, Familia::Win, Familia::Shift];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Lado {
    Qualquer,
    Esq,
    Dir,
}

pub const VK_LSHIFT: u32 = 0xA0;
pub const VK_RSHIFT: u32 = 0xA1;
pub const VK_LCONTROL: u32 = 0xA2;
pub const VK_RCONTROL: u32 = 0xA3;
pub const VK_LMENU: u32 = 0xA4;
pub const VK_RMENU: u32 = 0xA5;
pub const VK_LWIN: u32 = 0x5B;
pub const VK_RWIN: u32 = 0x5C;
pub const VK_ESCAPE: u32 = 0x1B;

/// Todos os códigos de modificador (esquerdo, direito).
pub const MODIFICADORES: [u32; 8] = [
    VK_LSHIFT, VK_RSHIFT, VK_LCONTROL, VK_RCONTROL, VK_LMENU, VK_RMENU, VK_LWIN, VK_RWIN,
];

impl Familia {
    /// (esquerdo, direito)
    pub fn codigos(self) -> (u32, u32) {
        match self {
            Familia::Ctrl => (VK_LCONTROL, VK_RCONTROL),
            Familia::Alt => (VK_LMENU, VK_RMENU),
            Familia::Win => (VK_LWIN, VK_RWIN),
            Familia::Shift => (VK_LSHIFT, VK_RSHIFT),
        }
    }

    /// Soltar Alt/Win sozinho abre a barra de menu / menu Iniciar.
    pub fn abre_menu(self) -> bool {
        matches!(self, Familia::Alt | Familia::Win)
    }
}

/// Família de um código de modificador (None = não é modificador).
pub fn familia_do_codigo(vk: u32) -> Option<Familia> {
    TODAS_FAMILIAS.into_iter().find(|f| {
        let (e, d) = f.codigos();
        vk == e || vk == d
    })
}

/// O Windows envia, para o AltGr (Alt direito em teclados como o ABNT2), um Ctrl esquerdo "falso"
/// com scan code 0x21D antes do Alt direito. Esse Ctrl não é do usuário e precisa ser ignorado,
/// senão `["AltRight"]` nunca teria "modificadores exatos".
pub fn ctrl_falso_altgr(vk: u32, scan_code: u32) -> bool {
    vk == VK_LCONTROL && scan_code == 0x21D
}

/// Interpreta um nome de modificador. Aceita os nomes do Windows (Alt*, Win*) e os do Mac
/// (Option* = Alt*, Cmd* = Win*). `Err` = nome de modificador que não existe no Windows (Fn).
pub fn modificador_por_nome(nome: &str) -> Option<(Familia, Lado)> {
    use Familia::*;
    use Lado::*;
    Some(match nome {
        "Ctrl" => (Ctrl, Qualquer),
        "CtrlLeft" => (Ctrl, Esq),
        "CtrlRight" => (Ctrl, Dir),
        "Alt" | "Option" => (Alt, Qualquer),
        "AltLeft" | "OptionLeft" => (Alt, Esq),
        "AltRight" | "OptionRight" => (Alt, Dir),
        "Win" | "Cmd" => (Win, Qualquer),
        "WinLeft" | "CmdLeft" => (Win, Esq),
        "WinRight" | "CmdRight" => (Win, Dir),
        "Shift" => (Shift, Qualquer),
        "ShiftLeft" => (Shift, Esq),
        "ShiftRight" => (Shift, Dir),
        _ => return None,
    })
}

/// Tecla comum -> código VK (None = nome desconhecido).
pub fn tecla_por_nome(nome: &str) -> Option<u32> {
    let b = nome.as_bytes();
    if b.len() == 1 {
        let c = b[0];
        if c.is_ascii_uppercase() || c.is_ascii_digit() {
            return Some(c as u32); // VK_A..VK_Z = 0x41..0x5A; VK_0..VK_9 = 0x30..0x39
        }
    }
    if let Some(n) = nome.strip_prefix('F') {
        if let Ok(n) = n.parse::<u32>() {
            // Recusa grafias como "F01".
            if (1..=20).contains(&n) && nome == format!("F{n}") {
                return Some(0x70 + n - 1); // VK_F1 = 0x70
            }
        }
    }
    match nome {
        "Enter" => Some(0x0D),
        "Tab" => Some(0x09),
        "Space" => Some(0x20),
        "Esc" => Some(VK_ESCAPE),
        _ => None,
    }
}

pub fn eh_tecla_f(vk: u32) -> bool {
    (0x70..=0x83).contains(&vk)
}

/// A tecla digita um caractere (letras, números, Espaço, Tab)? É o caso em que o primeiro toque de um
/// toque duplo chega a escrever algo e precisa ser apagado. Nunca F1–F20, Enter, Esc nem modificadores.
pub fn digita_caractere(vk: u32) -> bool {
    matches!(vk, 0x41..=0x5A | 0x30..=0x39 | 0x20 | 0x09)
}

/// Nome do modificador de lado (VK) como o app o espera na captura de atalho. Os nomes são os do
/// Mac (`OptionRight`, `CmdLeft`), que o app traduz para `Alt*`/`Win*` no Windows.
pub fn nome_do_modificador(vk: u32) -> Option<&'static str> {
    Some(match vk {
        VK_LCONTROL => "CtrlLeft",
        VK_RCONTROL => "CtrlRight",
        VK_LMENU => "OptionLeft",
        VK_RMENU => "OptionRight",
        VK_LWIN => "CmdLeft",
        VK_RWIN => "CmdRight",
        VK_LSHIFT => "ShiftLeft",
        VK_RSHIFT => "ShiftRight",
        _ => return None,
    })
}

/// Posição na ordem de saída da captura: Ctrl, Option(Alt), Cmd(Win), Shift (o Fn não existe aqui).
pub fn ordem_do_modificador(vk: u32) -> u32 {
    match familia_do_codigo(vk) {
        Some(Familia::Ctrl) => 0,
        Some(Familia::Alt) => 1,
        Some(Familia::Win) => 2,
        Some(Familia::Shift) => 3,
        None => 4,
    }
}

/// Nome de qualquer tecla que o protocolo conhece (modificador ou comum). None = tecla sem nome
/// no protocolo (setas, Backspace…): a captura a ignora.
pub fn nome_da_tecla(vk: u32) -> Option<String> {
    if let Some(n) = nome_do_modificador(vk) {
        return Some(n.to_string());
    }
    match vk {
        0x41..=0x5A | 0x30..=0x39 => Some((vk as u8 as char).to_string()),
        0x70..=0x83 => Some(format!("F{}", vk - 0x70 + 1)),
        0x0D => Some("Enter".into()),
        0x09 => Some("Tab".into()),
        0x20 => Some("Space".into()),
        VK_ESCAPE => Some("Esc".into()),
        _ => None,
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn modificadores_com_e_sem_lado() {
        assert_eq!(modificador_por_nome("AltRight"), Some((Familia::Alt, Lado::Dir)));
        assert_eq!(modificador_por_nome("Ctrl"), Some((Familia::Ctrl, Lado::Qualquer)));
        assert_eq!(modificador_por_nome("ShiftRight"), Some((Familia::Shift, Lado::Dir)));
    }

    #[test]
    fn nomes_do_mac_equivalem_aos_do_windows() {
        assert_eq!(modificador_por_nome("OptionRight"), modificador_por_nome("AltRight"));
        assert_eq!(modificador_por_nome("Option"), modificador_por_nome("Alt"));
        assert_eq!(modificador_por_nome("CmdLeft"), modificador_por_nome("WinLeft"));
        assert_eq!(modificador_por_nome("Cmd"), modificador_por_nome("Win"));
    }

    #[test]
    fn fn_nao_existe_no_windows() {
        assert_eq!(modificador_por_nome("Fn"), None);
        assert_eq!(tecla_por_nome("Fn"), None);
    }

    #[test]
    fn teclas_comuns() {
        assert_eq!(tecla_por_nome("V"), Some(0x56));
        assert_eq!(tecla_por_nome("0"), Some(0x30));
        assert_eq!(tecla_por_nome("Space"), Some(0x20));
        assert_eq!(tecla_por_nome("Esc"), Some(0x1B));
        assert_eq!(tecla_por_nome("F1"), Some(0x70));
        assert_eq!(tecla_por_nome("F12"), Some(0x7B));
        assert_eq!(tecla_por_nome("F20"), Some(0x83));
        assert_eq!(tecla_por_nome("F21"), None);
        assert_eq!(tecla_por_nome("F01"), None);
        assert_eq!(tecla_por_nome("v"), None);
        assert_eq!(tecla_por_nome("AB"), None);
    }

    #[test]
    fn nomes_de_volta() {
        for nome in ["V", "7", "Space", "Tab", "Enter", "Esc", "F1", "F20"] {
            assert_eq!(nome_da_tecla(tecla_por_nome(nome).unwrap()).as_deref(), Some(nome));
        }
        assert_eq!(nome_da_tecla(VK_RMENU).as_deref(), Some("OptionRight"));
        assert_eq!(nome_da_tecla(0x25), None); // seta
        assert!(digita_caractere(0x41) && digita_caractere(0x20) && digita_caractere(0x09));
        assert!(!digita_caractere(0x70) && !digita_caractere(0x0D) && !digita_caractere(VK_RMENU));
    }

    #[test]
    fn familia_do_codigo_e_altgr() {
        assert_eq!(familia_do_codigo(VK_RMENU), Some(Familia::Alt));
        assert_eq!(familia_do_codigo(0x41), None);
        assert!(ctrl_falso_altgr(VK_LCONTROL, 0x21D));
        assert!(!ctrl_falso_altgr(VK_LCONTROL, 0x1D));
    }
}
