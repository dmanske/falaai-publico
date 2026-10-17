// Marca de cada build: um código aleatório novo + data/hora, gerados pelo electron.vite.config.ts.
// Aparece no menu lateral e em Configurações > Sobre para o usuário ver que o app foi atualizado.
declare const __FALAAI_BUILD__: { id: string; data: string };

export const BUILD = __FALAAI_BUILD__;

/** "17/10/2026 às 08:52 · a3f9c2" */
export function descreverBuild(): string {
  const d = new Date(BUILD.data);
  const data = d.toLocaleDateString("pt-BR");
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} às ${hora} · ${BUILD.id}`;
}

/** Forma curta e amigável: { quando: "hoje, 08:52" | "ontem, 08:52" | "15/10, 08:52", id: "a3f9c2" }. */
export function atualizacaoCurta(agora = new Date()): { quando: string; id: string } {
  const d = new Date(BUILD.data);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dia = (x: Date) => x.toLocaleDateString("pt-BR");
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  const rotulo =
    dia(d) === dia(agora) ? "hoje" : dia(d) === dia(ontem) ? "ontem" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return { quando: `${rotulo}, ${hora}`, id: BUILD.id };
}
