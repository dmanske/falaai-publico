# Uso: python3 -I desembaralhar.py <typeless-asar/dist/main/index.js> <saida.js>
# Desfaz a tabela de textos embaralhada (obfuscator.io) do processo principal do Typeless, SÓ LENDO o arquivo:
# acha a tabela, o deslocamento do decodificador e a conta de verificação, gira a tabela até a conta bater e troca
# cada chamada _0x…(0x…) pelo texto. Nada do Typeless é executado (a conta é refeita aqui, em Python).
# Testado no Typeless 2.8.3 (27/10/2026): 306 giros, alvo 0x94dc4, deslocamento 0x159.
import ast, re, sys

s = open(sys.argv[1], encoding="utf-8").read()

# A verificação: (function(a,b){…const X=<conta>;if(X===b)break;…}(<função da tabela>,<alvo>));
iife = re.search(r"\(function\(_0x\w+,_0x\w+\)\{const (_0x\w+)=(_0x\w+),_0x\w+=_0x\w+\(\);while\(!!\[\]\)\{try\{const _0x\w+=(.+?);if\(", s)
fim = re.search(r"\}\((_0x\w+),(0x[0-9a-f]+)\)\);", s[iife.end():])
alias, decodificador, conta = iife.group(1), iife.group(2), iife.group(3)
tabela_fn, alvo = fim.group(1), int(fim.group(2), 16)

# A tabela: function <tabela_fn>(){const x=[…];…}
inicio = s.find("function %s(){" % tabela_fn)
a = s.find("[", inicio)
b = s.find("];", a)
tabela = ast.literal_eval(s[a:b + 1])

# O deslocamento: function <decodificador>(i,j){i=i-0x159;…}
desloc = int(re.search(r"function %s\(_0x\w+,_0x\w+\)\{_0x\w+=_0x\w+-(0x[0-9a-f]+);" % decodificador, s).group(1), 16)


def parse_int(x):
    # parseInt do JavaScript: lê os dígitos do começo; sem dígitos dá NaN.
    m = re.match(r"\s*[-+]?\d+", x)
    return int(m.group()) if m else float("nan")


# A conta vira Python: parseInt(alias(0x…)) → p(0x…). Só sobram números, operadores e p(…), conferidos antes.
expr = re.sub(r"parseInt\(%s\((0x[0-9a-f]+)\)\)" % re.escape(alias), r"p(\1)", conta)
if not re.fullmatch(r"[0-9a-fx+\-*/() p]+", expr):
    sys.exit("conta com algo inesperado: " + expr[:200])

for giros in range(len(tabela) + 1):
    try:
        if eval(expr, {"__builtins__": {}}, {"p": lambda n: parse_int(tabela[n - desloc])}) == alvo:
            break
    except (IndexError, ZeroDivisionError):
        pass
    tabela.append(tabela.pop(0))
else:
    sys.exit("a conta não bateu em nenhum giro")


def trocar(m):
    n = int(m.group(1), 16)
    return repr(tabela[n - desloc]) if desloc <= n < desloc + len(tabela) else m.group(0)


saida = re.sub(r"\b_0x[0-9a-f]+\((0x[0-9a-f]+)\)", trocar, s)
open(sys.argv[2], "w", encoding="utf-8").write(saida)
print(f"tabela={tabela_fn} ({len(tabela)} textos) giros={giros} alvo={hex(alvo)} deslocamento={hex(desloc)} → {sys.argv[2]}")
