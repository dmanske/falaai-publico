import { useState } from "react";
import type { ModeloCatalogo } from "@shared/provedores";
import { CampoTexto } from "@/components/ui";
import { Seletor } from "./Seletor";

const OUTRO = "__outro__";

interface Props {
  rotulo: string;
  modelos: ModeloCatalogo[];
  modelo: string;
  onMudar(modelo: string): void;
  placeholderOutro?: string;
}

/** Lista do catálogo (nome + "recomendado") + "Outro (digitar id)". Use `key` para reiniciar ao trocar de provedor. */
export function SeletorModelo({ rotulo, modelos, modelo, onMudar, placeholderOutro = "id do modelo" }: Props) {
  const conhecido = modelos.some((m) => m.id === modelo);
  const [outro, setOutro] = useState(!conhecido);
  const [digitado, setDigitado] = useState(conhecido ? "" : modelo);
  const atual = modelos.find((m) => m.id === modelo);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{rotulo}</label>
      <Seletor
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
        {modelos.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
            {m.recomendado ? " (recomendado)" : ""}
          </option>
        ))}
        <option value={OUTRO}>Outro (digitar id)…</option>
      </Seletor>
      {outro ? (
        <CampoTexto
          spellCheck={false}
          placeholder={placeholderOutro}
          value={digitado}
          onChange={(e) => setDigitado(e.target.value)}
          onBlur={() => digitado.trim() && digitado.trim() !== modelo && onMudar(digitado.trim())}
          onKeyDown={(e) => e.key === "Enter" && digitado.trim() && onMudar(digitado.trim())}
          className="font-mono"
        />
      ) : (
        atual && <p className="text-xs text-suave">{atual.nota}</p>
      )}
    </div>
  );
}
