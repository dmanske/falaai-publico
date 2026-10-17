import type { Tema } from "@shared/ipc";
import { Interruptor, LinhaConfig } from "@/components/ui";
import { plataforma } from "../../api/ponte";
import type { PropsSecaoPreferencias } from "../../types";
import { CartaoSecao } from "../CartaoSecao";
import { Seletor } from "../Seletor";
import { SeletorFundo } from "../SeletorFundo";

export function SecaoGeral({ preferencias, salvar }: PropsSecaoPreferencias) {
  const mac = plataforma === "darwin";
  return (
    <CartaoSecao titulo="Geral">
      <Interruptor
        rotulo="Abrir com o sistema"
        descricao="Inicia o FalaAi quando você entra no computador (só no app instalado)."
        ligado={preferencias.abrirComSistema}
        aoMudar={(v) => void salvar({ abrirComSistema: v })}
      />
      <Interruptor
        rotulo={mac ? "Mostrar ícone no Dock" : "Mostrar na barra de tarefas"}
        descricao="Desligado, o FalaAi fica só na barra de menus / bandeja."
        ligado={preferencias.mostrarNoDock}
        aoMudar={(v) => void salvar({ mostrarNoDock: v })}
      />
      <LinhaConfig rotulo="Tema" descricao="Sistema segue o modo claro/escuro do computador.">
        <Seletor value={preferencias.tema} onChange={(e) => void salvar({ tema: e.target.value as Tema })}>
          <option value="sistema">Sistema</option>
          <option value="claro">Claro</option>
          <option value="escuro">Escuro</option>
        </Seletor>
      </LinhaConfig>
      <div className="py-3">
        <div className="text-sm font-medium">Fundo</div>
        <p className="mt-0.5 text-xs text-suave">As ondas aparecem atrás do conteúdo da janela principal.</p>
        <div className="mt-3">
          <SeletorFundo valor={preferencias.fundo} aoMudar={(v) => void salvar({ fundo: v })} />
        </div>
      </div>
    </CartaoSecao>
  );
}
