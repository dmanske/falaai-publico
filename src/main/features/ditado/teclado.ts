// Liga a leitura do teclado no auxiliar nativo e tenta de novo até a permissão chegar.
// (No Mac, a Acessibilidade é concedida fora do app; quando o usuário liga, o teclado
// passa a funcionar sozinho em poucos segundos, sem reiniciar.)
import { auxiliar } from "../nativo";

const INTERVALO_NOVA_TENTATIVA_MS = 2000;

let ativo = false;
let timer: NodeJS.Timeout | null = null;

export function tecladoAtivo(): boolean {
  return ativo;
}

async function tentar(): Promise<void> {
  const r = await auxiliar.enviar({ cmd: "iniciar_teclado" });
  ativo = r.ok;
  if (ativo && timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function manterTecladoAtivo(): void {
  void tentar();
  if (!timer) timer = setInterval(() => !ativo && void tentar(), INTERVALO_NOVA_TENTATIVA_MS);
  // Se o auxiliar cair e voltar, o teclado precisa ser ligado de novo.
  auxiliar.on("caiu", () => {
    ativo = false;
    if (!timer) timer = setInterval(() => !ativo && void tentar(), INTERVALO_NOVA_TENTATIVA_MS);
  });
}
