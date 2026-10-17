// Máquina de estados dos atalhos: recebe "tecla desceu / tecla subiu" e devolve o que deve ser
// emitido (atalho desce/sobe, combinado, esc) e se o evento deve ser engolido.
// Lógica PURA, sem API do Windows — é o que os testes exercitam. Mesmas regras do auxiliar do Mac
// (docs/design/PROTOCOLO_AUXILIAR.md, "Atalhos").

use crate::teclas::*;
use std::collections::BTreeSet;
use std::collections::HashSet;

/// Um atalho configurado.
#[derive(Debug, Clone)]
pub struct Atalho {
    pub id: String,
    pub mods: Vec<(Familia, Lado)>,
    /// None = atalho só de modificadores.
    pub tecla: Option<u32>,
    /// Já emitimos "desce" e ainda não "sobe".
    pub ativo: bool,
}

impl Atalho {
    fn mod_de(&self, f: Familia) -> Option<Lado> {
        self.mods.iter().find(|(fam, _)| *fam == f).map(|(_, l)| *l)
    }
    /// Algum modificador do atalho abre menu (Alt ou Win) quando solto sozinho?
    fn usa_modificador_de_menu(&self) -> bool {
        self.mods.iter().any(|(f, _)| f.abre_menu())
    }
}

/// O que a máquina quer emitir para o app.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Saida {
    Atalho { id: String, desce: bool },
    Combinado,
    Esc,
}

/// Resultado de processar um evento de teclado.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct Resposta {
    /// O evento não deve chegar ao app (só a tecla comum de um atalho).
    pub engolir: bool,
    pub saidas: Vec<Saida>,
    /// Antes de liberar este Alt/Win, injetar uma tecla "neutra" para o Windows não abrir a barra
    /// de menu (Alt) nem o menu Iniciar (Win).
    pub neutralizar: bool,
}

#[derive(Default)]
pub struct Maquina {
    atalhos: Vec<Atalho>,
    /// Modificadores seguros agora (códigos VK de lado).
    mods: BTreeSet<u32>,
    /// Teclas comuns atualmente pressionadas (para detectar auto-repetição).
    teclas_baixo: HashSet<u32>,
    /// Teclas comuns cujo "desce" foi engolido (o "sobe" também é).
    engolidas: HashSet<u32>,
    combinado_emitido: bool,
    /// Um atalho com Alt/Win foi usado nesta pressão: ao soltar, é preciso neutralizar o menu.
    usou_menu: bool,
}

fn familia_presente(mods: &BTreeSet<u32>, f: Familia) -> bool {
    let (e, d) = f.codigos();
    mods.contains(&e) || mods.contains(&d)
}

/// Os modificadores seguros contêm todos os do atalho?
fn contem_mods(mods: &BTreeSet<u32>, a: &Atalho) -> bool {
    a.mods.iter().all(|(f, lado)| {
        let (e, d) = f.codigos();
        match lado {
            Lado::Qualquer => familia_presente(mods, *f),
            Lado::Esq => mods.contains(&e),
            Lado::Dir => mods.contains(&d),
        }
    })
}

/// Contêm os do atalho e nenhum modificador a mais?
fn mods_exatos(mods: &BTreeSet<u32>, a: &Atalho) -> bool {
    contem_mods(mods, a)
        && TODAS_FAMILIAS
            .iter()
            .all(|f| a.mod_de(*f).is_some() || !familia_presente(mods, *f))
}

impl Maquina {
    pub fn novo() -> Self {
        Self::default()
    }

    fn emitir_atalho(saidas: &mut Vec<Saida>, a: &Atalho, desce: bool) {
        saidas.push(Saida::Atalho { id: a.id.clone(), desce });
    }

    /// Solta tudo o que estiver "descido" (ao parar o teclado, trocar atalhos ou perder eventos).
    pub fn soltar_ativos(&mut self) -> Vec<Saida> {
        let mut saidas = Vec::new();
        for a in self.atalhos.iter_mut().filter(|a| a.ativo) {
            a.ativo = false;
            Self::emitir_atalho(&mut saidas, a, false);
        }
        self.combinado_emitido = false;
        saidas
    }

    /// Zera o estado das teclas (ao ligar/desligar o hook). Não emite nada.
    pub fn reiniciar_teclas(&mut self) {
        self.mods.clear();
        self.teclas_baixo.clear();
        self.engolidas.clear();
        self.combinado_emitido = false;
        self.usou_menu = false;
        for a in &mut self.atalhos {
            a.ativo = false;
        }
    }

