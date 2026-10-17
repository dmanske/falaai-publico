import { MAX_IDIOMAS_TRADUCAO, siglaIdioma } from "@shared/config";
import { LinhaConfig } from "@/components/ui";
import { IDIOMAS } from "../../lib/idiomas";
import type { PropsSecaoPreferencias } from "../../types";
import { Bandeira } from "../Bandeira";
import { CartaoSecao } from "../CartaoSecao";
import { Seletor } from "../Seletor";

export function SecaoIdiomas({ preferencias, salvar }: PropsSecaoPreferencias) {
  function alternar(codigo: string) {
    const atuais = preferencias.idiomas;
    void salvar({ idiomas: atuais.includes(codigo) ? atuais.filter((c) => c !== codigo) : [...atuais, codigo] });
  }
  const favoritos = preferencias.idiomasTraducao;
  function alternarFavorito(codigo: string) {
    if (favoritos.includes(codigo)) {
      if (favoritos.length === 1) return; // sempre fica pelo menos um
      const restantes = favoritos.filter((c) => c !== codigo);
      void salvar({
        idiomasTraducao: restantes,
        // Tirou o idioma em que a tradução começa: passa para o primeiro que sobrou.
        ...(preferencias.idiomaTraducao === codigo ? { idiomaTraducao: restantes[0] } : {}),
      });
    } else if (favoritos.length < MAX_IDIOMAS_TRADUCAO) {
      void salvar({ idiomasTraducao: [...favoritos, codigo] });
    }
  }
  const nomeDe = (codigo: string) => IDIOMAS.find((i) => i.codigo === codigo)?.nome ?? codigo;

  return (
    <CartaoSecao titulo="Idiomas">
      <div className="py-3">
        <div className="text-sm font-medium">Idiomas que você fala</div>
        <p className="mt-0.5 text-xs text-suave">Ajuda a IA a acertar o que você disse. Nenhum marcado = detectar sozinho.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {IDIOMAS.map((i) => {
            const ativo = preferencias.idiomas.includes(i.codigo);
            return (
              <button
                key={i.codigo}
                type="button"
                aria-pressed={ativo}
                onClick={() => alternar(i.codigo)}
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition ring-1 ${
                  ativo ? "bg-destaque-claro text-destaque ring-destaque" : "bg-cartao text-texto ring-borda hover:bg-painel"
                }`}
              >
                <Bandeira src={i.bandeira} />
                {i.nome}
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-t border-borda py-3">
        <div className="text-sm font-medium">Idiomas da tradução</div>
        <p className="mt-0.5 text-xs text-suave">
          Até {MAX_IDIOMAS_TRADUCAO}, na ordem em que você clicar. Traduzindo, cada toque em ⇧ (segurando Fn) ou clique
          na sigla da pílula passa para o próximo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {IDIOMAS.map((i) => {
            const posicao = favoritos.indexOf(i.codigo);
            const ativo = posicao >= 0;
            const cheio = !ativo && favoritos.length >= MAX_IDIOMAS_TRADUCAO;
            return (
              <button
                key={i.codigo}
                type="button"
                aria-pressed={ativo}
                disabled={cheio}
                onClick={() => alternarFavorito(i.codigo)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ring-1 disabled:opacity-40 ${
                  ativo ? "bg-destaque-claro text-destaque ring-destaque" : "bg-cartao text-texto ring-borda hover:bg-painel"
                }`}
              >
                {ativo && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destaque text-[10px] font-semibold text-white">
                    {posicao + 1}
                  </span>
                )}
                <Bandeira src={i.bandeira} />
                {i.nome}
              </button>
            );
          })}
        </div>
      </div>
      <LinhaConfig rotulo="Começar a tradução em" descricao="O FalaAi lembra o último idioma que você usou.">
        <Seletor value={preferencias.idiomaTraducao} onChange={(e) => void salvar({ idiomaTraducao: e.target.value })}>
          {favoritos.map((c) => (
            <option key={c} value={c}>
              {siglaIdioma(c)} · {nomeDe(c)}
            </option>
          ))}
        </Seletor>
      </LinhaConfig>
    </CartaoSecao>
  );
}
