# Atualização automática no Mac (20/10/2026)

**Estado:** pendente. Ideia organizada para uma próxima versão; o Daniel pediu para **não implementar agora**
(20/10/2026). Decisões em aberto no fim.

## Como é hoje

- O botão **Verificar atualizações** (Configurações › Sobre; também no menu da barra) consulta
  `api.github.com/repos/dmanske/falaai-publico/releases/latest` (`src/main/features/sistema/api/github.ts`, versão
  comparada por `sistema/lib/versao.ts`). Se houver versão nova, mostra "Versão X disponível. **Baixar**", e o
  Baixar só abre a página da Release no navegador.
- O resto é manual: baixar o zip do tipo do Mac, descompactar, sair do FalaAi, arrastar para Aplicativos
  (Substituir) e abrir; na primeira abertura, "Abrir Mesmo Assim" em Privacidade e Segurança.

## Como o Typeless 2.8.2 faz (análise só estática, 20/10/2026)

| O quê | Evidência |
|---|---|
| Biblioteca pronta: `electron-updater` com Squirrel.Mac | `Contents/Resources/app-update.yml` (`provider: generic`, `url: https://typeless-static.com/desktop-release/`, `channel: arm64`); `Contents/Frameworks/Squirrel.framework`; `autoDownload`, `quitAndInstall`, `checkForUpdates` em `dist/main/index.js` |
| Assinado e reconhecido pela Apple | `codesign -dv`: `TeamIdentifier=947QKAND4W`; `spctl`: `Developer ID Application: Simply LLC` |
| Baixa sozinho e avisa | textos `tray_menu__update_status__downloading` "Downloading update...", `tray_menu__update_status__ready` "Update ready, restart now?", `floating_bar__alert__update_available__title` (aviso na pílula com **Restart**) |
| Erros tratados | `…error__read_only_directory…` (app fora de Aplicativos/Downloads: "mova para a pasta Aplicativos"), `…error__code_signing…` (assinatura não confere: "baixe do site"), `…error__network`, `…error__development_mode` |
| Depois de atualizar, confere permissões | `update__permission_notify__accessibility__title` "Accessibility permission required", idem microfone |

## O que a pessoa veria no FalaAi

1. Ao abrir e a cada 6 h, o FalaAi consulta o GitHub (a mesma consulta do botão de hoje).
2. Achou versão nova: **baixa sozinho, em segundo plano**, o zip do tipo do Mac (chip Apple ou Intel).
3. **Confere a assinatura:** só aceita o app baixado se for do mesmo certificado "FalaAi Local" do app em uso. Protege
   contra arquivo trocado e garante que a Acessibilidade continua valendo.
4. **Avisa** quando está pronto: menu da barra "Atualização pronta · Reiniciar", pílula (só com o ditado ocioso, como o
   aviso da Novidades) e Configurações › Sobre.
5. **Reiniciar:** fecha, troca o app em Aplicativos (guardando o antigo até a troca dar certo) e abre de novo, já com o
   aviso da Novidades. Se a pessoa não clicar, troca na próxima vez que sair do FalaAi. Nunca no meio de um ditado.
6. Depois de abrir a versão nova, se a Acessibilidade ou o microfone estiverem desligados, avisa (como o Typeless).

## Dois jeitos de construir

| | A) Biblioteca pronta (`electron-updater`, igual ao Typeless) | B) Feito por nós (**recomendado**) |
|---|---|---|
| Como | Squirrel.Mac baixa, confere e troca | O FalaAi baixa o zip, confere a assinatura e troca o app com um script curto |
| Release | Muda: `latest-mac.yml`, alvo `zip` no `electron-builder.yml`, nomes dos zips no padrão da biblioteca | **Igual à de hoje** (`FalaAi-X.Y.Z-mac-chip-apple.zip` / `-mac-intel.zip`) |
| Assinatura | Feita para apps com Developer ID da Apple; com o certificado local deve funcionar (o Squirrel compara com a identidade do app em uso), mas só testando para saber | Nós comparamos o certificado, sem depender da Apple |
| Dependências | `electron-updater` e as dela | Nenhuma nova |
| Cuidado | Menos código nosso | Mais código nosso: app fora de Aplicativos, falha no meio da troca |

Motivo da recomendação: o FalaAi não tem a assinatura da Apple, e com o B a Release continua como está.

## Desenho (caminho B)

Módulo novo `src/main/features/atualizacao/` (a consulta de hoje sai de `sistema/` e vem para cá):

