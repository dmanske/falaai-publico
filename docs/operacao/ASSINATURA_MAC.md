# Assinatura do FalaAi no Mac (certificado local)

## Problema

Com a assinatura ad-hoc (`identity: "-"`), cada build tem uma identidade nova. O macOS liga a permissão de
Acessibilidade a essa identidade, então **toda reinstalação desligava o Fn** (17/10/2026: o registro do
sistema mostrava `kTCCServicePostEvent | com.manske.falaai | 0`).

## Solução

O app é assinado sempre com o mesmo certificado autoassinado, **"FalaAi Local"**. A identidade que o
macOS guarda passa a ser fixa:

```
designated => identifier "com.manske.falaai" and certificate leaf = H"5f763d8b…"
```

Depois de ligar a Acessibilidade uma vez para um build assinado assim, as próximas versões mantêm a permissão.

## Como funciona

- `scripts/criar-assinatura-mac.sh` (uma vez por Mac): cria o certificado num chaveiro só do FalaAi
  (`~/Library/Keychains/falaai-assinatura.keychain-db`). A senha desse chaveiro é aleatória e fica em
  `~/.config/falaai/assinatura-senha` (fora do git). Não mexe no chaveiro de login.
- `scripts/assinar-mac.cjs` (passo `afterSign` do electron-builder): destrava o chaveiro, assina o
  auxiliar (`Resources/bin/falaai-auxiliar-mac`) e o app inteiro (`--deep`) e verifica.
  Sem o certificado, mantém a assinatura ad-hoc e só avisa.

## Se trocar de Mac ou apagar o chaveiro

Rodar `bash scripts/criar-assinatura-mac.sh`, empacotar (`npm run empacotar:mac`) e ligar a Acessibilidade de
novo uma vez (certificado novo = identidade nova).

## Usar em dois Macs

Para empacotar em outro Mac **com a mesma identidade**, copie o chaveiro e o arquivo da senha para os mesmos caminhos
(meio seguro; nunca pelo git) em vez de rodar `criar-assinatura-mac.sh` de novo. Detalhes em
[../planos/ATUALIZACAO_AUTOMATICA_2026-10-20.md](../planos/ATUALIZACAO_AUTOMATICA_2026-10-20.md), seção "Programar e
publicar a partir do outro computador".

## Limite

Não é um certificado da Apple: o app não é notarizado e outro Mac ainda vê o aviso do Gatekeeper na
primeira abertura. Serve para o uso local do Daniel.
