import type { ResumoEstatisticas } from "@shared/ipc";
import { Cartao, Numero } from "@/components/ui";
import { Calendario } from "./Calendario";

const dias = (n: number) => (n === 1 ? "dia" : "dias");

/** Dias ativos, sequências e calendário de atividade. */
export function Atividade({ resumo }: { resumo: ResumoEstatisticas }) {
  return (
    <Cartao>
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Numero valor={resumo.diasAtivos} unidade={dias(resumo.diasAtivos)} legenda="Dias ativos" />
        <Numero valor={resumo.sequenciaAtual} unidade={dias(resumo.sequenciaAtual)} legenda="Sequência atual" />
        <Numero valor={resumo.maiorSequencia} unidade={dias(resumo.maiorSequencia)} legenda="Maior sequência" />
      </div>
      <Calendario porDia={resumo.porDia} />
    </Cartao>
  );
}
