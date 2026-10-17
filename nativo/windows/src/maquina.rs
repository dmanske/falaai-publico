// Máquina de estados dos atalhos: recebe "tecla desceu / tecla subiu" e devolve o que deve ser
// emitido (atalho desce/sobe, combinado, esc), se o evento deve ser engolido e se é preciso apagar o
// caractere anterior (toque duplo de tecla que digita). Também faz a captura de atalho.
// Lógica PURA, sem API do Windows e SEM relógio: quem chama informa o instante (`Ms`, milissegundos
// de um relógio monotônico qualquer) a cada evento — é o que permite testar os tempos.
// Mesmas regras do auxiliar do Mac (docs/design/PROTOCOLO_AUXILIAR.md: "Atalhos", "Toque duplo (v3)"
// e "Captura de atalho (v3)").

use crate::teclas::*;
use std::collections::BTreeSet;
use std::collections::HashSet;

/// Instante em milissegundos (relógio monotônico injetado por quem chama).
pub type Ms = u64;

// ── Tempos do protocolo (centralizados aqui) ─────────────────────────────────────────────────────
/// Toque: a tecla fica descida no máximo este tempo.
pub const TOQUE_MAX_MS: Ms = 300;
/// O 2º "desce" acontece até este tempo depois de o 1º toque subir.
pub const INTERVALO_DUPLO_MS: Ms = 350;
/// Captura: espera por um 2º toque da mesma tecla.
pub const CAPTURA_ESPERA_2O_TOQUE_MS: Ms = 400;
/// Captura: sem nenhuma tecla por este tempo = erro.
pub const CAPTURA_SEM_TECLA_MS: Ms = 10_000;

pub const ERRO_CAPTURA_CANCELADA: &str = "Captura cancelada.";
pub const ERRO_CAPTURA_SEM_TECLA: &str = "Nenhuma tecla apertada.";
pub const ERRO_CAPTURA_EM_ANDAMENTO: &str = "Já existe uma captura em andamento.";

/// Em que ponto está o toque duplo de um atalho.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum FaseDuplo {
    #[default]
    Nenhum,
    /// 1º toque descido.
    Baixo1 { vk: u32, desde: Ms },
    /// 1º toque válido já subiu; esperando o 2º desce.
    Solto1 { vk: u32, em: Ms },
    /// 2º desce aconteceu (atalho "descido"); espera a tecla subir.
    Baixo2 { vk: u32 },
}

/// Um atalho configurado.
#[derive(Debug, Clone)]
pub struct Atalho {
    pub id: String,
    pub mods: Vec<(Familia, Lado)>,
    /// None = atalho só de modificadores.
    pub tecla: Option<u32>,
    /// Já emitimos "desce" e ainda não "sobe".
    pub ativo: bool,
    /// Toque duplo (`["Duplo", X]`): `X` é o único modificador de `mods` OU a `tecla` (nunca os dois).
    pub duplo: bool,
    pub fase: FaseDuplo,
}

impl Atalho {
    fn mod_de(&self, f: Familia) -> Option<Lado> {
        self.mods.iter().find(|(fam, _)| *fam == f).map(|(_, l)| *l)
    }
    /// Algum modificador do atalho abre menu (Alt ou Win) quando solto sozinho?
    fn usa_modificador_de_menu(&self) -> bool {
        self.mods.iter().any(|(f, _)| f.abre_menu())
    }
    /// Toque duplo: `vk` é a tecla-alvo deste atalho?
    fn alvo_duplo(&self, vk: u32) -> bool {
        if !self.duplo {
            return false;
        }
        match (self.tecla, self.mods.first()) {
            (Some(t), _) => t == vk,
            (None, Some((f, lado))) => {
                let (e, d) = f.codigos();
                match lado {
                    Lado::Qualquer => vk == e || vk == d,
                    Lado::Esq => vk == e,
                    Lado::Dir => vk == d,
                }
            }
            _ => false,
        }
    }
}

/// O que a máquina quer emitir para o app.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Saida {
    Atalho { id: String, desce: bool },
    Combinado,
    Esc,
    /// Fim da captura de atalho: `Ok(teclas)` ou `Err(mensagem)`. Vira a resposta do `capturar_atalho`.
    Captura(Result<Vec<String>, String>),
}

/// Resultado de processar um evento de teclado.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct Resposta {
    /// O evento não deve chegar ao app (a tecla comum de um atalho, o 2º toque de um duplo, as
    /// teclas comuns durante a captura).
    pub engolir: bool,
    pub saidas: Vec<Saida>,
    /// Antes de liberar este Alt/Win, injetar uma tecla "neutra" para o Windows não abrir a barra
    /// de menu (Alt) nem o menu Iniciar (Win).
    pub neutralizar: bool,
    /// Toque duplo de tecla que digita: o 1º toque já escreveu o caractere; injetar um Backspace
    /// (marcado como nosso) para apagá-lo.
    pub apagar_anterior: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FaseCaptura {
    /// Nenhuma tecla ainda (vale o prazo de 10 s).
    Esperando,
    /// Há teclas seguradas.
    Segurando,
    /// Uma tecla só foi solta; espera até `ate` por um 2º toque.
    Aguardando { vk: u32, ate: Ms },
    /// O 2º toque está descido; ao subir, responde o toque duplo.
    SegundoBaixo { vk: u32 },
}

struct Captura {
    inicio: Ms,
    /// Teclas (com nome) que participaram do gesto, na ordem em que desceram.
    juntadas: Vec<u32>,
    segurando: BTreeSet<u32>,
    fase: FaseCaptura,
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
    captura: Option<Captura>,
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

    fn zerar_duplos(&mut self) {
        for a in &mut self.atalhos {
            a.fase = FaseDuplo::Nenhum;
        }
    }

