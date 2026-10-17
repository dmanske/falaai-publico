import { useEffect, useState } from "react";
import { Cartao, CampoTexto, TituloPagina, Vazio } from "@/components/ui";
import { BarraSelecao } from "../components/BarraSelecao";
import { FormAdicionar } from "../components/FormAdicionar";
import { ImportarLista } from "../components/ImportarLista";
import { LinhaPalavra } from "../components/LinhaPalavra";
import { useAcoesDicionario } from "../hooks/useAcoesDicionario";
import { useDicionario } from "../hooks/useDicionario";

export function DicionarioPage() {
  const { palavras, busca, setBusca, carregando } = useDicionario();
  const acoes = useAcoesDicionario();
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());

  // Some da seleção o que deixou de existir (apagado, filtrado pela busca…).
  useEffect(() => {
    setMarcadas((atual) => {
      const ids = new Set(palavras.map((p) => p.id));
      const nova = new Set([...atual].filter((id) => ids.has(id)));
      return nova.size === atual.size ? atual : nova;
    });
  }, [palavras]);

  const alternar = (id: string, marcar: boolean) =>
    setMarcadas((atual) => {
      const nova = new Set(atual);
      if (marcar) nova.add(id);
      else nova.delete(id);
      return nova;
    });

  const semNada = !carregando && palavras.length === 0 && busca.trim() === "";

  return (
    <div className="mx-auto max-w-3xl">
      <TituloPagina subtitulo="Nomes e termos que o FalaAi deve escrever sempre assim.">Dicionário</TituloPagina>

      <div className="mb-6 flex flex-col gap-3">
        <FormAdicionar
          aoAdicionar={async (termo) => {
            const r = await acoes.adicionar(termo);
            return r.ok ? { ok: true } : { ok: false, erro: r.erro };
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <CampoTexto
            value={busca}
            placeholder="Buscar palavra"
            aria-label="Buscar palavra"
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-xs"
          />
          <ImportarLista
            aoImportar={async (conteudo) => {
              const r = await acoes.importar(conteudo);
              if (!r.ok) return { ok: false, erro: r.erro };
              const { adicionadas, ignoradas } = r.valor;
              return {
                ok: true,
                resumo: `${adicionadas} ${adicionadas === 1 ? "adicionada" : "adicionadas"}, ${ignoradas} ${ignoradas === 1 ? "ignorada" : "ignoradas"}`,
              };
            }}
          />
        </div>
      </div>

      {semNada ? (
        <Cartao>
          <Vazio
            titulo="Seu dicionário está vazio"
            descricao='Cadastre nomes e termos como "Lovable" ou "Supabase" e o FalaAi passa a escrevê-los certo. Quando você corrige uma palavra depois de ditar, ela também entra aqui sozinha.'
          />
        </Cartao>
      ) : (
        <Cartao className="p-0">
          <BarraSelecao
            total={marcadas.size}
            todasMarcadas={palavras.length > 0 && marcadas.size === palavras.length}
            aoMarcarTodas={(marcar) => setMarcadas(marcar ? new Set(palavras.map((p) => p.id)) : new Set())}
            aoApagar={() => void acoes.apagar([...marcadas])}
          />
          {palavras.length === 0 ? (
            <Vazio titulo="Nenhuma palavra encontrada" descricao="Tente outra busca." />
          ) : (
            <ul className="divide-y divide-borda">
              {palavras.map((p) => (
                <LinhaPalavra
                  key={p.id}
                  palavra={p}
                  selecionada={marcadas.has(p.id)}
                  aoSelecionar={(m) => alternar(p.id, m)}
                  aoEditar={async (id, termo) => {
                    const r = await acoes.editar(id, termo);
                    return r.ok ? { ok: true } : { ok: false, erro: r.erro };
                  }}
                  aoApagar={(id) => void acoes.apagar([id])}
                />
              ))}
            </ul>
          )}
        </Cartao>
      )}
    </div>
  );
}
