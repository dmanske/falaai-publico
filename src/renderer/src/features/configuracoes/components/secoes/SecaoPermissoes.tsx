import { usePermissoes } from "../../hooks/usePermissoes";
import { CartaoSecao } from "../CartaoSecao";
import { Permissoes } from "../Permissoes";

export function SecaoPermissoes() {
  const { status, pedir } = usePermissoes();
  return (
    <CartaoSecao titulo="Permissões" descricao="O que o sistema precisa liberar para o ditado funcionar.">
      {status ? <Permissoes status={status} onPedir={(q) => void pedir(q)} /> : <p className="py-3 text-sm text-suave">Verificando…</p>}
    </CartaoSecao>
  );
}
