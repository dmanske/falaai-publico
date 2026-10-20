// Ditado: segura o atalho → grava → solta → IA → cola onde está o cursor.
// Modos (atalhos configuráveis; padrão do Mac):
//  - ditado (Fn): transcreve e limpa;
//  - pergunte (Fn+Espaço): com texto selecionado, aplica a instrução falada e substitui a seleção;
//    sem seleção, responde num cartão;
//  - tradução (Fn+⇧ esq.): fala em qualquer idioma, sai no idioma escolhido.
// Segurando Fn e apertando Espaço/⇧ no meio, o modo muda. Toque rápido = mãos livres (o próximo
// toque para; com "mãos livres com toque duplo", só depois de dois toques). Esc ou ✕ cancelam (a pílula oferece "Desfazer" por alguns segundos e, com "Guardar o áudio", o ditado
// fica no Histórico como "cancelado"); ✓ termina.
// "Colar a última" cola de novo a última transcrição.
import { clipboard, ipcMain } from "electron";
import {
  APPS_SEM_LIGAR_ACESSIBILIDADE,
  AVISO_COM_ACAO_MS,
  AVISO_COPIADO_MS,
  AVISO_OCUPADO_MS,
  CONTAGEM_REGRESSIVA_S,
  CONTEXTO_ANTES_CHARS,
  CONTEXTO_CONVERSA_CHARS,
  CONTEXTO_DEPOIS_CHARS,
  CONTEXTO_TELA_CHARS,
  COPIAR_SELECAO_PRAZO_MS,
  ERRO_COM_ACAO_MS,
  ERRO_PILULA_MS,
  GRAVACAO_MAXIMA_S,
  GRAVACAO_MINIMA_MS,
  JANELA_FN_COMBINADO_MS,
  TOQUE_DUPLO_MS,
  TOQUE_RAPIDO_MS,
  atrasoAvisoDemoraMs,
  prazoIaMs,
  siglaIdioma,
} from "@shared/config";
import type { IdAtalho } from "@shared/atalhos";
import { CANAIS_PILULA, type AcaoMensagemPilula, type AcaoPilula, type AudioPilula, type ModoDitado } from "@shared/ipc";
import { abrirHub } from "../../janelas/hub";
import { mostrarCartao } from "../../janelas/cartao";
import { comandarPilula, idWebContentsPilula, mostrarEstadoPilula } from "../../janelas/pilula";
import { observarEdicao, palavrasParaPrompt } from "../dicionario";
import { concluirDitado, registrarDitado, type NovoDitado } from "../historico";
import { executarModo, type ResultadoModo } from "../ia/modos";
import type { DadosContexto } from "../ia/prompts";
import { auxiliar } from "../nativo";
import type { ContextoApp, EventoAuxiliar } from "../nativo/types";
import { garantirMicrofone } from "../permissoes";
import { lerPreferencias, salvarPreferencias } from "../preferencias";
import { deveAvisarCampoNaoEditavel } from "./lib/campoNaoEditavel";
import { extrairComandoEnviar } from "./lib/comandoEnviar";
import { deveCopiarSelecao } from "./lib/copiarSelecao";
import { ajustarEspacoInicial, limparInicio } from "./lib/espacamento";
import { textoParaHtml } from "./lib/html";
import { pareceInventado } from "./lib/textoInventado";

/** Tempo máximo para a pílula devolver o áudio depois do "parar" (ms). */
const TIMEOUT_AUDIO_MS = 8000;
/** Espera para silenciar o som de fundo depois do bipe de início (ms), senão o bipe some. */
const ATRASO_SILENCIAR_MS = 250;
/** Espera entre colar e apertar Enter no envio automático (ms): o app precisa receber o texto antes. */
const ESPERA_ENTER_MS = 180;
/** Quanto tempo o aviso "Adicionado ao dicionário" fica na pílula (ms). */
const AVISO_MS = 2500;

const NOTA_DEMORANDO = "Demorando mais que o normal…";
const NOTA_OCUPADO = "Ainda no ditado anterior · Esc cancela";
const AVISO_CANCELADO = "Cancelado. Está no Histórico.";
const AVISO_CANCELADO_SEM_HISTORICO = "Cancelado.";
const AVISO_SEM_CAMPO = "Não achei um campo de texto aqui.";
const ERRO_TEXTO_INVENTADO = "Não entendi, fale de novo.";
const ERRO_MICROFONE_MUDO = "O microfone não está mandando som. Veja se ele está mudo ou escolha outro em Configurações > Áudio.";
const ACAO_TENTAR_DE_NOVO: AcaoMensagemPilula = { id: "tentar-de-novo", rotulo: "Tentar de novo" };
const ACAO_COPIAR: AcaoMensagemPilula = { id: "copiar", rotulo: "Copiar" };
const ACAO_DESFAZER: AcaoMensagemPilula = { id: "desfazer", rotulo: "Desfazer" };