| Arquivo | Faz |
|---|---|
| `api/github.ts` | Última Release (já existe) + a URL do zip certo entre os arquivos (`assets`) dela |
| `lib/escolherArquivo.ts` | `process.arch` → `mac-chip-apple` (arm64) ou `mac-intel` (x64); com teste |
| `api/baixar.ts` | Baixa o zip para `<userData>/atualizacao/` e descompacta com `ditto -x -k` |
| `lib/conferirAssinatura.ts` | `codesign --verify --deep --strict` no app baixado e exige o mesmo requisito designado do app em uso (`codesign -dr -` dos dois: `certificate leaf = H"5f763d8b…"`); versão do `Info.plist` maior que a atual |
| `lib/scriptTroca.ts` | Script que espera o FalaAi fechar, move o app atual para `FalaAi-antigo.app`, copia o novo para `/Applications` com `ditto`, volta o antigo se algo falhar, abre com `env -u ELECTRON_RUN_AS_NODE open` e apaga o antigo depois que o novo abriu |
| `index.ts` / `ipc.ts` | Agenda (ao abrir + intervalo), estado (procurando, baixando, pronta, erro), "reiniciar agora" e troca ao sair |

Telas: Configurações › Sobre mostra o estado e o botão **Reiniciar e atualizar**; o menu da barra ganha o item
"Atualização pronta · Reiniciar"; a pílula usa `mostrarAvisoNaPilula` (o mesmo do aviso da Novidades).
Valores em `src/shared/config.ts`: `INTERVALO_VERIFICAR_ATUALIZACAO_MS` (6 h) e `PRAZO_BAIXAR_ATUALIZACAO_MS`.
Preferência nova: `atualizarSozinho` (Configurações › Geral).

Casos que precisam de resposta:
- **App fora de Aplicativos** (Downloads, pasta só de leitura, app "transladado" pelo macOS): não troca; mostra o
  "Baixar" de hoje com o aviso para mover o app para Aplicativos.
- **Assinatura diferente ou zip estragado:** descarta o arquivo e mantém o "Baixar" manual.
- **Sem internet:** tenta de novo no próximo intervalo, sem aviso.
- **Quarentena:** o arquivo baixado pelo próprio app (não pelo navegador) não deveria ganhar a marca de quarentena, então
  não haveria o "Abrir Mesmo Assim". **Conferir no teste.**

## Como testar quando for construir

1. Instalar à mão a versão com a atualização automática (ex.: 1.2.0). **A primeira vez em cada Mac é sempre manual.**
2. Publicar outra versão (ex.: 1.2.1) e ver: baixa sozinho, avisa, troca, abre, Acessibilidade e microfone continuam.
3. Repetir sem internet, com o app em Downloads e com um zip de assinatura diferente (num repositório de teste, para
   não mexer na Release pública).

## Windows

Fica para depois: continua o botão "Baixar". O instalador do Windows nem foi usado num PC de verdade ainda.

## Programar e publicar a partir do outro computador

- **Programar, testar e rodar** (`git clone`, `npm ci`, `npm test`, `npm run dev`, commit e push): funciona em qualquer
  Mac com o repositório. Nada disso depende deste Mac.
- **Empacotar uma versão para instalar ou publicar** precisa do certificado "FalaAi Local", que hoje só existe neste Mac
  (chaveiro `~/Library/Keychains/falaai-assinatura.keychain-db` e senha em `~/.config/falaai/assinatura-senha`,
  [../operacao/ASSINATURA_MAC.md](../operacao/ASSINATURA_MAC.md)). Empacotado sem ele, o app sai com assinatura
  ad-hoc: cada instalação perde a Acessibilidade e, com a atualização automática, os outros Macs recusariam a versão.
- Duas saídas:
  1. **Empacotar e publicar sempre neste Mac** (o mais simples; programar pode ser em qualquer um).
  2. **Levar o certificado para o outro Mac:** copiar os dois arquivos acima, para os mesmos caminhos, por um meio
     seguro (AirDrop ou pendrive; nunca pelo git, e-mail ou nuvem). Conferir no primeiro `npm run empacotar:mac` que
     aparece `assinado com "FalaAi Local" (5F763D8B…)`. **Não rodar `criar-assinatura-mac.sh` no outro Mac**: ele
     criaria um certificado novo (outra identidade) e todos os Macs perderiam a Acessibilidade na próxima versão.
- Se o outro computador for um PC Windows: dá para programar e testar, mas o app do Mac só pode ser empacotado num Mac.

## Decisões em aberto

| Pergunta | Sugestão |
|---|---|
| Caminho A ou B? | B |
| Baixar sozinho ligado por padrão, com opção para desligar? | Sim |
| Windows agora ou depois? | Depois |
| Empacotar só neste Mac ou levar o certificado para o outro? | O Daniel decide quando for programar no outro computador |

## Etapas

| Etapa | Estado |
|---|---|
| Ideia, comparação com o Typeless e desenho | feito em 20/10/2026 |
| Decisões em aberto | a fazer |
| Construir (módulo `atualizacao/`, telas, testes) | a fazer |
| Testar com duas versões publicadas | a fazer |
