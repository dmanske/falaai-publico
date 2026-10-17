import { useState } from "react";
import type { StatusChave } from "@shared/ipc";

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
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="chave-lovable">
        Chave da Lovable
      </label>
      <div className="flex gap-2">
        <input
          id="chave-lovable"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={status?.configurada ? `Salva (termina em …${status.final}). Cole outra para trocar.` : "Cole a chave aqui"}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valor.trim() && void salvar()}
          className="flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700"
        />
        <button
          type="button"
          disabled={!valor.trim() || salvando}
          onClick={() => void salvar()}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          {status?.configurada ? `✓ Chave salva, criptografada pelo sistema (…${status.final})` : "Nenhuma chave salva"}
        </span>
        {status?.configurada && (
          <button type="button" onClick={() => void onApagar()} className="text-red-600 hover:underline">
            Apagar chave
          </button>
        )}
      </div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
