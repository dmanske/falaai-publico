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
/** Prazo extra por duração do áudio: ditado longo ganha mais tempo (1 = 1 s de prazo por 1 s de fala). */
export const FATOR_PRAZO_AUDIO = 1;

/** Prazo da IA para um áudio: nunca menos que TIMEOUT_IA_MS; áudio longo ganha mais. */
export function prazoIaMs(duracaoAudioMs: number): number {
  return Math.max(TIMEOUT_IA_MS, duracaoAudioMs * FATOR_PRAZO_AUDIO);
}

/** Base do aviso "Demorando mais que o normal…" (ms). Escolha nossa; o resto da fórmula é a do Typeless. */
export const AVISO_DEMORA_BASE_MS = 8000;

/** Depois de quanto tempo processando a pílula avisa que está demorando (ms). */
export function atrasoAvisoDemoraMs(duracaoAudioMs: number, caracteresSelecionados: number): number {
  const blocosAudio = Math.ceil(duracaoAudioMs / 1000 / 30);
  const blocosTexto = Math.ceil(caracteresSelecionados / 1000);
  return AVISO_DEMORA_BASE_MS + blocosAudio * 500 + blocosTexto * 500;
}

// ── Ditado ────────────────────────────────────────────────────────────────────

/** Soltar Fn antes disso (ms) = toque rápido → liga o modo mãos livres. */
export const TOQUE_RAPIDO_MS = 300;
/** Mãos livres com toque duplo (opção): prazo (ms) para o 2º toque depois do 1º. Valor do Typeless. */
export const TOQUE_DUPLO_MS = 400;
/** Gravações mais curtas que isso (ms) são descartadas (toque sem fala). */
export const GRAVACAO_MINIMA_MS = 400;
/**
 * Com menos fala que isso (s), medida no próprio computador (ia/ritmo), o áudio nem vai para a IA:
 * "Não entendi nenhuma fala". Com quase nada de fala, a IA inventava um texto a partir da tela (20/10/2026).
 */
export const FALA_MINIMA_IA_S = 0.2;
/**
 * Texto com mais palavras que isso por segundo de áudio (mais a folga) foi inventado pela IA e não é colado.
 * Histórico do Daniel em 20/10/2026: de 1 a 4 palavras/s; o texto inventado deu 46 (39 palavras em 0,84 s).
 */
export const PALAVRAS_POR_SEGUNDO_MAX = 6;
/** Palavras a mais toleradas pela conta acima, para áudios muito curtos ("Ok, valeu." em 0,5 s). */
export const FOLGA_PALAVRAS = 2;
/** Limite de uma gravação (s). 6 min de WAV 16 kHz ≈ 11,5 MB. */
export const GRAVACAO_MAXIMA_S = 360;
/** Nos últimos segundos antes do limite, a pílula mostra o tempo que falta. */
export const CONTAGEM_REGRESSIVA_S = 60;

