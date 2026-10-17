import { useEffect } from "react";
import { AUTOR } from "@shared/config";
import { descreverBuild } from "@shared/build";
import { NOME_APP } from "@shared/config";
import { Botao, LinhaConfig } from "@/components/ui";
import { useAtualizacao } from "../../hooks/useAtualizacao";
import { useInfoSistema } from "../../hooks/useInfoSistema";
import { CartaoSecao } from "../CartaoSecao";

export function SecaoSobre({ verificarAoAbrir }: { verificarAoAbrir: boolean }) {
  const info = useInfoSistema();
  const { verificando, resultado, verificar, abrirLink } = useAtualizacao();

  useEffect(() => {
    if (verificarAoAbrir) void verificar();
  }, [verificarAoAbrir, verificar]);

  return (
    <CartaoSecao titulo={`Sobre o ${NOME_APP}`}>
      <LinhaConfig rotulo="Criado por">
        <span className="text-sm text-suave">{AUTOR}</span>
      </LinhaConfig>
      <LinhaConfig rotulo="Última atualização" descricao="Muda a cada nova versão do app (data, hora e código do build).">
        <span className="text-sm text-suave">{descreverBuild()}</span>
      </LinhaConfig>
      <LinhaConfig rotulo="Versão">
        <span className="text-sm text-suave">{info?.versao ?? "…"}</span>
      </LinhaConfig>
      <LinhaConfig rotulo="Pasta dos dados" descricao="Histórico, dicionário, áudios e chaves (cifradas) ficam aqui.">
        <span className="select-text break-all text-right font-mono text-xs text-suave">{info?.pastaDados ?? "…"}</span>
      </LinhaConfig>
      <div className="py-3">
        <div className="flex items-center gap-3">
          <Botao variante="primario" disabled={verificando} onClick={() => void verificar()}>
            {verificando ? "Verificando…" : "Verificar atualizações"}
          </Botao>
          {resultado && !resultado.erro && !resultado.disponivel && <span className="text-sm text-sucesso">Você está na versão mais recente.</span>}
          {resultado?.disponivel && (
            <span className="text-sm">
              Versão {resultado.versaoNova} disponível.{" "}
              {resultado.url && (
                <button type="button" className="text-destaque underline" onClick={() => abrirLink(resultado.url!)}>
                  Baixar
                </button>
              )}
            </span>
          )}
          {resultado?.erro && <span className="text-sm text-suave">{resultado.erro}</span>}
        </div>
      </div>
    </CartaoSecao>
  );
}
