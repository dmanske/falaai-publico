// Protocolo v3 (docs/design/PROTOCOLO_AUXILIAR.md): interpretação dos comandos e montagem das
// respostas. Lógica PURA (JSON <-> tipos), sem API do sistema.

use crate::maquina::{Atalho, FaseDuplo};
use crate::teclas::*;
use serde_json::{json, Value};
use std::collections::HashSet;

/// Marcador do toque duplo (primeiro item da lista de teclas).
pub const DUPLO: &str = "Duplo";

#[derive(Debug)]
pub enum Comando {
    /// `pedir` não tem efeito no Windows (não há permissão a pedir).
    #[allow(dead_code)]
    Permissoes { pedir: bool },
    IniciarTeclado,
    PararTeclado,
    ConfigurarAtalhos(Vec<Atalho>),
    Colar(String),
    Contexto,
    LerCampo,
    MutarSaida,
    DesmutarSaida,
    CapturarAtalho,
    CancelarCaptura,
    Sair,
}

/// Lê um nome de tecla e diz o que ele é, para montar o atalho.
fn interpretar_um(item: &Value) -> Result<Atalho, String> {
    let id = item
        .get("id")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .ok_or("Atalho sem 'id'.")?
        .to_string();
    let teclas = item
        .get("teclas")
        .and_then(Value::as_array)
        .filter(|t| !t.is_empty())
        .ok_or_else(|| format!("Atalho '{id}' sem teclas."))?;

    // Toque duplo (v3): ["Duplo", X] com UMA tecla X; "Duplo" só vale como primeiro item.
    let duplo = teclas[0].as_str() == Some(DUPLO);
    if teclas.iter().skip(1).any(|t| t.as_str() == Some(DUPLO)) {
        return Err(format!("Atalho '{id}': 'Duplo' só pode ser o primeiro item."));
    }
    if duplo && teclas.len() != 2 {
        return Err(format!("Atalho '{id}': o toque duplo vale para uma tecla só (['Duplo', tecla])."));
    }
    let teclas = if duplo { &teclas[1..] } else { &teclas[..] };

    let mut mods: Vec<(Familia, Lado)> = Vec::new();
    let mut tecla: Option<u32> = None;
    let mut nome_tecla = String::new();
    for t in teclas {
        let nome = t.as_str().ok_or_else(|| format!("Atalho '{id}': tecla inválida."))?;
        if let Some((f, lado)) = modificador_por_nome(nome) {
            if mods.iter().any(|(fam, _)| *fam == f) {
                return Err(format!("Atalho '{id}': modificador repetido ({nome})."));
            }
            mods.push((f, lado));
        } else if let Some(vk) = tecla_por_nome(nome) {
            if tecla.is_some() {
                return Err(format!("Atalho '{id}': só pode ter uma tecla comum ({nome_tecla} e {nome})."));
            }
            tecla = Some(vk);
            nome_tecla = nome.to_string();
        } else if nome == "Fn" {
            return Err(format!("Atalho '{id}': a tecla Fn não existe no Windows."));
        } else {
            return Err(format!("Atalho '{id}': tecla desconhecida ({nome})."));
        }
    }
    // Tecla comum sozinha (ex.: só "A" ou só "Space") engoliria a digitação normal — a não ser no
    // toque duplo, que só dispara no segundo toque.
    if let Some(vk) = tecla {
        if !duplo && mods.is_empty() && !eh_tecla_f(vk) {
            return Err(format!("Atalho '{id}': a tecla {nome_tecla} precisa de ao menos um modificador."));
        }
    }
    Ok(Atalho { id, mods, tecla, ativo: false, duplo, fase: FaseDuplo::Nenhum })
}

/// Converte o campo `atalhos` do comando `configurar_atalhos`. O erro vem em português.
pub fn interpretar_atalhos(bruto: &Value) -> Result<Vec<Atalho>, String> {
    let itens = bruto.as_array().ok_or("Campo 'atalhos' ausente ou inválido.")?;
    let mut ids = HashSet::new();
    let mut lista = Vec::with_capacity(itens.len());
    for item in itens {
        let a = interpretar_um(item)?;
        if !ids.insert(a.id.clone()) {
            return Err(format!("Atalho '{}' repetido.", a.id));
        }
        lista.push(a);
    }
    Ok(lista)
}

