import { useState } from "react";
import type { StatusChave } from "@shared/ipc";
import { Botao, CampoTexto } from "@/components/ui";

interface Props {
  status: StatusChave | null;
  erro: string | null;
  onSalvar(valor: string): Promise<boolean>;
  onApagar(): Promise<void>;
}

export function CampoChave({ status, erro, onSalvar, onApagar }: Props) {
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    if (await onSalvar(valor)) setValor("");
    setSalvando(false);
  }

  return (
    <div className="space-y-2 py-3">
      <label className="block text-sm font-medium" htmlFor="chave-lovable">
        Chave da Lovable
      </label>
      <div className="flex gap-2">
        <CampoTexto
          id="chave-lovable"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={status?.configurada ? `Salva (termina em …${status.final}). Cole outra para trocar.` : "Cole a chave aqui"}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valor.trim() && void salvar()}
        />
        <Botao variante="primario" disabled={!valor.trim() || salvando} onClick={() => void salvar()}>
          Salvar
        </Botao>
      </div>
      <div className="flex items-center justify-between text-xs text-suave">
        <span>{status?.configurada ? `Chave salva, criptografada pelo sistema (…${status.final})` : "Nenhuma chave salva"}</span>
        {status?.configurada && (
          <button type="button" onClick={() => void onApagar()} className="text-perigo hover:underline">
            Apagar chave
          </button>
        )}
      </div>
      {erro && <p className="text-xs text-perigo">{erro}</p>}
    </div>
  );
}
