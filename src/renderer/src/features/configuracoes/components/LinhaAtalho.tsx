import type { Atalho, IdAtalho } from "@shared/atalhos";
import { NOMES_ATALHOS, rotuloTecla } from "@shared/atalhos";
import { Botao, Tecla } from "@/components/ui";
import { plataforma } from "../api/ponte";
import { useGravarAtalho } from "../hooks/useGravarAtalho";
import { SUGESTOES } from "../lib/atalhos";

export function Teclas({ atalho }: { atalho: Atalho }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {atalho.map((t, i) => (
        <Tecla key={`${t}-${i}`}>{rotuloTecla(t, plataforma)}</Tecla>
      ))}
    </span>
  );
}

interface Props {
  id: IdAtalho;
  atalho: Atalho;
  editando: boolean;
  erro: string | null;
  onEditar(): void;
  onCancelar(): void;
  onEscolher(atalho: Atalho): void;
}

/** Uma função com seu atalho atual; "Alterar" abre sugestões prontas e o modo "Gravar". */
export function LinhaAtalho({ id, atalho, editando, erro, onEditar, onCancelar, onEscolher }: Props) {
  const gravador = useGravarAtalho(onEscolher);
  const sugestoes = SUGESTOES[plataforma === "win32" ? "win32" : "darwin"];

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="mb-1.5 text-sm font-medium">{NOMES_ATALHOS[id]}</div>
          <Teclas atalho={atalho} />
        </div>
        {editando ? (
          <Botao
            variante="fantasma"
            onClick={() => {
              gravador.parar();
              onCancelar();
            }}
          >
            Cancelar
          </Botao>
        ) : (
          <Botao onClick={onEditar}>Alterar</Botao>
        )}
      </div>
      {editando && (
        <div className="mt-3 space-y-3 rounded-2xl bg-painel p-4">
          <div className="flex flex-wrap gap-2">
            {sugestoes.map((s) => (
              <button
                key={s.join("+")}
                type="button"
                onClick={() => onEscolher(s)}
                className="rounded-xl bg-cartao p-1.5 ring-1 ring-borda transition hover:ring-2 hover:ring-destaque"
              >
                <Teclas atalho={s} />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Botao variante={gravador.gravando ? "primario" : "secundario"} onClick={() => (gravador.gravando ? gravador.parar() : gravador.iniciar())}>
              {gravador.gravando ? "Gravando… segure as teclas e solte" : "Gravar combinação"}
            </Botao>
            {gravador.gravando && gravador.atual.length > 0 && <Teclas atalho={gravador.atual} />}
          </div>
          <p className="text-xs text-suave">
            A tecla Fn não pode ser gravada (o navegador não a enxerga): para usá-la, escolha uma das sugestões acima. Esc cancela a gravação.
          </p>
          {erro && <p className="text-xs text-perigo">{erro}</p>}
        </div>
      )}
    </div>
  );
}
