// Clubes que podem dar o tema da pílula (e, se o usuário quiser, do app). São só dados: o visual de
// cada clube sai de coresClube.ts a partir de `cores` e `padrao`, então um clube novo é UMA linha aqui
// mais o arquivo do escudo em src/renderer/src/assets/escudos/ (ver docs/modulos/pilula-estilos.md).
import type { EstiloPilula } from "../ipc/preferencias";

export type PadraoCamisa =
  | "liso"
  | "listras-verticais"
  | "listras-horizontais"
  | "faixa-diagonal"
  | "faixa-horizontal"
  | "meio-a-meio";

export type VarianteClube = "camisa" | "escura" | "faixa";

export interface Clube {
  /** Identificador estável salvo nas preferências (minúsculo, sem acento). */
  id: string;
  nome: string;
  nomeCompleto: string;
  serie: "A";
  /** Sigla do estado (UF). */
  estado: string;
  /** Cores do clube em hex, da mais importante para a menos; a primeira é a "principal". */
  cores: string[];
  padrao: PadraoCamisa;
  /** Nome do arquivo em src/renderer/src/assets/escudos/ (ex.: "flamengo.svg"); null = sem escudo. */
  escudo: string | null;
}

// Os 20 clubes da Série A de 2026 (lista da Wikipedia, 17/10/2026). Cores e padrão da camisa 1; escudos
// em src/renderer/src/assets/escudos/ (origem e licença em assets/LICENCAS.md). Para um clube novo,
// basta uma entrada aqui e o arquivo do escudo.
export const CLUBES: readonly Clube[] = [
  {
    id: "athletico-pr",
    nome: "Athletico-PR",
    nomeCompleto: "Club Athletico Paranaense",
    serie: "A",
    estado: "PR",
    cores: ["#E30613", "#000000"],
    padrao: "listras-horizontais",
    escudo: "athletico-pr.svg",
  },
  {
    id: "atletico-mg",
    nome: "Atlético-MG",
    nomeCompleto: "Clube Atlético Mineiro",
    serie: "A",
    estado: "MG",
    cores: ["#000000", "#FFFFFF"],
    padrao: "listras-verticais",
    escudo: "atletico-mg.svg",
  },
  {
    id: "bahia",
    nome: "Bahia",
    nomeCompleto: "Esporte Clube Bahia",
    serie: "A",
    estado: "BA",
    cores: ["#005BAA", "#E30613", "#FFFFFF"],
    padrao: "listras-horizontais",
    escudo: "bahia.svg",
  },
  {
    id: "botafogo",
    nome: "Botafogo",
    nomeCompleto: "Botafogo de Futebol e Regatas",
    serie: "A",
    estado: "RJ",
    cores: ["#000000", "#FFFFFF"],
    padrao: "listras-verticais",
    escudo: "botafogo.svg",
  },
  {
    id: "red-bull-bragantino",
    nome: "Bragantino",
    nomeCompleto: "Red Bull Bragantino",
    serie: "A",
    estado: "SP",
    cores: ["#FFFFFF", "#E4002B", "#001F5C"],
    padrao: "liso",
    escudo: "red-bull-bragantino.svg",
  },
  {
    id: "chapecoense",
    nome: "Chapecoense",
    nomeCompleto: "Associação Chapecoense de Futebol",
    serie: "A",
    estado: "SC",
    cores: ["#00A650", "#FFFFFF"],
    padrao: "liso",
    escudo: "chapecoense.svg",
  },
  {
    id: "corinthians",
    nome: "Corinthians",
    nomeCompleto: "Sport Club Corinthians Paulista",
    serie: "A",
    estado: "SP",
    cores: ["#FFFFFF", "#000000"],
    padrao: "liso",
    escudo: "corinthians.png",
  },
  {
    id: "coritiba",
    nome: "Coritiba",
    nomeCompleto: "Coritiba Foot Ball Club",
    serie: "A",
    estado: "PR",
    cores: ["#00544D", "#FFFFFF"],
    padrao: "liso",
    escudo: "coritiba.svg",
  },
  {
    id: "cruzeiro",
    nome: "Cruzeiro",
    nomeCompleto: "Cruzeiro Esporte Clube",
    serie: "A",
    estado: "MG",
    cores: ["#003DA5", "#FFFFFF"],
    padrao: "liso",
    escudo: "cruzeiro.svg",
  },
  {
    id: "flamengo",
    nome: "Flamengo",
    nomeCompleto: "Clube de Regatas do Flamengo",
    serie: "A",
    estado: "RJ",
    cores: ["#E30613", "#0B0B0B"],
    padrao: "listras-horizontais",
    escudo: "flamengo.svg",
  },
  {
    id: "fluminense",
    nome: "Fluminense",
    nomeCompleto: "Fluminense Football Club",
    serie: "A",
    estado: "RJ",
    cores: ["#7A0019", "#00843D", "#FFFFFF"],
    padrao: "listras-verticais",
    escudo: "fluminense.svg",
  },
  {
    id: "gremio",
    nome: "Grêmio",
    nomeCompleto: "Grêmio Foot-Ball Porto Alegrense",
    serie: "A",
    estado: "RS",
    cores: ["#0D80BF", "#000000", "#FFFFFF"],
    padrao: "listras-verticais",
    escudo: "gremio.svg",
  },
  {
    id: "internacional",
    nome: "Internacional",
    nomeCompleto: "Sport Club Internacional",
    serie: "A",
    estado: "RS",
    cores: ["#E4002B", "#FFFFFF"],
    padrao: "liso",
    escudo: "internacional.svg",
  },
  {
    id: "mirassol",
    nome: "Mirassol",
    nomeCompleto: "Mirassol Futebol Clube",
    serie: "A",
    estado: "SP",
    cores: ["#FFD100", "#00873E"],
    padrao: "liso",
    escudo: "mirassol.svg",
  },
  {
    id: "palmeiras",
    nome: "Palmeiras",
    nomeCompleto: "Sociedade Esportiva Palmeiras",
    serie: "A",
    estado: "SP",
    cores: ["#006437", "#FFFFFF"],
    padrao: "liso",
    escudo: "palmeiras.svg",
  },
  {
    id: "remo",
    nome: "Remo",
    nomeCompleto: "Clube do Remo",
    serie: "A",
    estado: "PA",
    cores: ["#0A1D3A", "#FFFFFF"],
    padrao: "liso",
    escudo: "remo.svg",
  },
  {
    id: "santos",
    nome: "Santos",
    nomeCompleto: "Santos Futebol Clube",
    serie: "A",
    estado: "SP",
    cores: ["#FFFFFF", "#000000"],
    padrao: "liso",
    escudo: "santos.svg",
  },
  {
    id: "sao-paulo",
    nome: "São Paulo",
    nomeCompleto: "São Paulo Futebol Clube",
    serie: "A",
    estado: "SP",
    cores: ["#FFFFFF", "#E4002B", "#000000"],
    padrao: "faixa-horizontal",
    escudo: "sao-paulo.svg",
  },
  {
    id: "vasco",
    nome: "Vasco",
    nomeCompleto: "Club de Regatas Vasco da Gama",
    serie: "A",
    estado: "RJ",
    cores: ["#000000", "#FFFFFF"],
    padrao: "faixa-diagonal",
    escudo: "vasco.svg",
  },
  {
    id: "vitoria",
    nome: "Vitória",
    nomeCompleto: "Esporte Clube Vitória",
    serie: "A",
    estado: "BA",
    cores: ["#E30613", "#000000"],
    padrao: "listras-horizontais",
    escudo: "vitoria.svg",
  },
];

export const VARIANTES_CLUBE: readonly { id: VarianteClube; nome: string; descricao: string }[] = [
  { id: "camisa", nome: "Camisa", descricao: "O padrão da camisa do clube." },
  { id: "escura", nome: "Escura", descricao: "Preta, com contorno e barras nas cores do clube." },
  { id: "faixa", nome: "Faixa", descricao: "Cor principal com uma faixa da segunda cor no meio." },
];

export function clubePorId(id: string): Clube | undefined {
  return CLUBES.find((c) => c.id === id);
}

/** Clube do estilo escolhido, ou undefined se o estilo é geral (ou o clube não existe mais). */
export function clubeDoEstilo(estilo: EstiloPilula): Clube | undefined {
  return estilo.tipo === "clube" ? clubePorId(estilo.id) : undefined;
}

/** Largura que o escudo (20 px + folga) acrescenta à janela da pílula. */
export const LARGURA_ESCUDO = 26;

/** Quantos px a janela da pílula precisa a mais por causa do escudo (0 se não houver escudo). */
export function larguraExtraEscudo(estilo: EstiloPilula): number {
  return clubeDoEstilo(estilo)?.escudo ? LARGURA_ESCUDO : 0;
}
