# Uso: python3 -I i18n.py <arquivo.js> <saida.tsv>
# Extrai pares 'chave':'texto' de um pacote de idioma minificado
import re, sys, codecs
src = open(sys.argv[1], encoding='utf-8').read()
pares = re.findall(r"'([a-z0-9_]+__[a-z0-9_]+)':'((?:[^'\\]|\\.)*)'", src)
with open(sys.argv[2], 'w', encoding='utf-8') as out:
    for k, v in pares:
        try:
            v = codecs.decode(v.encode('utf-8'), 'unicode_escape').encode('latin-1').decode('utf-8')
        except Exception:
            pass
        out.write(f"{k}\t{v}\n")
print(len(pares))
