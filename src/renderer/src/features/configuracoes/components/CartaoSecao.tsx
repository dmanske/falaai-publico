import type { ReactNode } from "react";
import { Cartao } from "@/components/ui";

/** Cartão de uma seção das configurações: título cinza, descrição e linhas separadas por filete. */
export function CartaoSecao({ titulo, descricao, children }: { titulo?: ReactNode; descricao?: ReactNode; children: ReactNode }) {
  return (
    <Cartao>
      {titulo && <h2 className="text-lg font-semibold">{titulo}</h2>}
      {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
      <div className={`divide-y divide-borda ${titulo || descricao ? "mt-3" : ""}`}>{children}</div>
    </Cartao>
  );
}
