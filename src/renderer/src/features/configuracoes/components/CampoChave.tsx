import { useState, type ReactNode } from "react";
import type { StatusChave } from "@shared/ipc";
import { Botao, CampoTexto } from "@/components/ui";
import { apiSistema } from "../api/ponte";

interface Props {
  /** Nome mostrado no rótulo ("Chave da OpenAI"). */
  nome: string;
  status: StatusChave | null;
  erro: string | null;
  onSalvar(valor: string): Promise<boolean>;
  onApagar(): Promise<void>;
  /** Onde a pessoa cria a chave. */
  link?: string;
  /** Começo típico da chave (dica). */
  prefixo?: string;
  /** Aviso do provedor/serviço. */
  aviso?: string;
  /** Logo da empresa, mostrado antes do rótulo. */
  logo?: ReactNode;
}

/** Campo de uma chave do cofre: salvar, apagar, "…abcd", link de onde pegar, dica do prefixo e aviso. */
export function CampoChave({ nome, status, erro, onSalvar, onApagar, link, prefixo, aviso, logo }: Props) {
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const id = `chave-${nome.replace(/\W+/g, "-").toLowerCase()}`;

  async function salvar() {
    setSalvando(true);
    if (await onSalvar(valor)) setValor("");
    setSalvando(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium" htmlFor={id}>
          {logo}
          Chave {nome}
        </label>
        {link && (
          <button type="button" onClick={() => void apiSistema.abrirLink(link)} className="text-xs text-destaque hover:underline">
            Onde pegar a chave
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <CampoTexto
          id={id}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={
            status?.configurada
              ? `Salva (termina em …${status.final}). Cole outra para trocar.`
              : prefixo
                ? `Cole a chave aqui (começa com ${prefixo})`
                : "Cole a chave aqui"
          }
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valor.trim() && void salvar()}
        />
        <Botao variante="primario" disabled={!valor.trim() || salvando} onClick={() => void salvar()}>
          Salvar
        </Botao>
      </div>
      <div className="flex items-center justify-between text-xs text-suave">
        <span className={status?.configurada ? "text-sucesso" : ""}>
          {status?.configurada ? `✓ Chave salva, criptografada pelo sistema (…${status.final})` : "Nenhuma chave salva"}
        </span>
        {status?.configurada && (
          <button type="button" onClick={() => void onApagar()} className="text-perigo hover:underline">
            Apagar chave
          </button>
        )}
      </div>
      {aviso && <p className="rounded-lg bg-painel px-3 py-2 text-xs text-medio">{aviso}</p>}
      {erro && <p className="text-xs text-perigo">{erro}</p>}
    </div>
  );
}
