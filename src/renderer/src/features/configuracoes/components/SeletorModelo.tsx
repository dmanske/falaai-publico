import { useEffect, useState } from "react";
import { MODELOS_IA } from "@shared/config";

const OUTRO = "__outro__";

interface Props {
  modelo: string;
  onMudar(modelo: string): void;
}

/** Lista dos modelos recomendados + opção de digitar outro id do gateway da Lovable. */
export function SeletorModelo({ modelo, onMudar }: Props) {
  const conhecido = MODELOS_IA.some((m) => m.id === modelo);
  const [digitado, setDigitado] = useState(conhecido ? "" : modelo);
  const [outro, setOutro] = useState(!conhecido);

  useEffect(() => {
    if (!MODELOS_IA.some((m) => m.id === modelo)) {
      setOutro(true);
      setDigitado(modelo);
    }
  }, [modelo]);

  const atual = MODELOS_IA.find((m) => m.id === modelo);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="modelo">
        Modelo de IA
      </label>
      <select
        id="modelo"
        value={outro ? OUTRO : modelo}
        onChange={(e) => {
          if (e.target.value === OUTRO) setOutro(true);
          else {
            setOutro(false);
            onMudar(e.target.value);
          }
        }}
        className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
      >
        {MODELOS_IA.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
            {m.recomendado ? " (recomendado)" : ""}
          </option>
        ))}
        <option value={OUTRO}>Outro (digitar o id)…</option>
      </select>
      {outro ? (
        <input
          type="text"
          spellCheck={false}
          placeholder="ex.: google/gemini-3-flash-preview"
          value={digitado}
          onChange={(e) => setDigitado(e.target.value)}
          onBlur={() => digitado.trim() && onMudar(digitado.trim())}
          className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-neutral-700"
        />
      ) : (
        atual && <p className="text-xs text-neutral-500">{atual.nota}</p>
      )}
    </div>
  );
}