    /// Solta tudo o que estiver "descido" (ao parar o teclado, trocar atalhos ou perder eventos).
    pub fn soltar_ativos(&mut self) -> Vec<Saida> {
        let mut saidas = Vec::new();
        for a in self.atalhos.iter_mut().filter(|a| a.ativo) {
            a.ativo = false;
            Self::emitir_atalho(&mut saidas, a, false);
        }
        self.zerar_duplos();
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
            a.fase = FaseDuplo::Nenhum;
        }
    }

    /// Substitui a lista inteira de atalhos (já validada). Devolve os "sobe" dos que estavam descidos.
    pub fn trocar_atalhos(&mut self, nova: Vec<Atalho>) -> Vec<Saida> {
        let saidas = self.soltar_ativos();
        self.atalhos = nova;
        saidas
    }

    /// Reavalia os atalhos (só de modificadores, segurados) depois de mudar os modificadores seguros.
    fn reavaliar(&mut self, saidas: &mut Vec<Saida>) {
        let mods = self.mods.clone();
        let mut ativou_menu = false;
        for a in &mut self.atalhos {
            if a.duplo {
                continue; // toque duplo tem o próprio caminho (duplo_*)
            }
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
        if !self.atalhos.iter().any(|a| !a.duplo && a.tecla.is_none() && a.ativo) {
            self.combinado_emitido = false;
        }
    }

    // ── Toque duplo ──────────────────────────────────────────────────────────────────────────────

    /// Uma tecla (modificador ou comum) desceu, já sem auto-repetição. Atualiza o toque duplo de todos
    /// os atalhos `Duplo`. Devolve `true` se este desce completou um toque duplo de tecla comum
    /// (o evento deve ser engolido).
    fn duplo_desce(&mut self, vk: u32, t: Ms, r: &mut Resposta) -> bool {
        // Há outra tecla segura além desta? (modificador alvo: qualquer outro modificador;
        // tecla comum alvo: qualquer modificador.) Então não é um toque "limpo".
        let outros_mods = self.mods.iter().any(|m| *m != vk);
        let eh_mod = familia_do_codigo(vk).is_some();
        let mut engolir = false;
        let mut usou_menu = false;
        for a in self.atalhos.iter_mut().filter(|a| a.duplo) {
            if !a.alvo_duplo(vk) {
                // "Outra tecla no meio": zera, exceto o 2º toque já descido (aguarda a tecla subir).
                if !matches!(a.fase, FaseDuplo::Baixo2 { .. }) {
                    a.fase = FaseDuplo::Nenhum;
                }
                continue;
            }
            match a.fase {
                FaseDuplo::Baixo2 { .. } => {}
                FaseDuplo::Solto1 { vk: v, em }
                    if v == vk && !outros_mods && t.saturating_sub(em) <= INTERVALO_DUPLO_MS =>
                {
                    a.fase = FaseDuplo::Baixo2 { vk };
                    a.ativo = true;
                    Self::emitir_atalho(&mut r.saidas, a, true);
                    if !eh_mod {
                        engolir = true;
                        r.apagar_anterior = digita_caractere(vk);
                    }
                    usou_menu |= a.usa_modificador_de_menu();
                }
                _ => {
                    if outros_mods {
                        a.fase = FaseDuplo::Nenhum;
                    } else {
                        a.fase = FaseDuplo::Baixo1 { vk, desde: t };
                        // Soltar um Alt/Win sozinho abriria o menu: neutraliza já no 1º toque.
                        usou_menu |= a.usa_modificador_de_menu();
                    }
                }
            }
        }
        if usou_menu {
            self.usou_menu = true;
        }
        engolir
    }

    /// Uma tecla subiu: fecha o 1º toque (se foi rápido) ou o 2º (emite "sobe").
    fn duplo_sobe(&mut self, vk: u32, t: Ms, r: &mut Resposta) {
        for a in self.atalhos.iter_mut().filter(|a| a.alvo_duplo(vk)) {
            match a.fase {
                FaseDuplo::Baixo1 { vk: v, desde } if v == vk => {
                    a.fase = if t.saturating_sub(desde) <= TOQUE_MAX_MS {
                        FaseDuplo::Solto1 { vk, em: t }
                    } else {
                        FaseDuplo::Nenhum
                    };
                }
                FaseDuplo::Baixo2 { vk: v } if v == vk => {
                    a.fase = FaseDuplo::Nenhum;
                    if a.ativo {
                        a.ativo = false;
                        Self::emitir_atalho(&mut r.saidas, a, false);
                    }
                }
                _ => {}
            }
        }
    }

    // ── Teclas ───────────────────────────────────────────────────────────────────────────────────

    /// Um modificador (código VK de lado) desceu. Auto-repetição não muda nada.
    fn modificador_desce(&mut self, vk: u32, t: Ms) -> Resposta {
        let mut r = Resposta::default();
        if self.mods.insert(vk) {
            self.duplo_desce(vk, t, &mut r);
            self.reavaliar(&mut r.saidas);
        }
        r
    }

    fn modificador_sobe(&mut self, vk: u32, t: Ms) -> Resposta {
        let mut r = Resposta::default();
        let era_de_menu = familia_do_codigo(vk).is_some_and(|f| f.abre_menu());
        // O atalho que está sendo solto vai emitir "sobe" em reavaliar; a neutralização vale
        // se algum atalho com Alt/Win foi usado nesta pressão.
        r.neutralizar = era_de_menu && self.usou_menu;
        if self.mods.remove(&vk) {
            self.duplo_sobe(vk, t, &mut r);
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

    /// Uma tecla desceu em `t`.
    pub fn tecla_desce(&mut self, vk: u32, t: Ms) -> Resposta {
        let mut previas = Vec::new();
        if self.captura.is_some() {
            self.vencer_prazos(t, &mut previas);
        }
        let mut r = if self.captura.is_some() { self.captura_desce(vk, t) } else { self.desce_normal(vk, t) };
        previas.append(&mut r.saidas);
        r.saidas = previas;
        r
    }

    /// Uma tecla subiu em `t`.
    pub fn tecla_sobe(&mut self, vk: u32, t: Ms) -> Resposta {
        let mut previas = Vec::new();
        if self.captura.is_some() {
            self.vencer_prazos(t, &mut previas);
        }
        let mut r = if self.captura.is_some() { self.captura_sobe(vk, t) } else { self.sobe_normal(vk, t) };
        previas.append(&mut r.saidas);
        r.saidas = previas;
        r
    }

    fn desce_normal(&mut self, vk: u32, t: Ms) -> Resposta {
        if familia_do_codigo(vk).is_some() {
            return self.modificador_desce(vk, t);
        }
        let repeticao = !self.teclas_baixo.insert(vk);
        let mut r = Resposta::default();

        if repeticao && self.engolidas.contains(&vk) {
            r.engolir = true; // auto-repetição de tecla engolida
            return r;
        }
        self.engolidas.remove(&vk); // desce novo: o "sobe" anterior se perdeu

        if repeticao {
            return r; // auto-repetição nunca conta como toque
        }

        // Toque duplo (tecla comum): o 2º desce é engolido e o caractere do 1º é apagado.
        if self.duplo_desce(vk, t, &mut r) {
            self.engolidas.insert(vk);
            r.engolir = true;
            return r;
        }

        let mods = self.mods.clone();
        let mut ativou = false;
        for a in &mut self.atalhos {
            if !a.duplo && a.tecla == Some(vk) && mods_exatos(&mods, a) {
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
        if !self.combinado_emitido && self.atalhos.iter().any(|a| !a.duplo && a.tecla.is_none() && a.ativo) {
            self.combinado_emitido = true;
            r.saidas.push(Saida::Combinado);
        }
        r
    }

    fn sobe_normal(&mut self, vk: u32, t: Ms) -> Resposta {
        if familia_do_codigo(vk).is_some() {
            return self.modificador_sobe(vk, t);
        }
        self.teclas_baixo.remove(&vk);
        let mut r = Resposta::default();
        // Só fecha o 1º toque; o "sobe" do 2º é emitido abaixo (a tecla está em `engolidas`).
        for a in self.atalhos.iter_mut().filter(|a| a.alvo_duplo(vk)) {
            if let FaseDuplo::Baixo1 { vk: v, desde } = a.fase {
                a.fase = if v == vk && t.saturating_sub(desde) <= TOQUE_MAX_MS {
                    FaseDuplo::Solto1 { vk, em: t }
                } else {
                    FaseDuplo::Nenhum
                };
            }
        }
        if !self.engolidas.remove(&vk) {
            return r;
        }
        for a in &mut self.atalhos {
            if a.tecla == Some(vk) && a.ativo {
                a.ativo = false;
                if a.duplo {
                    a.fase = FaseDuplo::Nenhum;
                }
                Self::emitir_atalho(&mut r.saidas, a, false);
            }
        }
        r.engolir = true;
        r
    }

    // ── Captura de atalho ────────────────────────────────────────────────────────────────────────

    #[cfg(test)]
    pub fn capturando(&self) -> bool {
        self.captura.is_some()
    }

    /// Liga o modo captura em `t`. Devolve os "sobe" dos atalhos que estavam descidos. `Err` se já
    /// há uma captura (só uma por vez). Teclas já seguradas antes do início não entram no gesto.
    pub fn iniciar_captura(&mut self, t: Ms) -> Result<Vec<Saida>, &'static str> {
        if self.captura.is_some() {
            return Err(ERRO_CAPTURA_EM_ANDAMENTO);
        }
        let saidas = self.soltar_ativos();
        self.captura = Some(Captura {
            inicio: t,
            juntadas: Vec::new(),
            segurando: BTreeSet::new(),
            fase: FaseCaptura::Esperando,
        });
        Ok(saidas)
    }

    /// Encerra a captura em andamento com erro "Captura cancelada." (vazio se não havia captura).
    pub fn cancelar_captura(&mut self) -> Vec<Saida> {
        if self.captura.take().is_none() {
            return Vec::new();
        }
        self.zerar_duplos();
        vec![Saida::Captura(Err(ERRO_CAPTURA_CANCELADA.into()))]
    }

    /// Quando a camada do sistema precisa chamar `tempo` (em `Ms`), se for preciso: 10 s sem tecla ou
    /// o fim da espera pelo 2º toque.
    pub fn proximo_prazo(&self) -> Option<Ms> {
        let c = self.captura.as_ref()?;
        match c.fase {
            FaseCaptura::Esperando => Some(c.inicio + CAPTURA_SEM_TECLA_MS),
            FaseCaptura::Aguardando { ate, .. } => Some(ate + 1),
            _ => None,
        }
    }

    /// Informa que o tempo chegou a `t` (o temporizador do sistema disparou).
    pub fn tempo(&mut self, t: Ms) -> Vec<Saida> {
        let mut saidas = Vec::new();
        self.vencer_prazos(t, &mut saidas);
        saidas
    }

    fn terminar_captura(&mut self, resultado: Result<Vec<String>, String>, saidas: &mut Vec<Saida>) {
        self.captura = None;
        self.zerar_duplos();
        saidas.push(Saida::Captura(resultado));
    }

    /// Resolve os prazos da captura vencidos em `t`.
    fn vencer_prazos(&mut self, t: Ms, saidas: &mut Vec<Saida>) {
        let Some(c) = self.captura.as_ref() else { return };
        match c.fase {
            FaseCaptura::Esperando if t >= c.inicio + CAPTURA_SEM_TECLA_MS => {
                self.terminar_captura(Err(ERRO_CAPTURA_SEM_TECLA.into()), saidas);
            }
            FaseCaptura::Aguardando { vk, ate } if t > ate => self.fechar_tecla_unica(vk, saidas),
            _ => {}
        }
    }

    /// Uma tecla só, sem 2º toque: `[X]` (ou "Captura cancelada." se for o Esc).
    fn fechar_tecla_unica(&mut self, vk: u32, saidas: &mut Vec<Saida>) {
        let res = if vk == VK_ESCAPE {
            Err(ERRO_CAPTURA_CANCELADA.to_string())
        } else {
            Ok(vec![nome_da_tecla(vk).unwrap_or_default()])
        };
        self.terminar_captura(res, saidas);
    }

    fn captura_desce(&mut self, vk: u32, t: Ms) -> Resposta {
        let eh_mod = familia_do_codigo(vk).is_some();
        let nova = if eh_mod { self.mods.insert(vk) } else { self.teclas_baixo.insert(vk) };
        let mut r = Resposta::default();
        if eh_mod {
            if familia_do_codigo(vk).is_some_and(|f| f.abre_menu()) {
                self.usou_menu = true; // ao soltar, neutraliza o menu
            }
        } else {
            // Nada é digitado nem dispara durante a captura (o "sobe" também é engolido).
            self.engolidas.insert(vk);
            r.engolir = true;
        }
        if !nova {
            return r; // auto-repetição
        }
        let Some(c) = self.captura.as_mut() else { return r };
        match c.fase {
            FaseCaptura::Aguardando { vk: alvo, ate } => {
                if vk == alvo && t <= ate {
                    c.fase = FaseCaptura::SegundoBaixo { vk };
                    c.segurando.insert(vk);
                } else {
                    // Outra tecla antes de acabar a espera: o gesto anterior termina como tecla única.
                    let mut saidas = std::mem::take(&mut r.saidas);
                    self.fechar_tecla_unica(alvo, &mut saidas);
                    r.saidas = saidas;
                }
            }
            FaseCaptura::SegundoBaixo { .. } => {}
            FaseCaptura::Esperando | FaseCaptura::Segurando => {
                if nome_da_tecla(vk).is_some() {
                    if !c.juntadas.contains(&vk) {
                        c.juntadas.push(vk);
                    }
                    c.segurando.insert(vk);
                    c.fase = FaseCaptura::Segurando;
                }
            }
        }
        r
    }

    fn captura_sobe(&mut self, vk: u32, t: Ms) -> Resposta {
        let mut r = Resposta::default();
        if familia_do_codigo(vk).is_some() {
            r.neutralizar = familia_do_codigo(vk).is_some_and(|f| f.abre_menu()) && self.usou_menu;
            self.mods.remove(&vk);
            let ainda_menu = self
                .mods
                .iter()
                .any(|m| familia_do_codigo(*m).is_some_and(|f| f.abre_menu()));
            if !ainda_menu {
                self.usou_menu = false;
            }
        } else {
            self.teclas_baixo.remove(&vk);
            r.engolir = self.engolidas.remove(&vk);
        }
        let Some(c) = self.captura.as_mut() else { return r };
        if !c.segurando.remove(&vk) {
            return r;
        }
        match c.fase {
            FaseCaptura::Segurando if c.segurando.is_empty() => {
                if c.juntadas.len() == 1 {
                    c.fase = FaseCaptura::Aguardando { vk: c.juntadas[0], ate: t + CAPTURA_ESPERA_2O_TOQUE_MS };
                } else {
                    let mut mods: Vec<u32> = c.juntadas.iter().copied().filter(|v| familia_do_codigo(*v).is_some()).collect();
                    mods.sort_by_key(|v| (ordem_do_modificador(*v), *v));
                    let comuns = c.juntadas.iter().copied().filter(|v| familia_do_codigo(*v).is_none());
                    let nomes: Vec<String> = mods.into_iter().chain(comuns).filter_map(nome_da_tecla).collect();
                    let mut saidas = Vec::new();
                    self.terminar_captura(Ok(nomes), &mut saidas);
                    r.saidas = saidas;
                }
            }
            FaseCaptura::SegundoBaixo { vk: alvo } if alvo == vk => {
                let nome = nome_da_tecla(vk).unwrap_or_default();
                let mut saidas = Vec::new();
                self.terminar_captura(Ok(vec!["Duplo".into(), nome]), &mut saidas);
                r.saidas = saidas;
            }
            _ => {}
        }
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
        let r = m.tecla_desce(VK_RMENU, 0);
        assert_eq!(r.saidas, vec![a("ditado", true)]);
        assert!(!r.engolir, "modificador nunca é engolido");
        let r = m.tecla_sobe(VK_RMENU, 0);
        assert_eq!(r.saidas, vec![a("ditado", false)]);
        assert!(!r.engolir);
    }

    #[test]
    fn alt_esquerdo_nao_dispara_ditado() {
        let mut m = padrao();
        assert!(m.tecla_desce(VK_LMENU, 0).saidas.is_empty());
        assert!(m.tecla_sobe(VK_LMENU, 0).saidas.is_empty());
    }

    #[test]
    fn autorepeticao_de_modificador_nao_gera_novo_desce() {
        let mut m = padrao();
        assert_eq!(m.tecla_desce(VK_RMENU, 0).saidas.len(), 1);
        assert!(m.tecla_desce(VK_RMENU, 0).saidas.is_empty());
        assert!(m.tecla_desce(VK_RMENU, 0).saidas.is_empty());
    }

    #[test]
    fn pergunte_engole_o_espaco_e_os_modificadores_passam() {
        let mut m = padrao();
        m.tecla_desce(VK_RMENU, 0); // ditado desce
        let r = m.tecla_desce(SPACE, 0);
        assert_eq!(r.saidas, vec![a("pergunte", true)]);
        assert!(r.engolir);
        // auto-repetição do espaço: engolida, sem novo desce
        let r = m.tecla_desce(SPACE, 0);
        assert!(r.engolir && r.saidas.is_empty());
        let r = m.tecla_sobe(SPACE, 0);
        assert_eq!(r.saidas, vec![a("pergunte", false)]);
        assert!(r.engolir);
    }

    #[test]
    fn espaco_sem_modificador_passa() {
        let mut m = padrao();
        let r = m.tecla_desce(SPACE, 0);
        assert!(!r.engolir && r.saidas.is_empty());
        assert!(!m.tecla_sobe(SPACE, 0).engolir);
    }

    #[test]
    fn soltar_o_modificador_primeiro_solta_o_atalho_e_ainda_engole_o_sobe_da_tecla() {
        let mut m = padrao();
        m.tecla_desce(VK_RMENU, 0);
        m.tecla_desce(SPACE, 0);
        let r = m.tecla_sobe(VK_RMENU, 0);
        assert_eq!(r.saidas, vec![a("ditado", false), a("pergunte", false)]);
        let r = m.tecla_sobe(SPACE, 0);
        assert!(r.engolir && r.saidas.is_empty(), "o sobe do espaço não pode vazar");
    }

    #[test]
    fn traducao_desce_com_ditado_ainda_descido() {
        let mut m = padrao();
        assert_eq!(m.tecla_desce(VK_RMENU, 0).saidas, vec![a("ditado", true)]);
        assert_eq!(m.tecla_desce(VK_RSHIFT, 0).saidas, vec![a("traducao", true)]);
        // soltar o Shift: só a tradução sobe; o ditado continua
        assert_eq!(m.tecla_sobe(VK_RSHIFT, 0).saidas, vec![a("traducao", false)]);
        assert_eq!(m.tecla_sobe(VK_RMENU, 0).saidas, vec![a("ditado", false)]);
    }

    #[test]
    fn shift_antes_do_alt_nao_dispara_ditado() {
        // Shift direito já seguro: Alt direito não tem "modificadores exatos" para o ditado,
        // mas a tradução (AltRight+ShiftRight) desce.
        let mut m = padrao();
        assert!(m.tecla_desce(VK_RSHIFT, 0).saidas.is_empty());
        assert_eq!(m.tecla_desce(VK_RMENU, 0).saidas, vec![a("traducao", true)]);
    }

    #[test]
    fn combinado_quando_outra_tecla_com_atalho_so_de_modificador_ativo() {
        let mut m = padrao();
        m.tecla_desce(VK_RMENU, 0);
        let r = m.tecla_desce(TAB, 0); // Alt direito + Tab
        assert_eq!(r.saidas, vec![Saida::Combinado]);
        assert!(!r.engolir);
        // só uma vez por pressão
        m.tecla_sobe(TAB, 0);
        assert!(m.tecla_desce(TAB, 0).saidas.is_empty());
        m.tecla_sobe(TAB, 0);
        m.tecla_sobe(VK_RMENU, 0);
        // nova pressão: pode emitir de novo
        m.tecla_desce(VK_RMENU, 0);
        assert_eq!(m.tecla_desce(TAB, 0).saidas, vec![Saida::Combinado]);
    }

    #[test]
    fn esc_emite_evento_sem_repeticao() {
        let mut m = padrao();
        assert_eq!(m.tecla_desce(VK_ESCAPE, 0).saidas, vec![Saida::Esc]);
        assert!(m.tecla_desce(VK_ESCAPE, 0).saidas.is_empty());
        m.tecla_sobe(VK_ESCAPE, 0);
        assert_eq!(m.tecla_desce(VK_ESCAPE, 0).saidas, vec![Saida::Esc]);
    }

    #[test]
    fn colar_ultima_ctrl_shift_v() {
        let mut m = padrao();
        m.tecla_desce(VK_LCONTROL, 0);
        m.tecla_desce(VK_RSHIFT, 0); // nenhum atalho só de modificadores casa
        let r = m.tecla_desce(V, 0);
        assert_eq!(r.saidas, vec![a("colarUltima", true)]);
        assert!(r.engolir);
        let r = m.tecla_sobe(V, 0);
        assert_eq!(r.saidas, vec![a("colarUltima", false)]);
        assert!(r.engolir);
    }

    #[test]
    fn colar_ultima_nao_dispara_com_modificador_a_mais() {
        let mut m = padrao();
        m.tecla_desce(VK_LCONTROL, 0);
        m.tecla_desce(VK_RSHIFT, 0);
        m.tecla_desce(VK_LWIN, 0);
        let r = m.tecla_desce(V, 0);
        assert!(!r.engolir && r.saidas.is_empty());
    }

    #[test]
    fn modificador_sem_lado_aceita_qualquer_lado() {
        let mut m = maquina(json!([{"id": "x", "teclas": ["Ctrl", "Shift", "K"]}]));
        m.tecla_desce(VK_RCONTROL, 0);
        m.tecla_desce(VK_LSHIFT, 0);
        assert_eq!(m.tecla_desce(0x4B, 0).saidas, vec![a("x", true)]);
    }

    #[test]
    fn trocar_atalhos_solta_os_ativos() {
        let mut m = padrao();
        m.tecla_desce(VK_RMENU, 0);
        let saidas = m.trocar_atalhos(vec![]);
        assert_eq!(saidas, vec![a("ditado", false)]);
        assert!(m.tecla_sobe(VK_RMENU, 0).saidas.is_empty());
    }

    #[test]
    fn neutraliza_o_menu_ao_soltar_alt_depois_de_usar_atalho() {
        let mut m = padrao();
        let r = m.tecla_desce(VK_RMENU, 0);
        assert!(!r.neutralizar);
        let r = m.tecla_sobe(VK_RMENU, 0);
        assert!(r.neutralizar, "soltar Alt direito depois do ditado precisa neutralizar o menu");
        // próxima pressão, sem atalho que use Alt: não neutraliza
        let mut m2 = maquina(json!([{"id": "c", "teclas": ["CtrlLeft", "Q"]}]));
        m2.tecla_desce(VK_LMENU, 0);
        assert!(!m2.tecla_sobe(VK_LMENU, 0).neutralizar);
    }

    #[test]
    fn neutraliza_tambem_quando_so_a_tecla_comum_do_atalho_usou_alt() {
        let mut m = maquina(json!([{"id": "p", "teclas": ["AltLeft", "Space"]}]));
        m.tecla_desce(VK_LMENU, 0);
        m.tecla_desce(SPACE, 0);
        m.tecla_sobe(SPACE, 0);
        assert!(m.tecla_sobe(VK_LMENU, 0).neutralizar);
        // e a marca some depois de soltar
        m.tecla_desce(VK_LMENU, 0);
        assert!(!m.tecla_sobe(VK_LMENU, 0).neutralizar);
    }

    #[test]
    fn reiniciar_teclas_zera_tudo_sem_emitir() {
        let mut m = padrao();
        m.tecla_desce(VK_RMENU, 0);
        m.reiniciar_teclas();
        assert!(m.tecla_sobe(VK_RMENU, 0).saidas.is_empty());
    }

    // ── Toque duplo ──────────────────────────────────────────────────────────────────────────────

    const A: u32 = 0x41;
    const B: u32 = 0x42;

    fn duplo(teclas: serde_json::Value) -> Maquina {
        maquina(json!([{"id": "duplo", "teclas": teclas}]))
    }

    /// Toca a tecla: desce em `t`, sobe em `t + dur`.
    fn tocar(m: &mut Maquina, vk: u32, t: Ms, dur: Ms) -> (Resposta, Resposta) {
        let d = m.tecla_desce(vk, t);
        let s = m.tecla_sobe(vk, t + dur);
        (d, s)
    }

    #[test]
    fn duplo_de_modificadora_altright() {
        let mut m = duplo(json!(["Duplo", "AltRight"]));
        let (d, s) = tocar(&mut m, VK_RMENU, 1000, 100);
        assert!(d.saidas.is_empty() && s.saidas.is_empty(), "1º toque não emite");
        assert!(s.neutralizar, "o 1º toque de Alt não pode abrir o menu");
        let r = m.tecla_desce(VK_RMENU, 1250); // 150 ms depois de subir
        assert_eq!(r.saidas, vec![a("duplo", true)]);
        assert!(!r.engolir && !r.apagar_anterior, "modificadora: nada engolido nem apagado");
        let r = m.tecla_sobe(VK_RMENU, 1400);
        assert_eq!(r.saidas, vec![a("duplo", false)]);
        assert!(r.neutralizar);
        // Alt esquerdo não conta
        let mut m = duplo(json!(["Duplo", "OptionRight"]));
        tocar(&mut m, VK_LMENU, 0, 50);
        assert!(m.tecla_desce(VK_LMENU, 100).saidas.is_empty());
    }

    #[test]
    fn duplo_de_modificadora_sem_lado_aceita_qualquer_lado_mas_o_mesmo_nos_dois_toques() {
        let mut m = duplo(json!(["Duplo", "Shift"]));
        tocar(&mut m, VK_LSHIFT, 0, 50);
        assert!(m.tecla_desce(VK_RSHIFT, 100).saidas.is_empty(), "lados diferentes não fecham o duplo");
        m.tecla_sobe(VK_RSHIFT, 150);
        assert_eq!(m.tecla_desce(VK_RSHIFT, 200).saidas, vec![a("duplo", true)]);
    }

    #[test]
    fn duplo_de_letra_engole_o_segundo_e_manda_apagar() {
        let mut m = duplo(json!(["Duplo", "A"]));
        let (d, s) = tocar(&mut m, A, 1000, 80);
        assert!(!d.engolir && !s.engolir, "o 1º toque passa (digita a letra)");
        assert!(!d.apagar_anterior);
        let r = m.tecla_desce(A, 1200);
        assert_eq!(r.saidas, vec![a("duplo", true)]);
        assert!(r.engolir, "o 2º desce é engolido");
        assert!(r.apagar_anterior, "apaga o caractere do 1º toque");
        // auto-repetição do 2º: engolida, sem apagar de novo
        let r = m.tecla_desce(A, 1250);
        assert!(r.engolir && r.saidas.is_empty() && !r.apagar_anterior);
        let r = m.tecla_sobe(A, 1500);
        assert_eq!(r.saidas, vec![a("duplo", false)]);
        assert!(r.engolir, "o sobe do 2º também é engolido");
        // um 3º toque logo depois recomeça do zero
        let (d, _) = tocar(&mut m, A, 1600, 50);
        assert!(!d.engolir && d.saidas.is_empty());
    }

    #[test]
    fn duplo_de_tecla_f_nao_apaga_nada() {
        let mut m = duplo(json!(["Duplo", "F5"]));
        tocar(&mut m, 0x74, 0, 50);
        let r = m.tecla_desce(0x74, 100);
        assert_eq!(r.saidas, vec![a("duplo", true)]);
        assert!(r.engolir && !r.apagar_anterior);
    }

    #[test]
    fn toque_lento_demais_nao_dispara() {
        // 1º toque segurado por mais de 300 ms
        let mut m = duplo(json!(["Duplo", "AltRight"]));
        tocar(&mut m, VK_RMENU, 0, 301);
        assert!(m.tecla_desce(VK_RMENU, 400).saidas.is_empty());
        // exatamente 300 ms ainda vale
        let mut m = duplo(json!(["Duplo", "AltRight"]));
        tocar(&mut m, VK_RMENU, 0, 300);
        assert_eq!(m.tecla_desce(VK_RMENU, 400).saidas, vec![a("duplo", true)]);
        // 2º desce mais de 350 ms depois do 1º subir
        let mut m = duplo(json!(["Duplo", "A"]));
        tocar(&mut m, A, 0, 100); // sobe em 100
        let r = m.tecla_desce(A, 451);
        assert!(r.saidas.is_empty() && !r.engolir && !r.apagar_anterior);
        // ...mas esse desce vira o 1º toque de um novo par
        m.tecla_sobe(A, 500);
        assert_eq!(m.tecla_desce(A, 700).saidas, vec![a("duplo", true)]);
        // exatamente 350 ms vale
        let mut m = duplo(json!(["Duplo", "A"]));
        tocar(&mut m, A, 0, 100);
        assert_eq!(m.tecla_desce(A, 450).saidas, vec![a("duplo", true)]);
    }

    #[test]
    fn outra_tecla_no_meio_nao_dispara() {
        let mut m = duplo(json!(["Duplo", "A"]));
        tocar(&mut m, A, 0, 50);
        tocar(&mut m, B, 100, 20);
        let r = m.tecla_desce(A, 200);
        assert!(r.saidas.is_empty() && !r.engolir && !r.apagar_anterior);

        // modificadora: outro modificador no meio
        let mut m = duplo(json!(["Duplo", "AltRight"]));
        tocar(&mut m, VK_RMENU, 0, 50);
        tocar(&mut m, VK_LSHIFT, 100, 20);
        assert!(m.tecla_desce(VK_RMENU, 200).saidas.is_empty());

        // modificadora: outra tecla segura junto do 1º toque
        let mut m = duplo(json!(["Duplo", "AltRight"]));
        m.tecla_desce(VK_LCONTROL, 0);
        tocar(&mut m, VK_RMENU, 10, 50);
        m.tecla_sobe(VK_LCONTROL, 80);
        assert!(m.tecla_desce(VK_RMENU, 150).saidas.is_empty());

        // letra com Ctrl segurado (Ctrl+A, Ctrl+A) não é toque duplo
        let mut m = duplo(json!(["Duplo", "A"]));
        m.tecla_desce(VK_LCONTROL, 0);
        tocar(&mut m, A, 10, 40);
        let r = m.tecla_desce(A, 100);
        assert!(r.saidas.is_empty() && !r.engolir && !r.apagar_anterior);
    }

    #[test]
    fn autorepeticao_nao_conta_como_toque() {
        // segurar a letra (repetições) não forma duplo
        let mut m = duplo(json!(["Duplo", "A"]));
        m.tecla_desce(A, 0);
        for i in 1..6 {
            let r = m.tecla_desce(A, i * 30);
            assert!(r.saidas.is_empty() && !r.engolir);
        }
        m.tecla_sobe(A, 200); // segurou por 200 ms: é um toque
        assert_eq!(m.tecla_desce(A, 300).saidas, vec![a("duplo", true)], "o duplo vem só do 2º desce real");

        // modificadora segurada com repetições
        let mut m = duplo(json!(["Duplo", "AltRight"]));
        m.tecla_desce(VK_RMENU, 0);
        for i in 1..6 {
            assert!(m.tecla_desce(VK_RMENU, i * 30).saidas.is_empty());
        }
        m.tecla_sobe(VK_RMENU, 250);
        assert!(m.tecla_desce(VK_RMENU, 5000).saidas.is_empty(), "muito tempo depois");
    }

    #[test]
    fn duplo_convive_com_atalho_segurado_da_mesma_modificadora() {
        let mut m = maquina(json!([
            {"id": "ditado", "teclas": ["AltRight"]},
            {"id": "maosLivres", "teclas": ["Duplo", "AltRight"]},
        ]));
        let (d, s) = tocar(&mut m, VK_RMENU, 0, 100);
        assert_eq!(d.saidas, vec![a("ditado", true)]);
        assert_eq!(s.saidas, vec![a("ditado", false)]);
        let r = m.tecla_desce(VK_RMENU, 200);
        assert_eq!(r.saidas, vec![a("maosLivres", true), a("ditado", true)]);
    }

    #[test]
    fn duplo_nao_atrapalha_o_combinado_nem_o_esc() {
        let mut m = maquina(json!([
            {"id": "ditado", "teclas": ["AltRight"]},
            {"id": "d", "teclas": ["Duplo", "A"]},
        ]));
        m.tecla_desce(VK_RMENU, 0);
        assert_eq!(m.tecla_desce(TAB, 10).saidas, vec![Saida::Combinado]);
        assert_eq!(m.tecla_desce(VK_ESCAPE, 20).saidas, vec![Saida::Esc]);
    }

    #[test]
    fn trocar_atalhos_solta_o_duplo_ativo() {
        let mut m = duplo(json!(["Duplo", "A"]));
        tocar(&mut m, A, 0, 50);
        m.tecla_desce(A, 100);
        assert_eq!(m.trocar_atalhos(vec![]), vec![a("duplo", false)]);
    }

    // ── Captura de atalho ────────────────────────────────────────────────────────────────────────

    fn captura() -> Maquina {
        let mut m = padrao(); // com atalhos configurados: nada deles pode disparar
        assert_eq!(m.iniciar_captura(0), Ok(vec![]));
        m
    }

    fn ok(teclas: &[&str]) -> Saida {
        Saida::Captura(Ok(teclas.iter().map(|s| s.to_string()).collect()))
    }

    fn err(msg: &str) -> Saida {
        Saida::Captura(Err(msg.into()))
    }

    #[test]
    fn captura_de_combinacao() {
        let mut m = captura();
        // desce fora de ordem e sobe em outra: sai ordenado (Ctrl, Option, Cmd, Shift, tecla)
        assert!(m.tecla_desce(VK_RSHIFT, 100).saidas.is_empty());
        assert!(m.tecla_desce(VK_LCONTROL, 120).saidas.is_empty());
        let r = m.tecla_desce(V, 140);
        assert!(r.engolir, "tecla comum é engolida na captura");
        assert!(r.saidas.is_empty(), "nenhum evento de atalho durante a captura");
        assert!(m.tecla_sobe(V, 300).engolir);
        assert!(m.tecla_sobe(VK_LCONTROL, 310).saidas.is_empty());
        let r = m.tecla_sobe(VK_RSHIFT, 320);
        assert_eq!(r.saidas, vec![ok(&["CtrlLeft", "ShiftRight", "V"])]);
        assert!(!m.capturando());
        // volta ao normal: os atalhos funcionam de novo
        assert_eq!(m.tecla_desce(VK_RMENU, 1000).saidas, vec![a("ditado", true)]);
    }

    #[test]
    fn captura_de_toque_duplo() {
        let mut m = captura();
        m.tecla_desce(VK_RMENU, 100);
        let r = m.tecla_sobe(VK_RMENU, 200);
        assert!(r.saidas.is_empty(), "espera o 2º toque");
        assert_eq!(m.proximo_prazo(), Some(200 + CAPTURA_ESPERA_2O_TOQUE_MS + 1));
        assert!(m.tecla_desce(VK_RMENU, 450).saidas.is_empty());
        assert!(m.capturando(), "só responde depois de o 2º toque subir");
        let r = m.tecla_sobe(VK_RMENU, 520);
        assert_eq!(r.saidas, vec![ok(&["Duplo", "OptionRight"])]);
        assert!(!m.capturando());
    }

    #[test]
    fn captura_de_toque_duplo_de_letra_engole_tudo() {
        let mut m = captura();
        assert!(m.tecla_desce(A, 0).engolir);
        assert!(m.tecla_sobe(A, 50).engolir);
        let r = m.tecla_desce(A, 200);
        assert!(r.engolir && !r.apagar_anterior, "na captura o 1º toque foi engolido: nada a apagar");
        let r = m.tecla_sobe(A, 250);
        assert!(r.engolir);
        assert_eq!(r.saidas, vec![ok(&["Duplo", "A"])]);
    }

    #[test]
    fn captura_de_tecla_unica_sem_segundo_toque() {
        let mut m = captura();
        m.tecla_desce(VK_LSHIFT, 100);
        m.tecla_sobe(VK_LSHIFT, 150);
        assert!(m.tempo(500).is_empty(), "ainda dentro dos 400 ms");
        assert_eq!(m.tempo(150 + 401), vec![ok(&["ShiftLeft"])]);
        assert!(!m.capturando());
        assert_eq!(m.proximo_prazo(), None);
    }

    #[test]
    fn captura_de_tecla_unica_encerra_se_outra_tecla_chegar_antes_do_prazo() {
        let mut m = captura();
        m.tecla_desce(A, 0);
        m.tecla_sobe(A, 50);
        let r = m.tecla_desce(B, 100);
        assert_eq!(r.saidas, vec![ok(&["A"])]);
        assert!(r.engolir && m.tecla_sobe(B, 150).engolir, "a tecla B não vaza");
    }

    #[test]
    fn captura_passada_a_espera_vale_mesmo_sem_o_temporizador() {
        let mut m = captura();
        m.tecla_desce(A, 0);
        m.tecla_sobe(A, 50);
        // o temporizador atrasou: o 2º desce chega depois dos 400 ms
        let r = m.tecla_desce(A, 600);
        assert_eq!(r.saidas, vec![ok(&["A"])]);
    }

    #[test]
    fn esc_cancela_a_captura() {
        let mut m = captura();
        let r = m.tecla_desce(VK_ESCAPE, 100);
        assert!(r.engolir && r.saidas.is_empty(), "Esc não emite o evento 'esc' na captura");
        m.tecla_sobe(VK_ESCAPE, 150);
        assert_eq!(m.tempo(150 + 401), vec![err(ERRO_CAPTURA_CANCELADA)]);
        // Esc duas vezes é um toque duplo de Esc, como qualquer tecla
        let mut m = captura();
        tocar(&mut m, VK_ESCAPE, 0, 50);
        m.tecla_desce(VK_ESCAPE, 100);
        assert_eq!(m.tecla_sobe(VK_ESCAPE, 150).saidas, vec![ok(&["Duplo", "Esc"])]);
    }

    #[test]
    fn captura_sem_tecla_em_10s_da_erro() {
        let mut m = captura();
        assert_eq!(m.proximo_prazo(), Some(CAPTURA_SEM_TECLA_MS));
        assert!(m.tempo(9_999).is_empty());
        assert_eq!(m.tempo(10_000), vec![err(ERRO_CAPTURA_SEM_TECLA)]);
        assert!(!m.capturando());
        // tecla apertada dentro dos 10 s: o prazo deixa de valer enquanto segura
        let mut m = captura();
        m.tecla_desce(VK_LCONTROL, 9_000);
        assert_eq!(m.proximo_prazo(), None);
        assert!(m.tempo(30_000).is_empty());
    }

    #[test]
    fn so_uma_captura_por_vez_e_cancelar() {
        let mut m = captura();
        assert_eq!(m.iniciar_captura(5), Err(ERRO_CAPTURA_EM_ANDAMENTO));
        assert_eq!(m.cancelar_captura(), vec![err(ERRO_CAPTURA_CANCELADA)]);
        assert!(m.cancelar_captura().is_empty());
        assert_eq!(m.iniciar_captura(10), Ok(vec![]));
    }

    #[test]
    fn captura_solta_atalhos_ativos_e_neutraliza_o_alt() {
        let mut m = padrao();
        m.tecla_desce(VK_RMENU, 0); // ditado descido
        assert_eq!(m.iniciar_captura(10), Ok(vec![a("ditado", false)]));
        m.tecla_sobe(VK_RMENU, 20);
        // Alt direito apertado e solto dentro da captura
        let mut m = captura();
        m.tecla_desce(VK_RMENU, 100);
        assert!(m.tecla_sobe(VK_RMENU, 150).neutralizar);
    }

    #[test]
    fn captura_ignora_tecla_sem_nome_e_autorepeticao() {
        let mut m = captura();
        let r = m.tecla_desce(0x25, 0); // seta: sem nome no protocolo
        assert!(r.engolir && r.saidas.is_empty());
        m.tecla_sobe(0x25, 10);
        assert_eq!(m.proximo_prazo(), Some(CAPTURA_SEM_TECLA_MS), "seta não conta como tecla apertada");
        // repetição de modificador segurado não vira 2º toque
        m.tecla_desce(VK_LCONTROL, 100);
        m.tecla_desce(VK_LCONTROL, 130);
        m.tecla_desce(VK_LCONTROL, 160);
        assert!(m.tecla_sobe(VK_LCONTROL, 200).saidas.is_empty());
        assert_eq!(m.tempo(700), vec![ok(&["CtrlLeft"])]);
    }
}
