// Janela principal: menu lateral + página atual (Início, Histórico, Dicionário, Configurações).
import { ConfiguracoesPage } from "@/features/configuracoes";
import { DicionarioPage } from "@/features/dicionario";
import { HistoricoPage } from "@/features/historico";
import { InicioPage } from "@/features/inicio";
import { MenuLateral } from "../components/MenuLateral";
import { useFundo } from "../hooks/useFundo";
import { useNavegacao } from "../hooks/useNavegacao";
import { useTema } from "../hooks/useTema";

const arrastar = { WebkitAppRegion: "drag" } as React.CSSProperties;

export function HubApp() {
  useTema();
  const fundo = useFundo();
  const { destino, ir } = useNavegacao();

  return (
    <div className="flex h-screen bg-fundo text-texto">
      <MenuLateral pagina={destino.pagina} secao={destino.secao} onIr={ir} />
      <main className="relative min-w-0 flex-1">
        {/* Faixa do topo arrastável (mover a janela). */}
        <div style={arrastar} className="absolute inset-x-0 top-0 z-10 h-8" />
        <div className={`fundo-pontilhado ${fundo === "completo" ? "fundo-ondas-completo" : "fundo-ondas-topo"} h-full overflow-y-auto`}>
          {/* z-[1]: o conteúdo fica sempre acima das ondas (inclusive a faixa presa no pé). */}
          <div className="relative z-[1] mx-auto min-h-full max-w-5xl px-10 pb-12 pt-12">
            {destino.pagina === "inicio" && <InicioPage />}
            {destino.pagina === "historico" && <HistoricoPage />}
            {destino.pagina === "dicionario" && <DicionarioPage />}
            {destino.pagina === "configuracoes" && <ConfiguracoesPage secaoInicial={destino.secao} />}
          </div>
          {fundo === "completo" && <div className="ondas-pe" aria-hidden />}
        </div>
      </main>
    </div>
  );
}
