import { TituloPagina } from "@/components/ui";
import { NOVIDADES } from "@shared/novidades";
import { CartaoVersao } from "../components/CartaoVersao";
import { useVersaoInstalada } from "../hooks/useVersaoInstalada";

export function NovidadesPage() {
  const instalada = useVersaoInstalada();
  return (
    <div>
      <TituloPagina subtitulo="O que mudou em cada versão do FalaAi.">Novidades</TituloPagina>
      <div className="space-y-4">
        {NOVIDADES.map((n) => (
          <CartaoVersao key={n.versao} novidade={n} instalada={n.versao === instalada} />
        ))}
      </div>
    </div>
  );
}