/** Tudo o que uma tentativa de IA precisa; guardado para "cancelado" e "Tentar de novo". */
interface DadosSessao {
  wav: Buffer;
  duracaoMs: number;
  modo: ModoDitado;
  ctx: ContextoApp | null;
  selecionado: string;
  idiomaDestino: string;
  base: Omit<NovoDitado, "texto" | "status" | "erro">;
  /** A gravação parou por ter chegado ao limite. */
  limiteEstourado: boolean;
  /** Item de erro que já existe no histórico: é atualizado, em vez de criar outro. */
  itemId: string | null;
}

const MODO_DO_ATALHO: Partial<Record<IdAtalho, ModoDitado>> = {
  ditado: "ditado",
  pergunte: "pergunte",
  traducao: "traducao",
};

type Estado = "ocioso" | "gravando" | "processando";

let estado: Estado = "ocioso";
let modo: ModoDitado = "ditado";
let sessao = 0;
let maosLivres = false;
let primeiroDesceuEm = 0;
/** Atalhos de ditado seguros agora (para saber quando o último foi solto). */
let seguros = new Set<IdAtalho>();
let contextoSessao: Promise<ContextoApp | null> = Promise.resolve(null);
/** Texto copiado com Cmd+C no "pergunte" (uma vez por sessão); null = não copiou ou não veio nada. */
let copiaSessao: Promise<string | null> | null = null;
let copiaIniciada = false;
/** Soltou o atalho num toque rápido e espera o 2º toque (só com "mãos livres com toque duplo"). */
let esperandoSegundoToque: IdAtalho | null = null;
let timerToqueDuplo: NodeJS.Timeout | null = null;
let silenciou = false;
/** Idioma de destino da gravação atual (modo tradução). Troca na hora com ⇧ ou clique na sigla. */
let idiomaDestino = "en";
let timerMaximo: NodeJS.Timeout | null = null;
let timerInicioContagem: NodeJS.Timeout | null = null;
let timerContagem: NodeJS.Timeout | null = null;
let timerPilula: NodeJS.Timeout | null = null;
/** Quando a gravação atual chega ao limite (ms desde 1970). */
let fimGravacaoEm = 0;
/** Segundos que faltam para o limite, só durante a contagem regressiva. */
let restanteS: number | null = null;
let estourouLimite = false;
// Processamento: dados da sessão em andamento (para salvar como "cancelado") e notas da pílula.
let processandoDados: DadosSessao | null = null;
let salvarCanceladoDaSessao: number | null = null;
let procVisual: { modo: ModoDitado; idioma: string | null } = { modo: "ditado", idioma: null };
let demorando = false;
let notaOcupado: string | null = null;
let timerDemora: NodeJS.Timeout | null = null;
let timerOcupado: NodeJS.Timeout | null = null;
/** Última tentativa que falhou na IA: "Tentar de novo" na pílula refaz com ela. */
let ultimaFalha: DadosSessao | null = null;
/** Ditado cancelado agora há pouco: "Desfazer" na pílula processa ele. Só na memória; some com o aviso. */
let canceladoRecente: DadosSessao | null = null;
/** Texto que o botão "Copiar" do aviso "Não achei um campo de texto" copia. */
let textoParaCopiar = "";
let ultimaTranscricao = "";
const esperandoAudio = new Map<number, (a: AudioPilula) => void>();

const sons = () => lerPreferencias().sons;

/** Sigla do idioma para a pílula, só no modo tradução. */
const siglaAtual = (m: ModoDitado) => (m === "traducao" ? siglaIdioma(idiomaDestino) : null);

function mostrarGravando(): void {
  mostrarEstadoPilula({ estado: "gravando", modo, maosLivres, idioma: siglaAtual(modo), restanteS });
}

function mostrarProcessando(): void {
  const nota = notaOcupado ?? (demorando ? NOTA_DEMORANDO : null);
  mostrarEstadoPilula({ estado: "processando", modo: procVisual.modo, idioma: procVisual.idioma, nota });
}

/** Passa para o próximo idioma favorito da tradução e lembra a escolha para a próxima vez. */
function proximoIdioma(): void {
  if (estado !== "gravando" || modo !== "traducao") return;
  const favoritos = lerPreferencias().idiomasTraducao;
  if (favoritos.length < 2) return;
  idiomaDestino = favoritos[(favoritos.indexOf(idiomaDestino) + 1) % favoritos.length];
  salvarPreferencias({ idiomaTraducao: idiomaDestino });
  mostrarGravando();
}

