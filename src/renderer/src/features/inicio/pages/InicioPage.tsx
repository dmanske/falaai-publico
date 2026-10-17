import { rotuloTecla } from "@shared/atalhos";
import { Cartao, TituloPagina, Vazio } from "@/components/ui";
import { AppsMaisUsados } from "../components/AppsMaisUsados";
import { Atividade } from "../components/Atividade";
import { PainelAtalhos } from "../components/PainelAtalhos";
import { Percepcoes } from "../components/Percepcoes";
import { plataforma } from "../api/ponte";
import { useAtalhos } from "../hooks/useAtalhos";
import { useResumo } from "../hooks/useResumo";

export function InicioPage() {
  const { resumo, erro } = useResumo();
  const atalhos = useAtalhos();
  const teclaDitado = atalhos ? atalhos.ditado.map((t) => rotuloTecla(t, plataforma)).join(" + ") : "o atalho";

  return (
    <div>
      <TituloPagina>Fale, não digite</TituloPagina>
      {/* Atalhos ao lado dos cartões já no tamanho em que o hub abre (1080 px); só descem em janela estreita. */}
      <div className="grid grid-cols-1 gap-7 min-[960px]:grid-cols-[minmax(0,1fr)_252px]">
        <section className="min-w-0 space-y-4">
          {erro && <p className="text-sm text-perigo">{erro}</p>}
          {resumo && resumo.ditados === 0 ? (
            <Cartao>
              <Vazio titulo={`Segure ${teclaDitado} e fale para começar`} descricao="Seus números e sua sequência de dias aparecem aqui depois do primeiro ditado." />
            </Cartao>
          ) : (
            resumo && (
              <>
                <Percepcoes resumo={resumo} />
                <Atividade resumo={resumo} />
              </>
            )
          )}
        </section>
        <aside className="min-w-0 space-y-4">
          <PainelAtalhos atalhos={atalhos} />
          {resumo && <AppsMaisUsados apps={resumo.porApp} />}
        </aside>
      </div>
    </div>
  );
}