/// Interpreta uma linha do stdin. Em erro devolve (id, mensagem em português).
pub fn interpretar(linha: &str) -> Result<(Value, Comando), (Value, String)> {
    let msg: Value = serde_json::from_str(linha).map_err(|_| (Value::Null, "JSON inválido.".to_string()))?;
    let id = msg.get("id").cloned().unwrap_or(Value::Null);
    let cmd = match msg.get("cmd").and_then(Value::as_str) {
        Some(c) => c,
        None => return Err((id, "Comando ausente.".into())),
    };
    let comando = match cmd {
        "permissoes" => Comando::Permissoes { pedir: msg.get("pedir").and_then(Value::as_bool).unwrap_or(false) },
        "iniciar_teclado" => Comando::IniciarTeclado,
        "parar_teclado" => Comando::PararTeclado,
        "configurar_atalhos" => match interpretar_atalhos(msg.get("atalhos").unwrap_or(&Value::Null)) {
            Ok(l) => Comando::ConfigurarAtalhos(l),
            Err(e) => return Err((id, e)),
        },
        "colar" => match msg.get("texto").and_then(Value::as_str) {
            Some(t) => Comando::Colar(t.to_string()),
            None => return Err((id, "Campo 'texto' ausente.".into())),
        },
        "contexto" => Comando::Contexto,
        "ler_campo" => Comando::LerCampo,
        "mutar_saida" => Comando::MutarSaida,
        "desmutar_saida" => Comando::DesmutarSaida,
        "capturar_atalho" => Comando::CapturarAtalho,
        "cancelar_captura" => Comando::CancelarCaptura,
        "sair" => Comando::Sair,
        outro => return Err((id, format!("Comando desconhecido: {outro}"))),
    };
    Ok((id, comando))
}

/// Resposta de sucesso: `{id, ok:true, ...extra}`.
pub fn resposta_ok(id: &Value, extra: Value) -> Value {
    let mut r = json!({ "id": id, "ok": true });
    if let (Some(obj), Some(ext)) = (r.as_object_mut(), extra.as_object()) {
        for (k, v) in ext {
            obj.insert(k.clone(), v.clone());
        }
    }
    r
}

pub fn resposta_erro(id: &Value, erro: &str) -> Value {
    json!({ "id": id, "ok": false, "erro": erro })
}

pub fn evento_pronto() -> Value {
    json!({ "evento": "pronto", "versao": 3 })
}

pub fn evento_atalho(id: &str, desce: bool) -> Value {
    json!({ "evento": "atalho", "id": id, "estado": if desce { "desce" } else { "sobe" } })
}

/// Recorta o final de `texto` em até `max` caracteres (não parte caracteres).
pub fn ultimos_caracteres(texto: &str, max: usize) -> String {
    let total = texto.chars().count();
    if total <= max {
        return texto.to_string();
    }
    texto.chars().skip(total - max).collect()
}

/// Recorta o início de `texto` em até `max` caracteres.
pub fn primeiros_caracteres(texto: &str, max: usize) -> String {
    texto.chars().take(max).collect()
}

