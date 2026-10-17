// Liga a leitura do teclado no auxiliar nativo, manda os atalhos configurados e tenta de novo até a
// permissão chegar. (No Mac, a Acessibilidade é concedida fora do app; quando o usuário liga, o
// teclado passa a funcionar sozinho em poucos segundos, sem reiniciar.)
import type { IdAtalho } from "@shared/atalhos";
import { auxiliar } from "../nativo";
import { aoMudarPreferencias, lerPreferencias } from "../preferencias";

const INTERVALO_NOVA_TENTATIVA_MS = 2000;

let ativo = false;
let timer: NodeJS.Timeout | null = null;
/** Último erro ao configurar os atalhos (ex.: tecla desconhecida), para a tela mostrar. */
let erroAtalhos: string | null = null;

export function tecladoAtivo(): boolean {
  return ativo;
}

export function erroDosAtalhos(): string | null {
  return erroAtalhos;
}

async function configurarAtalhos(): Promise<void> {
  const { atalhos } = lerPreferencias();
  const lista = (Object.keys(atalhos) as IdAtalho[]).map((id) => ({ id, teclas: atalhos[id] }));
  const r = await auxiliar.enviar({ cmd: "configurar_atalhos", atalhos: lista });
  erroAtalhos = r.ok ? null : (r.erro ?? "Não consegui configurar os atalhos.");
}

async function tentar(): Promise<void> {
  const r = await auxiliar.enviar({ cmd: "iniciar_teclado" });
  ativo = r.ok;
  if (!ativo) return;
  await configurarAtalhos();
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function agendar(): void {
  if (!timer) timer = setInterval(() => !ativo && void tentar(), INTERVALO_NOVA_TENTATIVA_MS);
}

export function manterTecladoAtivo(): void {
  void tentar();
  agendar();
  // Se o auxiliar cair e voltar, o teclado e os atalhos precisam ser ligados de novo.
  auxiliar.on("caiu", () => {
    ativo = false;
    agendar();
  });
  aoMudarPreferencias((nova, anterior) => {
    if (ativo && JSON.stringify(nova.atalhos) !== JSON.stringify(anterior.atalhos)) void configurarAtalhos();
  });
}
