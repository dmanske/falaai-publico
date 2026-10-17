import type { ResumoEstatisticas } from "@shared/ipc";
import { Cartao, Numero } from "@/components/ui";
import { formatarPalavras } from "../lib/formatar";
import { NumeroTempo } from "./NumeroTempo";

/** Os 4 cartões de números. */
export function Percepcoes({ resumo }: { resumo: ResumoEstatisticas }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Cartao>
        <Numero valor={formatarPalavras(resumo.palavras)} unidade="palavras" legenda="Palavras ditadas" />
      </Cartao>
      <Cartao>
        <NumeroTempo minutos={resumo.tempoEconomizadoMin} legenda="Tempo economizado" />
      </Cartao>
      <Cartao>
        <Numero valor={resumo.ppmMedia} unidade="PPM" legenda="Velocidade média de ditado" />
      </Cartao>
      <Cartao>
        <NumeroTempo minutos={resumo.tempoDitadoMin} legenda="Tempo total de ditado" />
      </Cartao>
    </div>
  );
}
