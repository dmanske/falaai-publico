import type { PaginaHub } from "@shared/ipc";

export interface Destino {
  pagina: PaginaHub;
  /** Seção das Configurações a abrir (ex.: "sobre"). */
  secao: string | null;
}
