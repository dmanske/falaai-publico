# Documentação do FalaAi: índice

Versão 1.1.0 (18/10/2026; o que mudou em cada versão: página Novidades do app, `src/shared/novidades.ts`). Repositório privado `dmanske/falaai-oficial`; cópia pública `dmanske/falaai-publico`.

## Geral

| Documento | Para quê |
|---|---|
| [ARQUITETURA.md](ARQUITETURA.md) | Processos do Electron, pastas, regras de código, dados locais e Git |
| [produto/PRD.md](produto/PRD.md) | O que o app faz, o estado de cada funcionalidade, fora do escopo e pendências |

## Design

| Documento | Para quê |
|---|---|
| [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md) | Design system real do app: marca, fonte, cores, componentes, pílula, tema do clube e acessibilidade |
| [design/DESIGN_VISUAL.md](design/DESIGN_VISUAL.md) | Ponteiro para o design system, com a origem do visual (referência do Typeless) |
| [design/DESIGN_FALAAI.md](design/DESIGN_FALAAI.md) | Histórico: engenharia reversa do Typeless, decisões técnicas iniciais e fases |
| [design/PROTOCOLO_AUXILIAR.md](design/PROTOCOLO_AUXILIAR.md) | Protocolo v4 dos auxiliares nativos (Mac em Swift na v4; Windows em Rust ainda na v3) |

## Como funciona (módulos)

| Documento | Para quê |
|---|---|
| [modulos/ditado.md](modulos/ditado.md) | Ditado: atalhos, pílula, gravação, IA, colar e iniciar só na barra de menus |
| [modulos/configuracoes-ia.md](modulos/configuracoes-ia.md) | Provedores de IA, chaves, modelos, serviços de transcrição e teste da chave |
| [modulos/formatacao-ditado.md](modulos/formatacao-ditado.md) | Pausas, fala rápida, listas e tópicos: ritmo medido no Mac e regras do prompt |
| [modulos/envio-automatico.md](modulos/envio-automatico.md) | Enter automático depois do ditado, por voz ou por app |
| [modulos/estatisticas.md](modulos/estatisticas.md) | Números do Início permanentes: tabela de totais por dia e app, que apagar histórico não zera |
| [modulos/pilula-estilos.md](modulos/pilula-estilos.md) | Estilos da pílula, clubes de futebol e tema do app com as cores do clube |
| [modulos/novidades.md](modulos/novidades.md) | Página Novidades: o que mudou em cada versão, aviso depois de atualizar e o que fazer ao lançar uma versão |

## Integrações e operação

| Documento | Para quê |
|---|---|
| [integracoes/PROVEDORES_IA.md](integracoes/PROVEDORES_IA.md) | Pesquisa dos provedores de IA e de transcrição (endpoints, formatos, preços) |
| [operacao/ASSINATURA_MAC.md](operacao/ASSINATURA_MAC.md) | Certificado local para o Mac não esquecer as permissões a cada versão |
| [operacao/ENGENHARIA_REVERSA.md](operacao/ENGENHARIA_REVERSA.md) | Como conferir o Typeless com o REA + Ghidra (bibliotecas nativas e JavaScript), com os scripts de `scripts/engenharia-reversa/` |

## Planos e pendências

| Documento | Para quê |
|---|---|
| [planos/CONFERENCIA_TYPELESS_2026-10-18.md](planos/CONFERENCIA_TYPELESS_2026-10-18.md) | Segunda engenharia reversa do Typeless (Ghidra): o que faltava no FalaAi, decisões e etapas |

## Correções feitas

| Documento | Para quê |
|---|---|
| [correcoes/CORRECAO_CHAVE_LOVABLE_COLADA_2026-10-17.md](correcoes/CORRECAO_CHAVE_LOVABLE_COLADA_2026-10-17.md) | Chave colada com a linha do `.env` junto |
| [correcoes/CORRECAO_IDIOMAS_MISTURADOS_2026-10-17.md](correcoes/CORRECAO_IDIOMAS_MISTURADOS_2026-10-17.md) | Inglês no meio do português; pedido ditado não é executado |

## Arquivo (documentos substituídos, nunca apagados)

| Documento | Para quê |
|---|---|
| [_arquivo/DESIGN_SYSTEM_PROPOSTA_2026-10-17.md](_arquivo/DESIGN_SYSTEM_PROPOSTA_2026-10-17.md) | Proposta de design system (Nunito Sans) que não foi aprovada nem adotada |
| [_arquivo/DESIGN_VISUAL_2026-10-17.md](_arquivo/DESIGN_VISUAL_2026-10-17.md) | Texto completo antigo do DESIGN_VISUAL, antes de virar ponteiro |
