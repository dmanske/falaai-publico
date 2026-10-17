import { useEffect, useState } from "react";
import { MODELOS_IA } from "@shared/config";
import { CampoTexto } from "@/components/ui";
import { Seletor } from "./Seletor";

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
    <div className="space-y-2 py-3">
      <label className="block text-sm font-medium" htmlFor="modelo">
        Modelo de IA
      </label>
      <Seletor
        id="modelo"
        className="w-full"
        value={outro ? OUTRO : modelo}
        onChange={(e) => {
          if (e.target.value === OUTRO) setOutro(true);
          else {
            setOutro(false);
            onMudar(e.target.value);
          }
        }}
      >
        {MODELOS_IA.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
            {m.recomendado ? " (recomendado)" : ""}
          </option>
        ))}
        <option value={OUTRO}>Outro (digitar o id)…</option>
      </Seletor>
      {outro ? (
        <CampoTexto
          spellCheck={false}
          placeholder="ex.: google/gemini-3-flash-preview"
          value={digitado}
          onChange={(e) => setDigitado(e.target.value)}
          onBlur={() => digitado.trim() && onMudar(digitado.trim())}
          className="font-mono"
        />
      ) : (
        atual && <p className="text-xs text-suave">{atual.nota}</p>
      )}
    </div>
  );
}