    /// Substitui a lista inteira de atalhos (já validada). Devolve os "sobe" dos que estavam descidos.
    pub fn trocar_atalhos(&mut self, nova: Vec<Atalho>) -> Vec<Saida> {
        let saidas = self.soltar_ativos();
        self.atalhos = nova;
        saidas
    }

    /// Reavalia os atalhos depois de mudar os modificadores seguros.
    fn reavaliar(&mut self, saidas: &mut Vec<Saida>) {
        let mods = self.mods.clone();
        let mut ativou_menu = false;
        for a in &mut self.atalhos {
            if a.tecla.is_none() {
                // Só modificadores: desce quando são exatamente estes; continua "descido"
                // (mesmo com modificador extra) até algum deles soltar.
                if !a.ativo && mods_exatos(&mods, a) {
                    a.ativo = true;
                    ativou_menu |= a.usa_modificador_de_menu();
                    Self::emitir_atalho(saidas, a, true);
                } else if a.ativo && !contem_mods(&mods, a) {
                    a.ativo = false;
                    Self::emitir_atalho(saidas, a, false);
                }
            } else if a.ativo && !contem_mods(&mods, a) {
                a.ativo = false;
                Self::emitir_atalho(saidas, a, false);
            }
        }
        if ativou_menu {
            self.usou_menu = true;
        }
        if !self.atalhos.iter().any(|a| a.tecla.is_none() && a.ativo) {
            self.combinado_emitido = false;
        }
    }

    /// Um modificador (código VK de lado) desceu. Auto-repetição não muda nada.
    fn modificador_desce(&mut self, vk: u32) -> Resposta {
        let mut r = Resposta::default();
        if self.mods.insert(vk) {
            self.reavaliar(&mut r.saidas);
        }
        r
    }

    fn modificador_sobe(&mut self, vk: u32) -> Resposta {
        let mut r = Resposta::default();
        let era_de_menu = familia_do_codigo(vk).is_some_and(|f| f.abre_menu());
        // O atalho que está sendo solto vai emitir "sobe" em reavaliar; a neutralização vale
        // se algum atalho com Alt/Win foi usado nesta pressão.
        r.neutralizar = era_de_menu && self.usou_menu;
        if self.mods.remove(&vk) {
            self.reavaliar(&mut r.saidas);
        }
        let ainda_menu = self
            .mods
            .iter()
            .any(|m| familia_do_codigo(*m).is_some_and(|f| f.abre_menu()));
        if !ainda_menu {
            self.usou_menu = false;
        }
        r
    }

    /// Uma tecla desceu.
    pub fn tecla_desce(&mut self, vk: u32) -> Resposta {
        if familia_do_codigo(vk).is_some() {
            return self.modificador_desce(vk);
        }
        let repeticao = !self.teclas_baixo.insert(vk);
        let mut r = Resposta::default();

        if repeticao && self.engolidas.contains(&vk) {
            r.engolir = true; // auto-repetição de tecla engolida
            return r;
        }
        self.engolidas.remove(&vk); // desce novo: o "sobe" anterior se perdeu

        if repeticao {
            return r;
        }

        let mods = self.mods.clone();
        let mut ativou = false;
        for a in &mut self.atalhos {
            if a.tecla == Some(vk) && mods_exatos(&mods, a) {
                a.ativo = true;
                ativou = true;
                if a.usa_modificador_de_menu() {
                    self.usou_menu = true;
                }
                Self::emitir_atalho(&mut r.saidas, a, true);
                break;
            }
        }
        if ativou {
            self.engolidas.insert(vk);
            r.engolir = true;
            return r;
        }

        if vk == VK_ESCAPE {
            r.saidas.push(Saida::Esc);
        }
        // Outra tecla com um atalho só de modificadores seguro: era atalho do sistema
        // (Alt+Tab etc.), não ditado.
        if !self.combinado_emitido && self.atalhos.iter().any(|a| a.tecla.is_none() && a.ativo) {
            self.combinado_emitido = true;
            r.saidas.push(Saida::Combinado);
        }
        r
    }

    /// Uma tecla subiu.
    pub fn tecla_sobe(&mut self, vk: u32) -> Resposta {
        if familia_do_codigo(vk).is_some() {
            return self.modificador_sobe(vk);
        }
        self.teclas_baixo.remove(&vk);
        let mut r = Resposta::default();
        if !self.engolidas.remove(&vk) {
            return r;
        }
        for a in &mut self.atalhos {
            if a.tecla == Some(vk) && a.ativo {
                a.ativo = false;
                Self::emitir_atalho(&mut r.saidas, a, false);
            }
        }
        r.engolir = true;
        r
    }
}