/**
 * Modo de teste (só com FALAAI_TESTE=1 no ambiente): os atalhos podem ser simulados pelo inspetor,
 * o texto NÃO é colado (fica em ultimaColagemTeste) e o contexto da tela não é lido nem observado.
 * Serve para testar o fluxo inteiro sem tocar nos apps do usuário.
 */
const MODO_TESTE = process.env.FALAAI_TESTE === "1";
let ultimaColagemTeste: string | null = null;
let ultimoEnterTeste = false;

// ── Pílula ──────────────────────────────────────────────────────────────────

function ocultar(): void {
  if (timerPilula) clearTimeout(timerPilula);
  timerPilula = null;
  // Sumiu da tela: os botões "Tentar de novo", "Copiar" e "Desfazer" não existem mais.
  ultimaFalha = null;
  canceladoRecente = null;
  textoParaCopiar = "";
  mostrarEstadoPilula({ estado: "oculta" });
}

function mostrarTemporario(tipo: "erro" | "aviso", mensagem: string, ms: number, acao?: AcaoMensagemPilula): void {
  if (timerPilula) clearTimeout(timerPilula);
  mostrarEstadoPilula({ estado: tipo, mensagem, acao });
  timerPilula = setTimeout(() => estado === "ocioso" && ocultar(), ms);
}

/** Aviso de fora do ditado (ex.: novidades da versão). Só aparece com o ditado ocioso; devolve se mostrou. */
export function mostrarAvisoNaPilula(mensagem: string, acao: AcaoMensagemPilula, ms: number): boolean {
  if (estado !== "ocioso") return false;
  mostrarTemporario("aviso", mensagem, ms, acao);
  return true;
}

/** Para a espera do 2º toque do mãos livres com toque duplo. */
function limparToqueDuplo(): void {
  if (timerToqueDuplo) clearTimeout(timerToqueDuplo);
  timerToqueDuplo = null;
  esperandoSegundoToque = null;
}

/** Para o limite, a contagem regressiva, o tempo restante e a espera do 2º toque. */
function limparTimerMaximo(): void {
  limparToqueDuplo();
  if (timerMaximo) clearTimeout(timerMaximo);
  if (timerInicioContagem) clearTimeout(timerInicioContagem);
  if (timerContagem) clearInterval(timerContagem);
  timerMaximo = timerInicioContagem = timerContagem = null;
  restanteS = null;
}

/** Zera avisos e prazos do processamento (chamar ao terminar ou cancelar). */
function limparProcessamento(): void {
  if (timerDemora) clearTimeout(timerDemora);
  if (timerOcupado) clearTimeout(timerOcupado);
  timerDemora = timerOcupado = null;
  demorando = false;
  notaOcupado = null;
  processandoDados = null;
}

function terminarComErro(mensagem: string, acao?: AcaoMensagemPilula): void {
  estado = "ocioso";
  limparTimerMaximo();
  void dessilenciar();
  mostrarTemporario("erro", mensagem, acao ? ERRO_COM_ACAO_MS : ERRO_PILULA_MS, acao);
}

// ── Som de fundo ────────────────────────────────────────────────────────────

async function silenciar(minhaSessao: number): Promise<void> {
  if (!lerPreferencias().silenciarFundo) return;
  await new Promise((r) => setTimeout(r, ATRASO_SILENCIAR_MS));
  if (sessao !== minhaSessao || estado !== "gravando") return;
  const r = await auxiliar.enviar({ cmd: "mutar_saida" });
  silenciou = r.ok;
}

async function dessilenciar(): Promise<void> {
  if (!silenciou) return;
  silenciou = false;
  await auxiliar.enviar({ cmd: "desmutar_saida" });
}

// ── Gravação ────────────────────────────────────────────────────────────────