/// Nome amigável do app a partir do nome do executável: "Slack.exe" -> "Slack".
pub fn nome_amigavel(exe: &str) -> String {
    let base = exe.rsplit(['\\', '/']).next().unwrap_or(exe);
    match base.rsplit_once('.') {
        Some((nome, ext)) if ext.eq_ignore_ascii_case("exe") && !nome.is_empty() => nome.to_string(),
        _ => base.to_string(),
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn interpreta_comandos_simples() {
        let (id, c) = interpretar(r#"{"id":3,"cmd":"permissoes","pedir":true}"#).unwrap();
        assert_eq!(id, json!(3));
        assert!(matches!(c, Comando::Permissoes { pedir: true }));
        assert!(matches!(interpretar(r#"{"id":1,"cmd":"sair"}"#).unwrap().1, Comando::Sair));
        assert!(matches!(interpretar(r#"{"id":1,"cmd":"mutar_saida"}"#).unwrap().1, Comando::MutarSaida));
    }

    #[test]
    fn erros_em_portugues() {
        assert_eq!(interpretar("não é json").unwrap_err().1, "JSON inválido.");
        let (id, e) = interpretar(r#"{"id":9,"cmd":"voar"}"#).unwrap_err();
        assert_eq!(id, json!(9));
        assert_eq!(e, "Comando desconhecido: voar");
        assert_eq!(interpretar(r#"{"id":9}"#).unwrap_err().1, "Comando ausente.");
        assert_eq!(interpretar(r#"{"id":9,"cmd":"colar"}"#).unwrap_err().1, "Campo 'texto' ausente.");
    }

    #[test]
    fn colar_preserva_unicode() {
        let (_, c) = interpretar(r#"{"id":2,"cmd":"colar","texto":"ação 😀\n"}"#).unwrap();
        match c {
            Comando::Colar(t) => assert_eq!(t, "ação 😀\n"),
            _ => panic!(),
        }
    }

    #[test]
    fn atalhos_validos_com_nomes_do_mac_e_do_windows() {
        let l = interpretar_atalhos(&json!([
            {"id": "a", "teclas": ["OptionRight"]},
            {"id": "b", "teclas": ["AltRight", "Space"]},
            {"id": "c", "teclas": ["Cmd", "F5"]},
        ]))
        .unwrap();
        assert_eq!(l.len(), 3);
        assert_eq!(l[0].mods, vec![(Familia::Alt, Lado::Dir)]);
        assert_eq!(l[1].tecla, Some(0x20));
        assert_eq!(l[2].mods, vec![(Familia::Win, Lado::Qualquer)]);
    }

    #[test]
    fn atalhos_invalidos() {
        let e = |v: Value| interpretar_atalhos(&v).unwrap_err();
        assert!(e(json!("x")).contains("ausente"));
        assert!(e(json!([{"teclas": ["Ctrl"]}])).contains("sem 'id'"));
        assert!(e(json!([{"id": "a", "teclas": []}])).contains("sem teclas"));
        assert!(e(json!([{"id": "a", "teclas": ["Fn"]}])).contains("Fn"));
        assert!(e(json!([{"id": "a", "teclas": ["Banana"]}])).contains("desconhecida"));
        assert!(e(json!([{"id": "a", "teclas": ["Ctrl", "CtrlLeft"]}])).contains("repetido"));
        assert!(e(json!([{"id": "a", "teclas": ["Ctrl", "A", "B"]}])).contains("uma tecla comum"));
        assert!(e(json!([{"id": "a", "teclas": ["Space"]}])).contains("ao menos um modificador"));
        assert!(e(json!([{"id": "a", "teclas": ["Ctrl"]}, {"id": "a", "teclas": ["Alt"]}])).contains("repetido"));
    }

    #[test]
    fn interpreta_captura() {
        assert!(matches!(interpretar(r#"{"id":1,"cmd":"capturar_atalho"}"#).unwrap().1, Comando::CapturarAtalho));
        assert!(matches!(interpretar(r#"{"id":1,"cmd":"cancelar_captura"}"#).unwrap().1, Comando::CancelarCaptura));
    }

    #[test]
    fn toque_duplo_valido() {
        let l = interpretar_atalhos(&json!([
            {"id": "a", "teclas": ["Duplo", "OptionRight"]},
            {"id": "b", "teclas": ["Duplo", "A"]},
            {"id": "c", "teclas": ["Duplo", "Shift"]},
            {"id": "d", "teclas": ["Duplo", "F5"]},
            {"id": "e", "teclas": ["Duplo", "Space"]},
        ]))
        .unwrap();
        assert!(l.iter().all(|x| x.duplo));
        assert_eq!(l[0].mods, vec![(Familia::Alt, Lado::Dir)]);
        assert_eq!(l[0].tecla, None);
        assert_eq!(l[1].tecla, Some(0x41));
        assert!(l[1].mods.is_empty(), "letra sozinha vale no toque duplo");
        assert_eq!(l[2].mods, vec![(Familia::Shift, Lado::Qualquer)]);
        assert_eq!(l[4].tecla, Some(0x20));
    }

    #[test]
    fn toque_duplo_invalido() {
        let e = |v: Value| interpretar_atalhos(&json!([{"id": "x", "teclas": v}])).unwrap_err();
        assert!(e(json!(["Duplo"])).contains("uma tecla só"));
        assert!(e(json!(["Duplo", "A", "B"])).contains("uma tecla só"));
        assert!(e(json!(["Duplo", "Ctrl", "A"])).contains("uma tecla só"));
        assert!(e(json!(["A", "Duplo"])).contains("primeiro item"));
        assert!(e(json!(["Ctrl", "Duplo", "A"])).contains("primeiro item"));
        assert!(e(json!(["Duplo", "Duplo"])).contains("primeiro item"));
        assert!(e(json!(["Duplo", "Fn"])).contains("Fn"));
        assert!(e(json!(["Duplo", "Banana"])).contains("desconhecida"));
    }

    #[test]
    fn tecla_f_sozinha_e_permitida() {
        assert!(interpretar_atalhos(&json!([{"id": "a", "teclas": ["F13"]}])).is_ok());
    }

    #[test]
    fn respostas() {
        let r = resposta_ok(&json!(5), json!({"acessibilidade": true}));
        assert_eq!(r, json!({"id": 5, "ok": true, "acessibilidade": true}));
        assert_eq!(resposta_erro(&json!(5), "x"), json!({"id": 5, "ok": false, "erro": "x"}));
        assert_eq!(evento_pronto(), json!({"evento": "pronto", "versao": 3}));
        assert_eq!(
            evento_atalho("ditado", false),
            json!({"evento": "atalho", "id": "ditado", "estado": "sobe"})
        );
    }

    #[test]
    fn recortes_nao_partem_caracteres() {
        assert_eq!(ultimos_caracteres("abçdé", 3), "çdé");
        assert_eq!(ultimos_caracteres("ab", 3), "ab");
        assert_eq!(primeiros_caracteres("😀😀😀", 2), "😀😀");
    }

    #[test]
    fn nome_do_app() {
        assert_eq!(nome_amigavel("C:\\Program Files\\Slack\\slack.exe"), "slack");
        assert_eq!(nome_amigavel("Code.EXE"), "Code");
        assert_eq!(nome_amigavel("semextensao"), "semextensao");
    }
}