#[cfg(test)]
mod testes {
    use super::*;
    use crate::protocolo::interpretar_atalhos;
    use serde_json::json;

    fn maquina(atalhos: serde_json::Value) -> Maquina {
        let mut m = Maquina::novo();
        m.trocar_atalhos(interpretar_atalhos(&atalhos).expect("atalhos válidos"));
        m
    }

    /// Atalhos padrão do Windows (src/shared/atalhos.ts).
    fn padrao() -> Maquina {
        maquina(json!([
            {"id": "ditado", "teclas": ["AltRight"]},
            {"id": "pergunte", "teclas": ["AltRight", "Space"]},
            {"id": "traducao", "teclas": ["AltRight", "ShiftRight"]},
            {"id": "colarUltima", "teclas": ["CtrlLeft", "ShiftRight", "V"]},
        ]))
    }

    fn a(id: &str, desce: bool) -> Saida {
        Saida::Atalho { id: id.into(), desce }
    }

    const SPACE: u32 = 0x20;
    const V: u32 = 0x56;
    const TAB: u32 = 0x09;

    #[test]
    fn ditado_desce_e_sobe() {
        let mut m = padrao();
        let r = m.tecla_desce(VK_RMENU);
        assert_eq!(r.saidas, vec![a("ditado", true)]);
        assert!(!r.engolir, "modificador nunca é engolido");
        let r = m.tecla_sobe(VK_RMENU);
        assert_eq!(r.saidas, vec![a("ditado", false)]);
        assert!(!r.engolir);
    }

    #[test]
    fn alt_esquerdo_nao_dispara_ditado() {
        let mut m = padrao();
        assert!(m.tecla_desce(VK_LMENU).saidas.is_empty());
        assert!(m.tecla_sobe(VK_LMENU).saidas.is_empty());
    }

    #[test]
    fn autorepeticao_de_modificador_nao_gera_novo_desce() {
        let mut m = padrao();
        assert_eq!(m.tecla_desce(VK_RMENU).saidas.len(), 1);
        assert!(m.tecla_desce(VK_RMENU).saidas.is_empty());
        assert!(m.tecla_desce(VK_RMENU).saidas.is_empty());
    }

    #[test]
    fn pergunte_engole_o_espaco_e_os_modificadores_passam() {
        let mut m = padrao();
        m.tecla_desce(VK_RMENU); // ditado desce
        let r = m.tecla_desce(SPACE);
        assert_eq!(r.saidas, vec![a("pergunte", true)]);
        assert!(r.engolir);
        // auto-repetição do espaço: engolida, sem novo desce
        let r = m.tecla_desce(SPACE);
        assert!(r.engolir && r.saidas.is_empty());
        let r = m.tecla_sobe(SPACE);
        assert_eq!(r.saidas, vec![a("pergunte", false)]);
        assert!(r.engolir);
    }

    #[test]
    fn espaco_sem_modificador_passa() {
        let mut m = padrao();
        let r = m.tecla_desce(SPACE);
        assert!(!r.engolir && r.saidas.is_empty());
        assert!(!m.tecla_sobe(SPACE).engolir);
    }

    #[test]
    fn soltar_o_modificador_primeiro_solta_o_atalho_e_ainda_engole_o_sobe_da_tecla() {
        let mut m = padrao();
        m.tecla_desce(VK_RMENU);
        m.tecla_desce(SPACE);
        let r = m.tecla_sobe(VK_RMENU);
        assert_eq!(r.saidas, vec![a("ditado", false), a("pergunte", false)]);
        let r = m.tecla_sobe(SPACE);
        assert!(r.engolir && r.saidas.is_empty(), "o sobe do espaço não pode vazar");
    }

    #[test]
    fn traducao_desce_com_ditado_ainda_descido() {
        let mut m = padrao();
        assert_eq!(m.tecla_desce(VK_RMENU).saidas, vec![a("ditado", true)]);
        assert_eq!(m.tecla_desce(VK_RSHIFT).saidas, vec![a("traducao", true)]);
        // soltar o Shift: só a tradução sobe; o ditado continua
        assert_eq!(m.tecla_sobe(VK_RSHIFT).saidas, vec![a("traducao", false)]);
        assert_eq!(m.tecla_sobe(VK_RMENU).saidas, vec![a("ditado", false)]);
    }

    #[test]
    fn shift_antes_do_alt_nao_dispara_ditado() {
        // Shift direito já seguro: Alt direito não tem "modificadores exatos" para o ditado,
        // mas a tradução (AltRight+ShiftRight) desce.
        let mut m = padrao();
        assert!(m.tecla_desce(VK_RSHIFT).saidas.is_empty());
        assert_eq!(m.tecla_desce(VK_RMENU).saidas, vec![a("traducao", true)]);
    }