async function iniciar(novoModo: ModoDitado, atalho: IdAtalho): Promise<void> {
  estado = "gravando";
  modo = novoModo;
  maosLivres = false;
  seguros = new Set([atalho]);
  const minhaSessao = ++sessao;
  if (timerPilula) clearTimeout(timerPilula);
  limparTimerMaximo();
  limparProcessamento();
  estourouLimite = false;
  ultimaFalha = null;
  canceladoRecente = null;
  textoParaCopiar = "";
  idiomaDestino = lerPreferencias().idiomaTraducao;
  mostrarGravando();

  copiaSessao = null;
  copiaIniciada = false;

  // Contexto lido já no início: o campo e a seleção ainda são os do usuário.
  const prefs = lerPreferencias();
  const lerMais = prefs.usarContexto && prefs.lerTela;
  contextoSessao = MODO_TESTE
    ? Promise.resolve(null)
    : auxiliar
        .enviar({
          cmd: "contexto",
          extras: {
            antes: CONTEXTO_ANTES_CHARS,
            depois: CONTEXTO_DEPOIS_CHARS,
            conversa: lerMais ? CONTEXTO_CONVERSA_CHARS : 0,
            tela: lerMais ? CONTEXTO_TELA_CHARS : 0,
            ligarAcessibilidade: prefs.usarContexto,
            naoLigarEm: APPS_SEM_LIGAR_ACESSIBILIDADE,
          },
        })
        // ok:false (ex.: Windows v3 ignora os extras; auxiliar caído) = sem contexto, sem mensagem.
        .then((r) => (r.ok ? (r as unknown as ContextoApp) : null))
        .catch(() => null);
  if (novoModo === "pergunte") copiarSelecaoSeNecessario(minhaSessao);

  if (!(await garantirMicrofone())) return terminarComErro("Sem permissão de microfone. Veja as Configurações.");
  if (sessao !== minhaSessao || estado !== "gravando") return; // cancelado enquanto pedia permissão
  comandarPilula({ acao: "iniciar", sessao: minhaSessao, sons: sons(), microfoneId: lerPreferencias().microfoneId });
  void silenciar(minhaSessao);
  fimGravacaoEm = Date.now() + GRAVACAO_MAXIMA_S * 1000;
  timerMaximo = setTimeout(() => {
    estourouLimite = true;
    void parar();
  }, GRAVACAO_MAXIMA_S * 1000);
  timerInicioContagem = setTimeout(iniciarContagem, Math.max(0, GRAVACAO_MAXIMA_S - CONTAGEM_REGRESSIVA_S) * 1000);
}

/**
 * No "pergunte", se a Acessibilidade não leu o campo, aperta Cmd+C UMA vez por sessão e guarda a
 * promessa do texto (montarDados espera por ela). Chamada ao iniciar no pergunte e na troca de modo.
 */
function copiarSelecaoSeNecessario(minhaSessao: number): void {
  if (copiaIniciada || MODO_TESTE || process.platform !== "darwin" || !lerPreferencias().copiarSelecao) return;
  copiaIniciada = true;
  copiaSessao = contextoSessao.then(async (ctx) => {
    // Sessão acabou ou o modo mudou enquanto o contexto chegava: não mexe na área de transferência.
    if (sessao !== minhaSessao || estado === "ocioso" || modo !== "pergunte") return null;
    if (!deveCopiarSelecao(ctx)) return null;
    const r = await auxiliar.enviar({ cmd: "copiar_selecao", prazoMs: COPIAR_SELECAO_PRAZO_MS });
    return r.ok && typeof r.texto === "string" ? r.texto : null;
  }).catch(() => null);
}

/** Nos últimos segundos, a pílula mostra o tempo que falta, atualizado a cada segundo. */
function iniciarContagem(): void {
  const atualizar = () => {
    restanteS = Math.max(0, Math.ceil((fimGravacaoEm - Date.now()) / 1000));
    if (estado === "gravando") mostrarGravando();
  };
  atualizar();
  timerContagem = setInterval(atualizar, 1000);
}

/**
 * Cancela o ditado. `salvar` (Esc e ✕): a pílula oferece "Desfazer" e, com `guardarAudio` ligado, o
 * áudio vai para o Histórico como "cancelado". O atalho do sistema (Fn+Delete…), o microfone mudo e o
 * toque sem querer (mãos livres com toque duplo) não oferecem nada.
 */
function cancelar(salvar: boolean): void {
  if (estado === "gravando") {
    const s = sessao;
    const m = modo;
    const idioma = idiomaDestino;
    const ctxDaSessao = contextoSessao;
    const copiaDaSessao = copiaSessao;
    // O estado volta para "ocioso" já (abaixo): o áudio chega depois, sem travar um novo ditado.
    if (salvar) {
      void esperarAudio(s).then(async (a) => {
        if (!a.ok || a.duracaoMs < GRAVACAO_MINIMA_MS) return;
        oferecerDesfazer(await montarDados(a, m, ctxDaSessao, copiaDaSessao, idioma, false));
      });
    }
    comandarPilula({ acao: "cancelar", sessao: s, sons: sons(), devolverAudio: salvar });
  } else if (estado === "processando") {
    const dados = processandoDados;
    // Áudio ainda sendo convertido pela pílula: parar() oferece o "Desfazer" quando ele chegar.
    salvarCanceladoDaSessao = salvar && !dados ? sessao : null;
    limparProcessamento();
    // A resposta da IA ainda vai chegar, mas com outra sessão ela é ignorada (ver processar()).
    sessao++;
    estado = "ocioso";
    limparTimerMaximo();
    void dessilenciar();
    ocultar();
    if (salvar && dados) oferecerDesfazer(dados);
    return;
  } else {
    return;
  }
  estado = "ocioso";
  limparTimerMaximo();
  void dessilenciar();
  ocultar();
}

