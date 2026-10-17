# Correção: chave da Lovable colada com sujeira (17/10/2026)

**Sintoma:** o Daniel colou a chave da Lovable na tela de Configurações e o "Testar chave" deu erro.

**Evidência:** a chave salva, cifrada, tinha 323 bytes, o que dá entre 304 e 319 caracteres de texto
original (323 − 3 do prefixo `v10` − 1 a 16 de preenchimento AES). É o mesmo caso do almoxarifado em
09/10/2026: chave suja com 316 caracteres, limpa com 267. Lá a Lovable respondia
401 "Invalid API key. The key could not be decrypted".

**Causa:** a chave foi colada com a linha de baixo do `.env` junto (`…=="` + quebra +
`LOVABLE_AI_MODEL="…"`), e o app só fazia `trim()`.

**Correção:**
- `src/main/features/chaves/lib/limparChave.ts`: cópia deliberada do `limparChave` do almoxarifado
  (1ª linha não comentada, sem `export NOME=`, sem aspas, até o 1º espaço).
- Aplicada ao **salvar** e ao **ler** (`features/chaves/index.ts`). Com isso a chave já salva voltou a
  funcionar sem colar de novo.
- `features/ia/api/lovable.ts`: a mensagem de erro agora traz o detalhe devolvido pela Lovable.
- Testes: `limparChave.test.ts` (`npm test`, 5 de 5 passando).

**Verificação:** com a chave do Daniel, sem colar de novo, o texto respondeu "ok" em 1,2 s. O áudio
transcreveu a amostra como "Teste de ditado: um, dois, três." em 2,2 s, no formato `input_audio`.
O Daniel confirmou na tela: "feito e deu certo".

**Regra global:** adicionada em `~/.claude/CLAUDE.md`, `~/.kiro/steering/padrao-projetos.md` e na
cópia `netogofans/docs/operacao/REGRAS_GLOBAIS_IA.md`.

**Como reverter:** em `features/chaves/index.ts`, trocar `limparChave(...)` por `.trim()` (não recomendado).
