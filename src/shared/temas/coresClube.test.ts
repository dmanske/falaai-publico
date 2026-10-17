import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BRANCO,
  contraste,
  corComContraste,
  corDestaqueDoClube,
  cssDestaqueDoClube,
  escurecimentoNecessario,
  fundoDoPadrao,
  luminancia,
  misturar,
  paletaDestaque,
  textoSobre,
  variaveisDoClube,
} from "./coresClube.ts";
import { CLUBES, larguraExtraEscudo, clubeDoEstilo } from "./clubes.ts";

const flamengo = CLUBES.find((c) => c.id === "flamengo")!;
// Clubes fictícios só para exercitar casos de cor clara (o código tem que servir para qualquer clube).
const alvinegro = { cores: ["#FFFFFF", "#0B0B0B"], padrao: "listras-verticais" as const };
const amarelo = { cores: ["#FFD400", "#00205B"], padrao: "meio-a-meio" as const };

describe("contraste", () => {
  it("preto e branco dão 21; cor igual dá 1", () => {
    assert.equal(Math.round(contraste("#000000", "#ffffff")), 21);
    assert.equal(contraste("#e30613", "#e30613"), 1);
  });
  it("luminância do branco é 1 e a do preto é 0", () => {
    assert.equal(luminancia("#fff"), 1);
    assert.equal(luminancia("#000"), 0);
  });
  it("vermelho do Flamengo passa de 3:1 com o branco", () => {
    assert.ok(contraste("#E30613", BRANCO) >= 3);
  });
});

describe("corComContraste", () => {
  it("troca a principal clara pela segunda", () => {
    assert.equal(corComContraste(["#FFFFFF", "#0B0B0B"], BRANCO, 3), "#0B0B0B");
    assert.equal(corComContraste(["#FFD400", "#00205B"], BRANCO, 3), "#00205B");
  });
  it("mantém a principal quando ela passa", () => {
    assert.equal(corComContraste(["#E30613", "#0B0B0B"], BRANCO, 3), "#E30613");
  });
  it("se nenhuma passa, devolve a de maior contraste", () => {
    assert.equal(corComContraste(["#FFFFFF", "#EEEEEE"], BRANCO, 3), "#EEEEEE");
  });
});

describe("textoSobre", () => {
  it("escolhe o que mais contrasta", () => {
    assert.equal(textoSobre("#E30613"), "#ffffff");
    assert.equal(textoSobre("#FFD400"), "#0b0b0b");
  });
});

describe("escurecimentoNecessario", () => {
  it("vermelho e preto ficam no piso de 0,15", () => {
    assert.equal(escurecimentoNecessario(["#E30613", "#0B0B0B"], 0.15), 0.15);
  });
  it("com branco, escurece o bastante para a onda branca aparecer", () => {
    const a = escurecimentoNecessario(["#FFFFFF", "#0B0B0B"], 0.15);
    assert.ok(a > 0.15 && a <= 0.6);
    assert.ok(contraste(misturar("#FFFFFF", "#000000", a), BRANCO) >= 3);
  });
});

