import { ORDEM_TRANSCRICOES, PROVEDORES, TRANSCRICOES, type IdProvedor, type IdTranscricao } from "@shared/provedores";
import { useChave } from "../hooks/useChave";
import { CampoChave } from "./CampoChave";
import { SeletorModelo } from "./SeletorModelo";
import { Seletor } from "./Seletor";

interface Props {
  provedor: IdProvedor;
  servico: IdTranscricao | null;
  modeloServico: string | null;
  onServico(id: IdTranscricao): void;
  onModeloServico(id: string): void;
  /** A chave do serviço mudou (salva/apagada): o resultado do teste deixa de valer. */
  onChaveMudou?(): void;
  /** Esconde a escolha do modelo do serviço (onboarding). */
  compacto?: boolean;
}

/** Só aparece quando o modelo escolhido não ouve áudio: o serviço que transcreve a fala antes. */
export function BlocoTranscricao({ provedor, servico, modeloServico, onServico, onModeloServico, onChaveMudou, compacto }: Props) {
  const info = servico ? TRANSCRICOES[servico] : null;
  const mesmaChave = info?.chave === provedor;
  const chave = useChave(info && !mesmaChave ? info.chave : null);

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-sm font-medium">Transcrição</span>
        <p className="mt-0.5 text-xs text-suave">Este modelo não ouve áudio: um serviço transcreve a sua fala antes.</p>
      </div>

      <Seletor
        className="w-full"
        value={servico ?? ""}
        onChange={(e) => onServico(e.target.value as IdTranscricao)}
        aria-label="Serviço de transcrição"
      >
        {!servico && (
          <option value="" disabled>
            Escolha um serviço…
          </option>
        )}
        {ORDEM_TRANSCRICOES.map((id) => (
          <option key={id} value={id}>
            {TRANSCRICOES[id].nome}
          </option>
        ))}
      </Seletor>

      {info && !compacto && modeloServico && (
        <SeletorModelo
          key={info.id}
          rotulo="Modelo da transcrição"
          modelos={info.modelos}
          modelo={modeloServico}
          onMudar={onModeloServico}
          placeholderOutro="id do modelo de transcrição"
        />
      )}

      {info &&
        (mesmaChave ? (
          <p className="text-xs text-suave">Usa a mesma chave da {PROVEDORES[provedor].nome}.</p>
        ) : (
          <CampoChave
            key={info.chave}
            nome={info.nome}
            status={chave.status}
            erro={chave.erro}
            link={info.linkChave}
            aviso={info.aviso}
            onSalvar={async (v) => {
              const ok = await chave.salvar(v);
              if (ok) onChaveMudou?.();
              return ok;
            }}
            onApagar={async () => {
              await chave.apagar();
              onChaveMudou?.();
            }}
          />
        ))}
      {info && mesmaChave && info.aviso && <p className="rounded-lg bg-painel px-3 py-2 text-xs text-medio">{info.aviso}</p>}
      {!info && <p className="text-xs text-suave">Sem serviço escolhido, o ditado por voz não funciona com este modelo. Dá para configurar depois.</p>}
    </div>
  );
}
