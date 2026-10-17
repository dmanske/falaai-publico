// Configurações dentro do hub: lista de seções à esquerda, cartões à direita. Salva na hora.
import { useEffect, useState } from "react";
import { TituloPagina } from "@/components/ui";
import { SecaoAtalhos } from "../components/secoes/SecaoAtalhos";
import { SecaoAudio } from "../components/secoes/SecaoAudio";
import { SecaoDados } from "../components/secoes/SecaoDados";
import { SecaoEnvio } from "../components/secoes/SecaoEnvio";
import { SecaoGeral } from "../components/secoes/SecaoGeral";
import { SecaoIa } from "../components/secoes/SecaoIa";
import { SecaoPilula } from "../components/secoes/SecaoPilula";
import { SecaoIdiomas } from "../components/secoes/SecaoIdiomas";
import { SecaoPermissoes } from "../components/secoes/SecaoPermissoes";
import { SecaoSobre } from "../components/secoes/SecaoSobre";
import { usePreferencias } from "../hooks/usePreferencias";
import type { SecaoConfig } from "../types";

const SECOES: { id: SecaoConfig; rotulo: string }[] = [
  { id: "geral", rotulo: "Geral" },
  { id: "pilula", rotulo: "Pílula" },
  { id: "atalhos", rotulo: "Atalhos" },
  { id: "envio", rotulo: "Envio automático" },
  { id: "idiomas", rotulo: "Idiomas" },
  { id: "audio", rotulo: "Áudio" },
  { id: "dados", rotulo: "Dados e privacidade" },
  { id: "ia", rotulo: "IA" },
  { id: "permissoes", rotulo: "Permissões" },
  { id: "sobre", rotulo: "Sobre" },
];

/** "atualizacoes" (menu da bandeja) abre o Sobre já verificando; "sobre" só abre. */
function resolverSecao(secao: string | null): SecaoConfig {
  if (secao === "atualizacoes") return "sobre";
  return SECOES.some((s) => s.id === secao) ? (secao as SecaoConfig) : "geral";
}

export function ConfiguracoesPage({ secaoInicial = null }: { secaoInicial?: string | null }) {
  const { preferencias, salvar, recarregar } = usePreferencias();
  const [secao, setSecao] = useState<SecaoConfig>(() => resolverSecao(secaoInicial));
  const [verificar, setVerificar] = useState(secaoInicial === "atualizacoes");

  useEffect(() => {
    if (secaoInicial) {
      setSecao(resolverSecao(secaoInicial));
      setVerificar(secaoInicial === "atualizacoes");
    }
  }, [secaoInicial]);

  const props = preferencias ? { preferencias, salvar } : null;

  return (
    <>
      <TituloPagina>Configurações</TituloPagina>
      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="flex shrink-0 flex-row flex-wrap gap-1 md:w-52 md:flex-col">
          {SECOES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSecao(s.id);
                setVerificar(false);
              }}
              className={`rounded-xl px-3 py-2 text-left text-sm transition ${
                secao === s.id ? "bg-painel font-medium text-texto ring-1 ring-borda" : "text-suave hover:bg-painel hover:text-texto"
              }`}
            >
              {s.rotulo}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          {secao === "sobre" && <SecaoSobre key={String(verificar)} verificarAoAbrir={verificar} />}
          {secao === "permissoes" && <SecaoPermissoes />}
          {props && secao === "geral" && <SecaoGeral {...props} />}
          {props && secao === "pilula" && <SecaoPilula {...props} />}
          {props && secao === "atalhos" && <SecaoAtalhos {...props} />}
          {props && secao === "envio" && <SecaoEnvio {...props} />}
          {props && secao === "idiomas" && <SecaoIdiomas {...props} />}
          {props && secao === "audio" && <SecaoAudio {...props} />}
          {props && secao === "dados" && <SecaoDados {...props} />}
          {props && secao === "ia" && <SecaoIa {...props} recarregar={recarregar} />}
        </div>
      </div>
    </>
  );
}