describe("variaveisDoClube", () => {
  it("camisa do Flamengo reproduz o protótipo aprovado", () => {
    const v = variaveisDoClube(flamengo, "camisa");
    assert.equal(v["--pil-fundo"], "repeating-linear-gradient(180deg,#E30613 0 6.33px,#0B0B0B 6.33px 12.66px)");
    assert.equal(
      v["--pil-overlay"],
      "linear-gradient(90deg,rgba(0,0,0,0.55),rgba(0,0,0,0.15) 30%,rgba(0,0,0,0.15) 70%,rgba(0,0,0,0.55))",
    );
    assert.equal(v["--pil-confirmar-bg"], "#ffffff");
    assert.equal(v["--pil-confirmar-fg"], "#E30613");
  });
  it("escura do Flamengo: contorno e ✓ vermelhos, barras vermelha e branca", () => {
    const v = variaveisDoClube(flamengo, "escura");
    assert.equal(v["--pil-fundo"], "#0b0b0b");
    assert.match(v["--pil-sombra"], /^inset 0 0 0 1\.5px #E30613$/);
    assert.equal(v["--pil-confirmar-bg"], "#E30613");
    assert.equal(v["--pil-barra-a"], "#E30613");
    assert.equal(v["--pil-barra-b"], "#ffffff");
  });
  it("faixa do Flamengo: ✓ na segunda cor, sem véu", () => {
    const v = variaveisDoClube(flamengo, "faixa");
    assert.equal(v["--pil-fundo"], "linear-gradient(180deg,#E30613 0 34%,#0B0B0B 34% 66%,#E30613 66%)");
    assert.equal(v["--pil-confirmar-bg"], "#0B0B0B");
    assert.equal(v["--pil-overlay"], "none");
  });
  it("clube de preto e branco: na escura a principal vira o branco", () => {
    const v = variaveisDoClube(alvinegro, "escura");
    assert.equal(v["--pil-barra-a"], "#FFFFFF");
    assert.equal(v["--pil-confirmar-fg"], "#0b0b0b");
  });
  it("clube de amarelo: na camisa o ✓ usa a cor que contrasta, na faixa a principal é a segunda", () => {
    assert.equal(variaveisDoClube(amarelo, "camisa")["--pil-confirmar-fg"], "#00205B");
    assert.match(variaveisDoClube(amarelo, "faixa")["--pil-fundo"], /^linear-gradient\(180deg,#00205B 0 34%,#FFD400/);
  });
  it("clube de uma cor só funciona nas três variantes", () => {
    for (const v of ["camisa", "escura", "faixa"] as const) {
      const r = variaveisDoClube({ cores: ["#00A859"], padrao: "liso" }, v);
      assert.ok(r["--pil-fundo"]);
    }
  });
});

describe("fundoDoPadrao", () => {
  it("liso é a cor pura", () => assert.equal(fundoDoPadrao("liso", "#111", "#222"), "#111"));
  it("meio a meio divide em 50%", () => assert.match(fundoDoPadrao("meio-a-meio", "#111", "#222"), /50%/));
});

describe("destaque do app", () => {
  it("todo clube dá um destaque que sustenta texto branco (4,5:1)", () => {
    for (const cores of [["#E30613", "#0B0B0B"], ["#FFFFFF", "#0B0B0B"], ["#FFD400", "#00205B"], ["#EEEEEE"]]) {
      assert.ok(contraste(corDestaqueDoClube(cores), BRANCO) >= 4.5, cores.join());
    }
  });
  it("no escuro o destaque contrasta com o fundo do app", () => {
    for (const cores of [["#E30613"], ["#00205B"], ["#0B0B0B"]]) {
      const { escuro } = paletaDestaque(corDestaqueDoClube(cores));
      assert.ok(contraste(escuro.destaque, "#242121") >= 3, cores.join());
    }
  });
  it("o CSS tem os 4 tokens no claro e no escuro", () => {
    const css = cssDestaqueDoClube(flamengo.cores);
    assert.equal(css.match(/--color-destaque-3:/g)?.length, 2);
    assert.match(css, /:root\.dark\{/);
  });
});

describe("largura da janela", () => {
  it("clube com escudo acrescenta 26 px; estilo geral e clube desconhecido, nada", () => {
    assert.equal(larguraExtraEscudo({ tipo: "clube", id: "flamengo", variante: "camisa" }), 26);
    assert.equal(larguraExtraEscudo({ tipo: "estilo", id: "neon" }), 0);
    assert.equal(larguraExtraEscudo({ tipo: "clube", id: "inexistente", variante: "camisa" }), 0);
    assert.equal(clubeDoEstilo({ tipo: "estilo", id: "azul" }), undefined);
  });
});
