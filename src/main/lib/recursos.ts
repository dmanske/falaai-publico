// Caminho dos arquivos da pasta resources/ (ícones, amostra de áudio).
// Em desenvolvimento ficam na raiz do projeto; no app instalado, em Contents/Resources.
import { app } from "electron";
import { join } from "node:path";

export function caminhoRecurso(nome: string): string {
  return app.isPackaged ? join(process.resourcesPath, nome) : join(app.getAppPath(), "resources", nome);
}