/**
 * Ditado cancelado: com `guardarAudio`, vai para o Histórico como "cancelado" (sem texto, com áudio).
 * Com o app livre, a pílula mostra "Cancelado." com "Desfazer"; o áudio fica só na memória até o aviso sumir.
 */
function oferecerDesfazer(dados: DadosSessao): void {
  const guardar = lerPreferencias().guardarAudio;
  // Erro refeito com "Tentar de novo" já tem item no histórico: não cria um cancelado repetido.
  let itemId = dados.itemId;
  if (guardar && !itemId) itemId = registrarDitado({ ...dados.base, texto: "", status: "cancelado", erro: null })?.id ?? null;
  if (estado !== "ocioso") return; // um novo ditado já começou: nada de "Desfazer"
  canceladoRecente = { ...dados, itemId };
  mostrarTemporario("aviso", guardar ? AVISO_CANCELADO : AVISO_CANCELADO_SEM_HISTORICO, AVISO_COM_ACAO_MS, ACAO_DESFAZER);
}

function esperarAudio(s: number): Promise<AudioPilula> {
  return new Promise((resolver) => {
    const timer = setTimeout(() => {
      esperandoAudio.delete(s);
      resolver({ sessao: s, ok: false, erro: "A gravação não terminou a tempo." });
    }, TIMEOUT_AUDIO_MS);
    esperandoAudio.set(s, (a) => {
      clearTimeout(timer);
      resolver(a);
    });
  });
}

function dadosDoContexto(ctx: ContextoApp | null): DadosContexto {
  const prefs = lerPreferencias();
  const c = prefs.usarContexto ? ctx : null;
  return {
    app: c?.app?.nome ?? null,
    janela: c?.app?.janela ?? null,
    url: c?.navegador?.url ?? null,
    placeholder: c?.campo?.placeholder ?? null,
    antes: c?.campo?.antes ?? "",
    depois: c?.campo?.depois ?? "",
    conversa: prefs.lerTela ? (c?.conversa ?? null) : null,
    tela: prefs.lerTela ? (c?.tela ?? null) : null,
    idiomas: prefs.idiomas,
    dicionario: palavrasParaPrompt(),
  };
}

async function montarDados(
  audio: Extract<AudioPilula, { ok: true }>,
  meuModo: ModoDitado,
  ctxPromise: Promise<ContextoApp | null>,
  copiaPromise: Promise<string | null> | null,
  idioma: string,
  limiteEstourado: boolean,
): Promise<DadosSessao> {
  const ctx = await ctxPromise;
  let selecionado = ctx?.campo?.selecionado ?? "";
  // Seleção que a Acessibilidade não deu: usa o texto copiado com Cmd+C (só o "pergunte" usa a seleção).
  if (!selecionado.trim() && meuModo === "pergunte" && copiaPromise) selecionado = (await copiaPromise.catch(() => null)) ?? "";
  const wav = Buffer.from(audio.wav);
  return {
    wav,
    duracaoMs: audio.duracaoMs,
    modo: meuModo,
    ctx,
    selecionado,
    idiomaDestino: idioma,
    limiteEstourado,
    itemId: null,
    base: {
      modo: meuModo,
      textoSelecionado: meuModo === "pergunte" && selecionado ? selecionado : null,
      duracaoMs: audio.duracaoMs,
      app: ctx?.app?.nome ?? null,
      appId: ctx?.app?.appId ?? null,
      url: ctx?.navegador?.url ?? null,
      wav,
    },
  };
}

/** Roda um trecho da sessão sem deixar o app preso em "processando" se algo lançar exceção. */
async function protegido(minhaSessao: number, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error("[ditado] falha inesperada", e);
    if (sessao === minhaSessao && estado === "processando") terminarComErro("Algo deu errado. Tente de novo.");
  } finally {
    if (sessao === minhaSessao) limparProcessamento();
  }
}

