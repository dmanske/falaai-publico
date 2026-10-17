import { ORDEM_PROVEDORES, PROVEDORES, type IdProvedor } from "@shared/provedores";

interface Props {
  selecionado: IdProvedor;
  onEscolher(id: IdProvedor): void;
}

/** Cartões pequenos, um por provedor de IA, com o selo "ouve áudio" ou "precisa de transcrição". */
export function GradeProvedores({ selecionado, onEscolher }: Props) {
  return (
    <div role="radiogroup" aria-label="Provedor de IA" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ORDEM_PROVEDORES.map((id) => {
        const p = PROVEDORES[id];
        const ativo = id === selecionado;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onEscolher(id)}
            className={`rounded-xl px-3 py-2.5 text-left transition ${
              ativo ? "bg-destaque-claro ring-2 ring-destaque" : "bg-cartao shadow-cartao hover:bg-hover"
            }`}
          >
            <span className="block truncate font-titulo text-sm font-medium">{p.nome}</span>
            <span className={`mt-0.5 block text-[11px] leading-tight ${p.ouveAudio ? "text-sucesso" : "text-suave"}`}>
              {p.ouveAudio ? "ouve áudio" : "precisa de transcrição"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
