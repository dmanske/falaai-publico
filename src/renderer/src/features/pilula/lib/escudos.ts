// Escudos dos clubes. Todo .svg ou .png em src/renderer/src/assets/escudos/ entra sozinho: para um clube novo
// basta copiar o arquivo e pôr o mesmo nome em `escudo` (src/shared/temas/clubes.ts).
// `?no-inline` força arquivo próprio: a CSP da pílula não aceita imagem `data:`.
const URLS = import.meta.glob("../../../assets/escudos/*.{svg,png}", { eager: true, query: "?no-inline", import: "default" }) as Record<string, string>;

const POR_ARQUIVO: Record<string, string> = Object.fromEntries(
  Object.entries(URLS).map(([caminho, url]) => [caminho.split("/").pop() ?? caminho, url]),
);

/** URL do escudo pelo nome do arquivo (ex.: "flamengo.svg"); undefined se o clube não tem ou o arquivo não existe. */
export const urlEscudo = (arquivo: string | null): string | undefined => (arquivo ? POR_ARQUIVO[arquivo] : undefined);