async function parar(): Promise<void> {
  if (estado !== "gravando") return;
  estado = "processando";
  const limiteEstourado = estourouLimite;
  estourouLimite = false;
  limparTimerMaximo();
  const minhaSessao = sessao;
  const meuModo = modo;
  const meuIdioma = idiomaDestino;
  const ctxDaSessao = contextoSessao;
  const copiaDaSessao = copiaSessao;
  procVisual = { modo: meuModo, idioma: siglaAtual(meuModo) };
  demorando = false;
  notaOcupado = null;
  await protegido(minhaSessao, async () => {
    await dessilenciar(); // antes do bipe de fim
    mostrarProcessando();
    const promessa = esperarAudio(minhaSessao);
    comandarPilula({ acao: "parar", sessao: minhaSessao, sons: sons() });
    const audio = await promessa;
    const cancelado = () => sessao !== minhaSessao; // ✕/Esc enquanto a pílula convertia

    if (!audio.ok) return cancelado() ? undefined : terminarComErro(audio.erro);
    if (audio.duracaoMs < GRAVACAO_MINIMA_MS) {
      if (cancelado()) return;
      estado = "ocioso";
      return ocultar();
    }

    const dados = await montarDados(audio, meuModo, ctxDaSessao, copiaDaSessao, meuIdioma, limiteEstourado);
    if (cancelado()) {
      if (salvarCanceladoDaSessao === minhaSessao) {
        salvarCanceladoDaSessao = null;
        oferecerDesfazer(dados);
      }
      return;
    }
    await processar(dados, minhaSessao);
  });
}

/** Manda o áudio para a IA (com prazo proporcional) e segue para o pós-IA. Usada também pelo "Tentar de novo". */
async function processar(dados: DadosSessao, minhaSessao: number): Promise<void> {
  processandoDados = dados;
  timerDemora = setTimeout(() => {
    if (sessao !== minhaSessao || estado !== "processando") return;
    demorando = true;
    mostrarProcessando();
  }, atrasoAvisoDemoraMs(dados.duracaoMs, dados.selecionado.length));

  const r = await executarModo({
    wav: dados.wav,
    modo: dados.modo,
    contexto: dadosDoContexto(dados.ctx),
    selecionado: dados.selecionado,
    idiomaDestino: dados.idiomaDestino,
    timeoutMs: prazoIaMs(dados.duracaoMs),
  });
  if (sessao !== minhaSessao) return; // cancelado (✕/Esc) enquanto a IA respondia
  limparProcessamento();

  if (!r.ok) {
    // Registra o erro uma vez só: na nova tentativa o mesmo item é reaproveitado.
    const itemId = dados.itemId ?? registrarDitado({ ...dados.base, texto: "", status: "erro", erro: r.erro })?.id ?? null;
    ultimaFalha = { ...dados, itemId };
    return terminarComErro(r.erro, ACAO_TENTAR_DE_NOVO);
  }
  await aposIa(dados, r);
}

/** Guarda o resultado no histórico: atualiza o item de erro (nova tentativa) ou cria um novo. */
function salvarResultado(dados: DadosSessao, texto: string): void {
  if (dados.itemId && concluirDitado(dados.itemId, texto)) return;
  registrarDitado({ ...dados.base, texto, status: "ok", erro: null });
}

