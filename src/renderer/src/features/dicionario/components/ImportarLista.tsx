import { useRef, useState } from "react";
import { Botao } from "@/components/ui";

interface Props {
  aoImportar(conteudo: string): Promise<{ ok: boolean; erro?: string; resumo?: string }>;
}

/** Botão "Importar lista": lê o arquivo .csv/.txt no navegador e manda o texto para o processo principal. */
export function ImportarLista({ aoImportar }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  function lerArquivo(arquivo: File) {
    const leitor = new FileReader();
    leitor.onerror = () => setMensagem({ texto: "Não consegui ler o arquivo.", erro: true });
    leitor.onload = async () => {
      const r = await aoImportar(String(leitor.result ?? ""));
      setMensagem(r.ok ? { texto: r.resumo ?? "", erro: false } : { texto: r.erro ?? "Falha ao importar.", erro: true });
    };
    leitor.readAsText(arquivo);
  }

  return (
    <div className="flex items-center gap-3">
      {mensagem && (
        <span className={`text-sm ${mensagem.erro ? "text-perigo" : "text-suave"}`} role="status">
          {mensagem.texto}
        </span>
      )}
      <input
        ref={entrada}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) lerArquivo(arquivo);
          e.target.value = ""; // permite escolher o mesmo arquivo de novo
        }}
      />
      <Botao onClick={() => entrada.current?.click()}>Importar lista</Botao>
    </div>
  );
}
