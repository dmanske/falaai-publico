import { LinhaConfig } from "@/components/ui";
import { IDIOMAS } from "../../lib/idiomas";
import type { PropsSecaoPreferencias } from "../../types";
import { CartaoSecao } from "../CartaoSecao";
import { Seletor } from "../Seletor";

export function SecaoIdiomas({ preferencias, salvar }: PropsSecaoPreferencias) {
  function alternar(codigo: string) {
    const atuais = preferencias.idiomas;
    void salvar({ idiomas: atuais.includes(codigo) ? atuais.filter((c) => c !== codigo) : [...atuais, codigo] });
  }
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
                className={`rounded-full px-3.5 py-1.5 text-sm transition ring-1 ${
                  ativo ? "bg-destaque-claro text-destaque ring-destaque" : "bg-cartao text-texto ring-borda hover:bg-painel"
                }`}
              >
                {i.nome}
              </button>
            );
          })}
        </div>
      </div>
      <LinhaConfig rotulo="Idioma de destino da tradução" descricao="Para onde o atalho Traduzir converte o que você fala.">
        <Seletor value={preferencias.idiomaTraducao} onChange={(e) => void salvar({ idiomaTraducao: e.target.value })}>
          {IDIOMAS.map((i) => (
            <option key={i.codigo} value={i.codigo}>
              {i.nome}
            </option>
          ))}
        </Seletor>
      </LinhaConfig>
    </CartaoSecao>
  );
}