/** Tudo o que acontece depois que a IA respondeu: histórico, cartão ou colagem, envio, aprendizado. */
async function aposIa(dados: DadosSessao, r: Extract<ResultadoModo, { ok: true }>): Promise<void> {
  const { base, ctx } = dados;
  const meuModo = dados.modo;

  if (r.acao === "cartao") {
    salvarResultado(dados, r.resposta);
    mostrarCartao({ pergunta: r.pergunta, resposta: r.resposta });
    estado = "ocioso";
    return ocultar();
  }

  if (!r.texto) return terminarComErro("Não entendi nenhuma fala.");
  // Mais palavras do que dá para falar nesse tempo de áudio: a IA inventou. Não cola nem guarda.
  if (meuModo !== "pergunte" && pareceInventado(r.texto, dados.duracaoMs)) return terminarComErro(ERRO_TEXTO_INVENTADO);
  const antes = ctx?.campo?.antes ?? "";
  const prefs = lerPreferencias();
  // Envio automático: comando de voz no fim da fala ("…Enviar.") ou app marcado nas Configurações.
  const comando = meuModo !== "pergunte" && prefs.enviarPorVoz ? extrairComandoEnviar(r.texto) : { texto: r.texto, enviar: false };
  const enviar = comando.enviar || (!!base.appId && prefs.enviarNosApps.includes(base.appId));
  if (!comando.texto && !comando.enviar) return terminarComErro("Não entendi nenhuma fala.");
  const texto = meuModo === "pergunte" ? comando.texto : limparInicio(antes, comando.texto);
  // Substituindo uma seleção, o texto entra no lugar dela: não mexe no espaço.
  const final = meuModo === "pergunte" ? texto : ajustarEspacoInicial(antes, texto);
  if (texto) {
    ultimaTranscricao = texto;
    salvarResultado(dados, texto);
  }

  // Listas viram HTML para colar como lista de verdade; o auxiliar cai no texto nos apps que não aceitam.
  const html = prefs.colarFormatado && final ? textoParaHtml(final) : null;
  // Só o comando ("Enviar.") sem texto: nada a colar, só aperta Enter.
  const colou = !final
    ? { ok: true, erro: undefined }
    : MODO_TESTE
      ? ((ultimaColagemTeste = final), { ok: true, erro: undefined })
      : await auxiliar.enviar({ cmd: "colar", texto: final, html: html ?? undefined });
  if (!colou.ok) {
    // Não deu para colar sozinho: deixa na área de transferência para o usuário colar.
    clipboard.writeText(texto);
    return terminarComErro(`${colou.erro ?? "Não consegui colar."} O texto foi copiado: cole com Cmd+V.`);
  }
  estado = "ocioso";

  // Colou, mas o app não tem campo de texto à vista: oferece copiar (só Mac; o Windows não informa isso).
  const semCampo =
    process.platform === "darwin" &&
    !MODO_TESTE &&
    meuModo !== "pergunte" &&
    !!final &&
    deveAvisarCampoNaoEditavel(ctx, base.appId, base.url);
  if (semCampo) {
    textoParaCopiar = texto;
    mostrarTemporario("aviso", AVISO_SEM_CAMPO, AVISO_COM_ACAO_MS, ACAO_COPIAR);
  } else if (dados.limiteEstourado) {
    mostrarTemporario("aviso", `Chegou ao limite de ${Math.round(GRAVACAO_MAXIMA_S / 60)} min: o ditado foi encerrado.`, ERRO_PILULA_MS);
  } else {
    ocultar();
  }

  if (enviar) {
    if (MODO_TESTE) ultimoEnterTeste = true;
    else setTimeout(() => void auxiliar.enviar({ cmd: "apertar_enter" }), final ? ESPERA_ENTER_MS : 0);
  }

  if (meuModo === "ditado" && texto && !enviar && !MODO_TESTE && !semCampo) {
    observarEdicao(final.trim(), base.appId, (termos) => {
      if (estado === "ocioso") mostrarTemporario("aviso", `Adicionado ao dicionário: ${termos.join(", ")}`, AVISO_MS);
    });
  }
}

/** Manda de novo para a IA um ditado já gravado (mesmo áudio e contexto) e segue o caminho normal. */
function refazer(dados: DadosSessao): void {
  ultimaFalha = null;
  canceladoRecente = null;
  textoParaCopiar = "";
  estado = "processando";
  const minhaSessao = ++sessao;
  if (timerPilula) clearTimeout(timerPilula);
  timerPilula = null;
  procVisual = { modo: dados.modo, idioma: dados.modo === "traducao" ? siglaIdioma(dados.idiomaDestino) : null };
  demorando = false;
  notaOcupado = null;
  mostrarProcessando();
  void protegido(minhaSessao, () => processar(dados, minhaSessao));
}

/** "Tentar de novo" do erro da IA. */
function tentarDeNovo(): void {
  if (estado === "ocioso" && ultimaFalha) refazer(ultimaFalha);
}

/** "Desfazer" do cancelamento: processa e cola o ditado como se não tivesse sido cancelado. */
function desfazerCancelamento(): void {
  if (estado === "ocioso" && canceladoRecente) refazer(canceladoRecente);
}

/** O botão "Copiar" do aviso "Não achei um campo de texto aqui". */
function copiarTexto(): void {
  if (estado !== "ocioso" || !textoParaCopiar) return;
  clipboard.writeText(textoParaCopiar);
  textoParaCopiar = "";
  mostrarTemporario("aviso", "Copiado.", AVISO_COPIADO_MS);
}

/** Atalho de ditado apertado com o anterior ainda processando: avisa por um instante. */
function avisarOcupado(): void {
  notaOcupado = NOTA_OCUPADO;
  mostrarProcessando();
  if (timerOcupado) clearTimeout(timerOcupado);
  timerOcupado = setTimeout(() => {
    timerOcupado = null;
    notaOcupado = null;
    if (estado === "processando") mostrarProcessando();
  }, AVISO_OCUPADO_MS);
}

// ── Eventos do teclado ──────────────────────────────────────────────────────

