import { useState } from "react";
import { Botao, CampoTexto } from "@/components/ui";

export function FormAdicionar({ aoAdicionar }: { aoAdicionar(termo: string): Promise<{ ok: boolean; erro?: string }> }) {
  const [termo, setTermo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function enviar() {
    if (salvando) return;
    setSalvando(true);
    const r = await aoAdicionar(termo);
    setSalvando(false);
    if (r.ok) {
      setTermo("");
      setErro(null);
    } else setErro(r.erro ?? "Não foi possível adicionar.");
  }

  return (
    <div>
      <div className="flex gap-2">
        <CampoTexto
          value={termo}
          maxLength={80}
          placeholder="Ex.: Lovable, Supabase, Manske"
          aria-label="Nova palavra"
          aria-invalid={erro !== null}
          onChange={(e) => {
            setTermo(e.target.value);
            setErro(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && void enviar()}
        />
        <Botao variante="primario" onClick={() => void enviar()} disabled={salvando || !termo.trim()}>
          Adicionar
        </Botao>
      </div>
      {erro && <p className="mt-2 text-sm text-perigo" role="alert">{erro}</p>}
    </div>
  );
}
