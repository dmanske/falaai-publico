// Configuração central do app. Valores ajustáveis ficam AQUI, não espalhados pelo código.
// Usado pelo processo principal e pela tela (sem imports de Node ou de DOM).

/** Nome exibido (escolhido pelo Daniel em 17/10/2026). Trocar junto com "productName" no package.json. */
export const NOME_APP = "FalaAi";
export const AUTOR = "Daniel Manske";

/** Gateway de IA da Lovable (compatível com a API da OpenAI). Mesmo do almoxarifado. */
export const ENDPOINT_LOVABLE = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface ModeloIa {
  id: string;
  nome: string;
  nota: string;
  recomendado?: boolean;
}

/**
 * Modelos oferecidos na tela. Precisam aceitar áudio para o caminho "A"
 * (o mesmo modelo transcreve e refina). A tela também aceita um id digitado à mão.
 */
export const MODELOS_IA: ModeloIa[] = [
  { id: "google/gemini-3-flash-preview", nome: "Gemini 3 Flash", nota: "o mais rápido e barato no teste do almoxarifado", recomendado: true },
  { id: "google/gemini-3.8-flash", nome: "Gemini 3.8 Flash", nota: "rápido, um pouco mais lento que o 3 Flash" },
  { id: "google/gemini-3.1-pro-preview", nome: "Gemini 3.1 Pro", nota: "mais caro e mais lento; para textos difíceis" },
];

export const MODELO_PADRAO = MODELOS_IA[0].id;

/** Tempo máximo de uma chamada à IA (ms). O Typeless usa 40 s no /ai/voice_flow. */
export const TIMEOUT_IA_MS = 40_000;

// ── Ditado ────────────────────────────────────────────────────────────────────

/** Soltar Fn antes disso (ms) = toque rápido → liga o modo mãos livres. */
export const TOQUE_RAPIDO_MS = 300;
/** Gravações mais curtas que isso (ms) são descartadas (toque sem fala). */
export const GRAVACAO_MINIMA_MS = 400;
/** Limite de uma gravação (s). 6 min de WAV 16 kHz ≈ 11,5 MB. */
export const GRAVACAO_MAXIMA_S = 360;
/** Fn combinada com outra tecla até este tempo (ms) após descer = atalho do sistema, não ditado. */
export const JANELA_FN_COMBINADO_MS = 800;
/** Taxa de amostragem enviada para a IA. */
export const TAXA_AMOSTRAGEM = 16_000;
/** Por quanto tempo a pílula mostra uma mensagem de erro (ms). */
export const ERRO_PILULA_MS = 3500;
/** Quantos idiomas favoritos a tradução pode ter para trocar na hora. */
export const MAX_IDIOMAS_TRADUCAO = 4;

/** Sigla curta mostrada na pílula ("pt-BR" → "PT", "en" → "EN"). */
export function siglaIdioma(codigo: string): string {
  return codigo.split("-")[0].toUpperCase();
}

/** Sons de início/fim do ditado (item 10 do PRD). Volume de 0 a 1. */
export const VOLUME_SONS = 0.12;

// ── Janela principal ────────────────────────────────────────────────────────

/** Tamanho inicial e mínimo do hub — os mesmos do Typeless (1080×750, mín. 988×685). */
export const HUB_TAMANHO = { largura: 1080, altura: 750, minLargura: 988, minAltura: 685 };

// ── Estatísticas e dados ─────────────────────────────────────────────────────

/** Velocidade média de digitação usada no "tempo economizado" (palavras por minuto). */
export const VELOCIDADE_DIGITACAO_PPM = 40;

// ── Contexto e aprendizado ──────────────────────────────────────────────────

/** Quantos caracteres antes/depois do cursor vão de contexto para a IA. */
export const CONTEXTO_ANTES_CHARS = 800;
export const CONTEXTO_DEPOIS_CHARS = 300;
/** Por quanto tempo, depois de colar, o dicionário observa correções no campo (ms). */
export const OBSERVAR_CORRECOES_MS = 20_000;

// ── Atualizações ────────────────────────────────────────────────────────────

/** Repositório do GitHub onde ficam as versões publicadas (Releases). */
export const REPO_ATUALIZACOES = "dmanske/falaai-publico";

/** Frase falada na amostra resources/amostra-teste.wav (gerada por scripts/gerar-amostra-teste.sh). */
export const FRASE_AMOSTRA = "Teste de ditado, um, dois, três.";
/** Palavra que precisa aparecer na transcrição para o teste de áudio passar. */
export const PALAVRA_CHAVE_AMOSTRA = "ditado";
