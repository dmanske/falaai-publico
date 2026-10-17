// Pequena lista de palavras comuns (português e inglês), já sem acento e em minúsculas.
// Serve só para decidir se uma palavra corrigida "tem cara de termo próprio". Não precisa ser completa.
const TEXTO = `
que nao uma para com por mais como mas foi ele ela seu sua ser tem ter nos das dos esta esse essa isso isto este
aqui ali la lá muito pouco tudo todo toda todos todas cada outro outra outros outras mesmo mesma ainda ja depois antes
quando onde porque porquê quem qual quais sobre entre ate desde sem sob apos contra durante perante
eu voce voces nos eles elas meu minha meus minhas teu tua nosso nossa dele dela deles delas
sim bem mal melhor pior maior menor novo nova velho velha bom boa grande pequeno pequena primeiro segundo terceiro ultimo
fazer faz fez feito fazendo dizer diz disse falar fala falou falando ver vi viu vendo vir vem veio ir vai foi indo
dar da deu dado dando ficar fica ficou ficando poder pode podem posso podia querer quer quero queria saber sabe sei sabia
pegar pega pegou usar usa usou usando achar acho achou colocar coloca colocou chamar chama chamou mandar manda mandou
olhar olha olhou deixar deixa deixou levar leva levou trazer traz trouxe passar passa passou começar comeca comecou
terminar termina acabar acaba acabou abrir abre abriu fechar fecha fechou rodar roda rodou rodando testar testa testou
criar cria criou salvar salva salvou enviar envia enviou receber recebe recebeu escrever escreve escreveu ler le leu
casa carro dia noite tarde manha hoje ontem amanha semana mes ano anos dias horas hora minuto minutos tempo vez vezes
coisa coisas pessoa pessoas gente homem mulher menino menina amigo amiga cliente clientes trabalho projeto projetos
empresa nome nomes numero numeros texto textos palavra palavras frase frases arquivo arquivos pasta pastas tela telas
sistema sistemas conta contas senha email mensagem mensagens problema problemas erro erros ideia ideias forma jeito
parte partes lado lados ponto pontos lista listas item itens tipo tipos caso casos exemplo exemplos motivo razao
agora entao assim talvez sempre nunca tambem apenas somente quase bastante demais menos tanto tanta tantos
the and for are but not you all any can had her was one our out day get has him his how man new now old see two way who boy did
its let put say she too use that with have this will your from they know want been good much some time very when come here just
like long make many more only over such take than them well were what where which while would about after again also back
because before being between both could does done down each even every first found give going great into last made most
must never next other over right same should still then there these thing think those three through under until
using want work world year years yes text word words file files app page home name list item items user users data
`;

export const PALAVRAS_COMUNS: ReadonlySet<string> = new Set(
  TEXTO.split(/\s+/)
    .filter(Boolean)
    .map((p) => p.normalize("NFD").replace(/\p{M}/gu, "")),
);