    #[test]
    fn combinado_quando_outra_tecla_com_atalho_so_de_modificador_ativo() {
        let mut m = padrao();
        m.tecla_desce(VK_RMENU);
        let r = m.tecla_desce(TAB); // Alt direito + Tab
        assert_eq!(r.saidas, vec![Saida::Combinado]);
        assert!(!r.engolir);
        // só uma vez por pressão
        m.tecla_sobe(TAB);
        assert!(m.tecla_desce(TAB).saidas.is_empty());
        m.tecla_sobe(TAB);
        m.tecla_sobe(VK_RMENU);
        // nova pressão: pode emitir de novo
        m.tecla_desce(VK_RMENU);
        assert_eq!(m.tecla_desce(TAB).saidas, vec![Saida::Combinado]);
    }

    #[test]
    fn esc_emite_evento_sem_repeticao() {
        let mut m = padrao();
        assert_eq!(m.tecla_desce(VK_ESCAPE).saidas, vec![Saida::Esc]);
        assert!(m.tecla_desce(VK_ESCAPE).saidas.is_empty());
        m.tecla_sobe(VK_ESCAPE);
        assert_eq!(m.tecla_desce(VK_ESCAPE).saidas, vec![Saida::Esc]);
    }

    #[test]
    fn colar_ultima_ctrl_shift_v() {
        let mut m = padrao();
        m.tecla_desce(VK_LCONTROL);
        m.tecla_desce(VK_RSHIFT); // nenhum atalho só de modificadores casa
        let r = m.tecla_desce(V);
        assert_eq!(r.saidas, vec![a("colarUltima", true)]);
        assert!(r.engolir);
        let r = m.tecla_sobe(V);
        assert_eq!(r.saidas, vec![a("colarUltima", false)]);
        assert!(r.engolir);
    }

    #[test]
    fn colar_ultima_nao_dispara_com_modificador_a_mais() {
        let mut m = padrao();
        m.tecla_desce(VK_LCONTROL);
        m.tecla_desce(VK_RSHIFT);
        m.tecla_desce(VK_LWIN);
        let r = m.tecla_desce(V);
        assert!(!r.engolir && r.saidas.is_empty());
    }

    #[test]
    fn modificador_sem_lado_aceita_qualquer_lado() {
        let mut m = maquina(json!([{"id": "x", "teclas": ["Ctrl", "Shift", "K"]}]));
        m.tecla_desce(VK_RCONTROL);
        m.tecla_desce(VK_LSHIFT);
        assert_eq!(m.tecla_desce(0x4B).saidas, vec![a("x", true)]);
    }

    #[test]
    fn trocar_atalhos_solta_os_ativos() {
        let mut m = padrao();
        m.tecla_desce(VK_RMENU);
        let saidas = m.trocar_atalhos(vec![]);
        assert_eq!(saidas, vec![a("ditado", false)]);
        assert!(m.tecla_sobe(VK_RMENU).saidas.is_empty());
    }

    #[test]
    fn neutraliza_o_menu_ao_soltar_alt_depois_de_usar_atalho() {
        let mut m = padrao();
        let r = m.tecla_desce(VK_RMENU);
        assert!(!r.neutralizar);
        let r = m.tecla_sobe(VK_RMENU);
        assert!(r.neutralizar, "soltar Alt direito depois do ditado precisa neutralizar o menu");
        // próxima pressão, sem atalho que use Alt: não neutraliza
        let mut m2 = maquina(json!([{"id": "c", "teclas": ["CtrlLeft", "Q"]}]));
        m2.tecla_desce(VK_LMENU);
        assert!(!m2.tecla_sobe(VK_LMENU).neutralizar);
    }

    #[test]
    fn neutraliza_tambem_quando_so_a_tecla_comum_do_atalho_usou_alt() {
        let mut m = maquina(json!([{"id": "p", "teclas": ["AltLeft", "Space"]}]));
        m.tecla_desce(VK_LMENU);
        m.tecla_desce(SPACE);
        m.tecla_sobe(SPACE);
        assert!(m.tecla_sobe(VK_LMENU).neutralizar);
        // e a marca some depois de soltar
        m.tecla_desce(VK_LMENU);
        assert!(!m.tecla_sobe(VK_LMENU).neutralizar);
    }

    #[test]
    fn reiniciar_teclas_zera_tudo_sem_emitir() {
        let mut m = padrao();
        m.tecla_desce(VK_RMENU);
        m.reiniciar_teclas();
        assert!(m.tecla_sobe(VK_RMENU).saidas.is_empty());
    }
}