/** "0:42" a partir de segundos restantes. */
export function formatarTempoRestante(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Sem nenhuma amostra de áudio diferente de zero por tanto tempo (ms), o microfone é dado como mudo. */
export const MICROFONE_MUDO_MS = 5000;
/** Fn combinada com outra tecla até este tempo (ms) após descer = atalho do sistema, não ditado. */
export const JANELA_FN_COMBINADO_MS = 800;
/** Taxa de amostragem enviada para a IA. */
export const TAXA_AMOSTRAGEM = 16_000;
/** Por quanto tempo a pílula mostra uma mensagem de erro (ms). */
export const ERRO_PILULA_MS = 3500;
/** Erro com botão (ex.: "Tentar de novo") fica mais tempo na pílula (ms). */
export const ERRO_COM_ACAO_MS = 8000;
/** Aviso com botão (ex.: "Copiar") fica este tempo na pílula (ms). */
export const AVISO_COM_ACAO_MS = 6000;
/** Depois de abrir o app, quanto esperar até avisar das novidades (ms): a pílula precisa ter carregado. */
export const AVISO_NOVIDADES_ATRASO_MS = 4000;
/** Quanto tempo o aviso "FalaAi atualizado" fica na pílula (ms). */
export const AVISO_NOVIDADES_MS = 10_000;
/** Se o ditado estiver em uso na hora do aviso, tenta de novo depois deste intervalo (ms)... */
export const AVISO_NOVIDADES_REPETIR_MS = 5000;
/** ...até este número de tentativas. */
export const AVISO_NOVIDADES_TENTATIVAS = 5;
/** Quanto tempo "Copiado." aparece (ms). */
export const AVISO_COPIADO_MS = 1500;
/** Quanto tempo a nota "Ainda no ditado anterior" aparece (ms). */
export const AVISO_OCUPADO_MS = 2500;

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
/** Caracteres da conversa em volta do campo e do texto da janela enviados à IA (valores do Typeless). */
export const CONTEXTO_CONVERSA_CHARS = 1000;
export const CONTEXTO_TELA_CHARS = 10_000;
/**
 * Editores de código: ligar a acessibilidade neles pode ativar o "modo leitor de tela" (muda o
 * comportamento do editor), então o auxiliar não liga a árvore de acessibilidade nesses apps.
 */
export const APPS_SEM_LIGAR_ACESSIBILIDADE = [
  "com.microsoft.VSCode",
  "com.microsoft.VSCodeInsiders",
  "com.vscodium",
  "dev.kiro.desktop",
  "com.todesktop.230313mzl4w4u92", // Cursor
  "com.exafunction.windsurf",
  "com.stablyai.orca",
];
/** Prazo (ms) da cópia da seleção por Cmd+C no "pergunte" (o auxiliar aceita de 50 a 1000). */
export const COPIAR_SELECAO_PRAZO_MS = 300;
/**
 * Apps em que Cmd+C SEM seleção copia a linha inteira: o "pergunte" substituiria a linha, então
 * nunca se simula a cópia neles. Soma dos editores acima e destes; ver também PREFIXOS_….
 */
export const APPS_COPIAM_LINHA_SEM_SELECAO = [...APPS_SEM_LIGAR_ACESSIBILIDADE, "com.sublimetext.4", "dev.zed.Zed"];
/** Qualquer app cujo bundle id começa com isto também copia a linha (família JetBrains). */
export const PREFIXOS_COPIAM_LINHA_SEM_SELECAO = ["com.jetbrains."];
/** Por quanto tempo, depois de colar, o dicionário observa correções no campo (ms). */
export const OBSERVAR_CORRECOES_MS = 20_000;

// ── Atualizações ────────────────────────────────────────────────────────────

/** Repositório do GitHub onde ficam as versões publicadas (Releases). */
export const REPO_ATUALIZACOES = "dmanske/falaai-publico";

/** Frase falada na amostra resources/amostra-teste.wav (gerada por scripts/gerar-amostra-teste.sh). */
export const FRASE_AMOSTRA = "Teste de ditado, um, dois, três.";
/** Palavra que precisa aparecer na transcrição para o teste de áudio passar. */
export const PALAVRA_CHAVE_AMOSTRA = "ditado";

// ── Campo de texto não encontrado (lista do Typeless 2.8.2) ─────────────────────

/** Apps em que a colagem costuma funcionar mesmo sem o macOS enxergar um campo de texto. */
export const APPS_INSERCAO_MELHOR_ESFORCO = [
  "com.sublimetext.4",
  "com.tencent.xinWeChat",
  "com.microsoft.Excel",
  "com.kingsoft.wpsoffice.mac",
  "dev.zed.Zed",
];
/** Apps que sempre aceitam texto: nunca mostrar "Não achei um campo de texto". */
export const APPS_SEMPRE_GRAVAVEIS = [
  "com.todesktop.230313mzl4w4u92",
  "com.tinyspeck.slackmacgap",
  "com.apple.mail",
  "com.figma.Desktop",
  "com.openai.atlas",
  "com.conductor.app",
  "com.github.wez.wezterm",
  "org.mozilla.thunderbird",
  "jp.naver.line.mac",
];
/** Páginas (prefixo da URL) em que a colagem costuma funcionar. */
export const URLS_INSERCAO_MELHOR_ESFORCO = ["https://docs.google.com/document/d"];
/** Páginas (prefixo da URL) que sempre aceitam texto. */
export const URLS_SEMPRE_GRAVAVEIS = ["https://www.figma.com/design/"];
