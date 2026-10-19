# Uso: python3 -I dec.py <saida-do-rea-decompile.json>
# Imprime só o pseudocódigo
import json, sys
d = json.load(open(sys.argv[1]))
r = d.get('normalized_result')
print(r if isinstance(r, str) else json.dumps(r, indent=1, ensure_ascii=False))