function aoAtalho(id: IdAtalho, desceu: boolean): void {
  const agora = Date.now();
  if (id === "colarUltima") {
    if (desceu && estado === "ocioso" && ultimaTranscricao) void auxiliar.enviar({ cmd: "colar", texto: ultimaTranscricao });
    return;
  }
  const modoDoAtalho = MODO_DO_ATALHO[id];
  if (!modoDoAtalho) return;

  if (desceu) {
    seguros.add(id);
    // 2º toque no prazo: liga o mãos livres. Outro atalho no meio desiste da espera e segue o fluxo normal.
    if (estado === "gravando" && esperandoSegundoToque !== null) {
      const mesmo = esperandoSegundoToque === id;
      limparToqueDuplo();
      if (mesmo) {
        maosLivres = true;
        mostrarGravando();
        return;
      }
    }
    if (estado === "ocioso") {
      primeiroDesceuEm = agora;
      void iniciar(modoDoAtalho, id);
    } else if (estado === "gravando") {
      if (maosLivres) void parar();
      else if (modoDoAtalho !== modo) {
        // Ex.: segurando Fn (ditado) e apertou Espaço → vira "pergunte".
        modo = modoDoAtalho;
        if (modo === "pergunte") copiarSelecaoSeNecessario(sessao);
        mostrarGravando();
      } else if (modo === "traducao") {
        // Já traduzindo e apertou ⇧ de novo (ainda segurando Fn): próximo idioma favorito.
        proximoIdioma();
      }
    } else if (estado === "processando") {
      avisarOcupado();
    }
    return;
  }

  seguros.delete(id);
  if (estado !== "gravando" || maosLivres || seguros.size > 0) return;
  if (agora - primeiroDesceuEm < TOQUE_RAPIDO_MS) {
    if (!lerPreferencias().maosLivresComToqueDuplo) {
      maosLivres = true;
      mostrarGravando();
      return;
    }
    // Toque duplo: a gravação segue; sem o 2º toque no prazo foi um toque sem querer (cancela sem salvar).
    const minhaSessao = sessao;
    esperandoSegundoToque = id;
    timerToqueDuplo = setTimeout(() => {
      timerToqueDuplo = null;
      esperandoSegundoToque = null;
      if (sessao === minhaSessao && estado === "gravando" && !maosLivres) cancelar(false);
    }, TOQUE_DUPLO_MS);
  } else {
    void parar();
  }
}

function aoEvento(ev: EventoAuxiliar): void {
  switch (ev.evento) {
    case "atalho":
      aoAtalho(ev.id, ev.estado === "desce");
      break;
    case "combinado":
      // Fn usada como modificador (Fn+Delete, Fn+F5…): não era ditado.
      if (estado === "gravando" && !maosLivres && Date.now() - primeiroDesceuEm < JANELA_FN_COMBINADO_MS) cancelar(false);
      break;
    case "esc":
      cancelar(true);
      break;
  }
}

export function iniciarDitado(): void {
  auxiliar.on("evento", aoEvento);
  if (MODO_TESTE) {
    (globalThis as Record<string, unknown>).__falaaiTeste = {
      evento: aoEvento,
      ultimaColagem: () => ultimaColagemTeste,
      /** Envio automático no modo de teste: o Enter não é apertado de verdade, só marcado aqui. */
      ultimoEnter: () => {
        const v = ultimoEnterTeste;
        ultimoEnterTeste = false;
        return v;
      },
      estado: () => ({ estado, modo, maosLivres }),
    };
  }
  ipcMain.on(CANAIS_PILULA.AUDIO, (e, a: AudioPilula) => {
    if (e.sender.id !== idWebContentsPilula()) return;
    esperandoAudio.get(a.sessao)?.(a);
    esperandoAudio.delete(a.sessao);
  });
  ipcMain.on(CANAIS_PILULA.ACAO, (e, acao: AcaoPilula) => {
    if (e.sender.id !== idWebContentsPilula()) return;
    switch (acao) {
      case "confirmar":
        void parar();
        break;
      case "cancelar":
        cancelar(true);
        break;
      case "proximo-idioma":
        proximoIdioma();
        break;
      case "microfone-mudo":
        // Sem sinal nenhum: não adianta continuar. Cancela sem salvar (não há o que reprocessar).
        if (estado === "gravando") {
          cancelar(false);
          mostrarTemporario("erro", ERRO_MICROFONE_MUDO, ERRO_COM_ACAO_MS);
        }
        break;
      case "tentar-de-novo":
        tentarDeNovo();
        break;
      case "desfazer":
        desfazerCancelamento();
        break;
      case "copiar":
        copiarTexto();
        break;
      case "ver-novidades":
        abrirHub("novidades");
        if (estado === "ocioso") ocultar();
        break;
    }
  });
}
